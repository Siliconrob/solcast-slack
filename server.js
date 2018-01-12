const express = require('express');
const app = express();
var bodyParser = require('body-parser');
const solcast = require('solcast');

app.use(express.static('public'));
app.use(bodyParser.urlencoded());

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/locationPower", function (req, res) {   
  console.log(request.body);    
  const options = {
    url: 'http://nominatim.openstreetmap.org/search',
    method: 'GET',
    qs: { q: req.body.text, format: 'json', limit: 1 }
  };
  
  // Start the request
  request(options, function (error, res, body) {
    if (!error && res.statusCode == 200) {
        // Print out the response body
        console.log(body);
        res.send("hello");
    }});
});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
