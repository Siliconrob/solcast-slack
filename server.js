const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rp = require('request-promise');
const solcast = require('solcast');
const Promise = require("bluebird");

app.use(express.static('public'));
app.use(bodyParser.urlencoded());

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/locationPower", function (request, response) {   
  return Promise.try(function() {    
      var options = {
        uri: 'http://nominatim.openstreetmap.org/search',
        method: 'GET',
        qs: {q: request.body.text, format: 'json', limit: 1 },
        json: true
      };
      return rp(options).then(function (results) {
          return results.shift();        
        });
    }).then(function(location) {    
      const position = {
        lat: Number(location.lat),
        lng: Number(location.lon)
      };    

    console.log(`Power location received: (${position.lat}, ${position.lng})`);  
      const point = solcast.latLng(position.lat, position.lng);
      const options = solcast.Options.power();
      options.APIKey = process.env.SOLCAST_API_KEY;
      options.Capacity = 1000;

      const results = solcast.Power.forecast(point, options);
      results.then(results => {
        var now = new Date;
        var utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 4, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
        var filtered_results = results.forecasts.filter(z => {
        var current = new Date(z.period_end);
        if (current < utc_timestamp) {
        return current;
        }
        }).map(k => {
        const timestamp = k.period_end.replace('T',' ').split('.')[0]+" UTC";      
        return `${timestamp}: ${k.pv_estimate}`;
        });
        
        filtered_results.
        
        response.send(filtered_results.join('\n'));
      })
      .catch(err => { console.log(err); });    
  });

});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
