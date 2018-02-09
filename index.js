const express = require('express');
const app = express();
const request = require('request');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const solcast = require('solcast');
const Promise = require("bluebird");

app.use(express.static('public'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html');
});

app.get("/privacy", function (request, response) {
  response.sendFile(__dirname + '/privacy.html');
});

app.get("/support", function (request, response) {
  response.sendFile(__dirname + '/support.html');
});

app.get('/slack', function(req, res){
  if (!req.query.code) { // access denied
    res.redirect('https://solcast-slack.glitch.me/');
    return;
  }
  var data = {form: {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: req.query.code
  }};
  request.post('https://slack.com/api/oauth.access', data, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // Get an auth token
      let token = JSON.parse(body).access_token;

      // Get the team domain name to redirect to the team URL after auth
      request.post('https://slack.com/api/team.info', {form: {token: token}}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          if(JSON.parse(body).error == 'missing_scope') {
            res.send('Solcast Power Forecast has been added to your team!');
          } else {
            let team = JSON.parse(body).team.domain;
            res.redirect('http://' +team+ '.slack.com');
          }
        }
      });
    }
  })
});

function formatPower(powerResults, hoursAhead, localeOffsetSeconds) {
  let now = new Date;
  let utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + hoursAhead, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  const filtered_results = powerResults.filter(z => {
    let current = new Date(z.period_end);
    if (current < utc_timestamp) {
      return current;
    }
  }).map(k => {    
    let outText = k.period_end.replace('T',' ').split('.')[0]+" UTC";
    if (localeOffsetSeconds !== null) {
      let timestamp = new Date(k.period_end);
      timestamp.setSeconds(timestamp.getSeconds() + localeOffsetSeconds);
      outText = timestamp.toISOString().replace('T',' ').split('.')[0];      
    }
    return `${outText} - Cloud Opacity: ${k.cloud_opacity.pad(3)}%, Power: ${k.pv_estimate.toFixed(2)} kW`;
  });
  return filtered_results;
};

function mergeResults(powerResults, radResults) {
  const merged = powerResults.forecasts.map((current, index) => {
    const radValue = radResults.forecasts[index];                
    const mergeValue = Object.assign(radValue, current);
    return mergeValue;
  });
  return merged;
};

Number.prototype.pad = function(size) {
  var s = String(this);
  while (s.length < (size || 2)) {s = " " + s;}
  return s;
}

function locationEmoji(location) {
  
  if ((location.lng < -25) && (location.lng > -180)) {
    return ':earth_americas:'
  }
  if (location.lng < 39) {
    return ':earth_africa:'
  }  
  return ':earth_asia:';    
}

function createAttachments(location) {
  
    const lat = location.lat.toFixed(6);
    const lng = location.lng.toFixed(6);
    return [
        {
            fallback: `${lat},${lng}`,
            color: "#000000",
            title: `${lat},${lng} ${locationEmoji(location)}`,
            title_link: `http://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=12`,
            text: "OpenStreetMap link to geocoded location"
        }      
    ]
}

function getTimeOffset(location) {  
    const locationText = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;  
    const ts = Math.round((new Date()).getTime() / 1000);

    let time_params = {
      location: locationText,
      timestamp: ts
    };
  
    if (process.env.GOOGLE_API_KEY !== "") {
      time_params.key = process.env.GOOGLE_API_KEY
    }
  
    const options = {
      uri: 'https://maps.googleapis.com/maps/api/timezone/json',
      method: 'GET',
      qs: time_params,
      json: true
    };
    const getTime = rp(options);
    return getTime;  
}

function localeOffsetSeconds(timeResults) {
  
  timeResults = timeResults || {};
  if (timeResults.status.toUpperCase() !== "OK".toUpperCase()) {
    return null;
  }
  const offsetSeconds = timeResults.dstOffset + timeResults.rawOffset;
  return offsetSeconds;  
}

function powerForecast(response, location, hoursAhead) {
    const position = {
      lat: Number(location.lat),
      lng: Number(location.lon)
    };    

    console.log(`Power location received: (${position.lat}, ${position.lng})`);  
    const point = solcast.latLng(position.lat, position.lng);
  
    const options = {
      Radiation: solcast.Options.radiation(),
      Power: solcast.Options.power()
    };          
    options.Radiation.APIKey = process.env.SOLCAST_API_KEY;
    options.Power.APIKey = process.env.SOLCAST_API_KEY;
    options.Power.Capacity = 1000;
  
    const powerResults = solcast.Power.forecast(point, options.Power);  
    const radiationResults = solcast.Radiation.forecast(point, options.Radiation);
    const timeOffset = getTimeOffset(position);
  
    Promise.all([powerResults, radiationResults, timeOffset]).then(function(results) {      
      const merged = mergeResults(results[0], results[1]);      
      
      const offset = localeOffsetSeconds(results[2]);      
      let filtered_results = formatPower(merged, hoursAhead, offset);
      filtered_results.unshift(`PV System Capacity ${options.Power.Capacity} kW :battery:`);
      filtered_results.unshift(`${location.display_name}`);
      const formatted = filtered_results.join('\n');
      response.json({ 
        response_type: 'in_channel', // public to the channel
        text: formatted,
        attachments: createAttachments(position)
      });
    }).catch(function(err) {
      console.log(err.message); 
      response.json({
          response_type: 'ephemeral', // private to user
          text: ":rotating_light: Something went wrong.  Please contact support if this continues."
      });
    });  
};

app.post("/locationPower", function (request, response) {
  
  const inputText = (request.body.text || "").trim();
  
  if(request.body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
    // the request is NOT coming from Slack!
    response.sendStatus(403); // Forbidden
    return;
  }  
  
  if (inputText.toLowerCase() === "help".toLowerCase()) {
    response.json({
        response_type: 'ephemeral', // private to user
        text: 'Type the *location* you wish to obtain a Solar Power Forecast such as `/forecast Sydney` to obtain a forecast for *Sydney*' 
    });
    return;
  }
  
  return Promise.try(function() {    
      var options = {
        uri: 'https://us1.locationiq.org/v1/search.php',
        method: 'GET',
        qs: {q: inputText, format: 'json', key: process.env.LOCATIONIQ_KEY },
        json: true
      };
      return rp(options).then(function (results) {
          if ((results || []).length > 0) {
            return results.shift();        
          }        
          console.log(`No results returned unable to send lat/lng to Solcast API`);
        });
    }).then(function(location) {
      location = location || {};
      if (location.hasOwnProperty("lat")) {
        powerForecast(response, location, 6);
        return;
      }
      response.json({
          response_type: 'ephemeral', // private to user
          text: ":interrobang: Unable to geocode location *`" + inputText + "`* to a valid Latitude/Longitude."
      });
  }).catch(function(err) {
    console.log(err.message); 
    response.json({
        response_type: 'ephemeral', // private to user
        text: ":rotating_light: Something went wrong.  Please contact support if this continues."
    });    
  });
});


const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
