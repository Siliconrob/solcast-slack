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
  const position = {
    lat: 32, //request.body.lat,    
    lng: -97 //request.body.lng    
  };
  
  console.log(`Power location received: (${position.lat}, ${position.lng})`);  
  const point = solcast.latLng(position.lat, position.lng);
  const options = solcast.Options.power();
  options.APIKey = process.env.SOLCAST_API_KEY;
  options.Capacity = request.body.capacity || 1000;
  
  const results = solcast.Power.forecast(point, options);
  results.then(results => {
    
    var now = Date.now()
    var today = results.forecasts.filter(z => {
      var current = new Date(z.period_end);
      if (current.
    });
    
    response.send(results.forecasts);
  })
  .catch(err => { console.log(err); });  
});

app.post("/locationDetails", function (request, response) {  
  const position = {
    lat: request.query.lat,    
    lng: request.query.lng,
  };
  
  console.log(`Location received: (${position.lat}, ${position.lng})`);  
  const point = solcast.latLng(position.lat, position.lng);
  const options = solcast.Options.radiation();
  options.APIKey = process.env.SOLCAST_API_KEY;
  
  const results = solcast.Radiation.forecast(point, options);
  results.then(results => {    
    response.send(results.forecasts);
  })
  .catch(err => { console.log(err); });
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
