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

function formatPower(powerResults, hoursAhead) {
  let now = new Date;
  let utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + hoursAhead, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  const filtered_results = powerResults.filter(z => {
    let current = new Date(z.period_end);
    if (current < utc_timestamp) {
      return current;
    }
  }).map(k => {
    const timestamp = k.period_end.replace('T',' ').split('.')[0]+" UTC"; 
    return `${timestamp} - Cloud Cover: ${k.cloud_opacity}%, Power: ${k.pv_estimate.toFixed(2)} kW`;
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
  
    Promise.all([powerResults, radiationResults]).then(function(results) {      
      const merged = mergeResults(results[0], results[1]);      
      let filtered_results = formatPower(merged, hoursAhead);
      filtered_results.unshift(`PV System Capacity ${options.Power.Capacity} kW`);
      filtered_results.unshift(`Latitude: ${position.lat.toFixed(6)}, Longitude: ${position.lng.toFixed(6)}`);        
      filtered_results.unshift(`${location.display_name}`);
      const formatted = filtered_results.join('\n');
      response.json({ 
        response_type: 'in_channel', // public to the channel
        text: formatted
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
        uri: 'http://nominatim.openstreetmap.org/search',
        method: 'GET',
        qs: {q: inputText, format: 'json', limit: 1 },
        json: true
      };
      return rp(options).then(function (results) {
          if ((results || []).length > 0) {
            return results.shift();        
          }
          console.log(`No results returned unable to send lat/lng to Solcast API`);
        });
    }).then(function(location) {
      powerForecast(response, location, 6);
  });
});


const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
