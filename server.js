const express = require('express');
const app = express();
const solcast = require('solcast');

app.use(express.static('public'));

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/locationDetails", function (request, response) {  
  const position = {
    lat: request.body.lat,    
    lng: request.body.lng,
  } 
  console.log(`Location received: (${position.lat}, ${position.lng})`);  
  const point = solcast.latLng(position.lat, position.lng);
  const options = solcast.Options.power();
  radiationOptions.APIKey = process.env.SOLCAST_API_KEY;
  
  const results = solcast.Radiation.forecast(point, radiationOptions);
  results.then(results => {    
    response.send(results.forecasts);
  })
  .catch(err => { console.log(err); });  
}

app.post("/locationDetails", function (request, response) {  
  const position = {
    lat: request.query.lat,    
    lng: request.query.lng,
  } 
  console.log(`Location received: (${position.lat}, ${position.lng})`);  
  const point = solcast.latLng(position.lat, position.lng);
  const radiationOptions = solcast.Options.radiation();
  radiationOptions.APIKey = process.env.SOLCAST_API_KEY;
  
  const results = solcast.Radiation.forecast(point, radiationOptions);
  results.then(results => {    
    response.send(results.forecasts);
  })
  .catch(err => { console.log(err); });
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
