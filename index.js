const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rp = require('request-promise');
const solcast = require('solcast');
const Promise = require("bluebird");

app.use(express.static('public'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

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
        let now = new Date;
        let utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 6, now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
        let filtered_results = results.forecasts.filter(z => {
          let current = new Date(z.period_end);
          if (current < utc_timestamp) {
            return current;
          }
        }).map(k => {
          const timestamp = k.period_end.replace('T',' ').split('.')[0]+" UTC";      
          return `${timestamp}: ${k.pv_estimate.toFixed(2)}`;
        });
        filtered_results.unshift(`Latitude: ${position.lat.toFixed(6)}, Longitude: ${position.lng.toFixed(6)}`);        
        filtered_results.unshift(`${location.display_name}`);
        response.send(filtered_results.join('\n'));
      })
      .catch(err => { console.log(err); });    
  });

});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
