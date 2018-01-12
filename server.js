const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rp = require('request-promise');
const solcast = require('solcast');

app.use(express.static('public'));
app.use(bodyParser.urlencoded());

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/locationPower", function (req, res) {   
  console.log(req.body);    
  return Promise.try(function() {    
      var options = {
        uri: 'http://nominatim.openstreetmap.org/search',
        method: 'GET',
        qs: {q: req.body.text, format: 'json', limit: 1 },
        json: true
      };
      return rp(options).then(function (data) {
          console.log(data);
          response.send(data);
        })
        .catch(function (err) {
          response.send(err);
        });
      return doSomeAsyncThing();
    }).then(function(newValue) {
      res.send("Done!");
  });

});

const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
