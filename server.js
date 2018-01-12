const express = require('express');
const app = express();
var bodyParser = require('body-parser');
const solcast = require('solcast');

app.use(express.static('public'));
app.use(bodyParser.urlencoded());

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/locationPower", function (request, response) { 
  
  console.log(request.body);  
  
  const options = {
    url: 'http://nominatim.openstreetmap.org/search',
    method: 'GET',
    headers: headers,
    qs: { q: request.body.text, format: 'json', limit: 1 }
  };
  
  // Start the request
  request(options, function (error, res, body) {
    if (!error && res.statusCode == 200) {
        // Print out the response body
        console.log(body)
    };
  
  const position = {
    lat: 32, //request.body.lat,    
    lng: -97 //request.body.lng    
  };
  
  request.
  
  
  console.log(`Power location received: (${position.lat}, ${position.lng})`);  
  const point = solcast.latLng(position.lat, position.lng);
  const options = solcast.Options.power();
  options.APIKey = process.env.SOLCAST_API_KEY;
  options.Capacity = request.body.capacity || 1000;
  
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
    response.send(filtered_results.join('\n'));
  })
  .catch(err => { console.log(err); });  
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
