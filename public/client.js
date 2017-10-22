// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

function tryGuessPosition() {
  
  try {
    $.getJSON('//jsonip.com/?callback=?', function(positionData) {      
      $.getJSON( '//freegeoip.net/json/' + positionData.ip + '?callback=?', function(ipData) {
        console.log(JSON.stringify(ipData, null, 2));
        world.map.panTo(L.latLng(ipData.latitude, ipData.longitude));
      });    
      console.log(JSON.stringify(positionData, null, 2));
    });      
  }
  catch (err) {
    console.log(err);
  }
  
}

function addDayNight() {
  const dayNightOverlay = L.terminator();
  dayNightOverlay.addTo(window.world.map);
  setInterval(function() {updateTerminator(dayNightOverlay)}, 60 * 1000);
    function updateTerminator(dayNightOverlay) {
      const nextDayNightOverlay = L.terminator();
      dayNightOverlay.setLatLngs(nextDayNightOverlay.getLatLngs());
      dayNightOverlay.redraw();
  };  
};

function addMarker(latLng) {
    let parsed = Object.assign({},{ lat: 0, lng: 0}, latLng);
    const markerOptions = {radius: 8,
        fillOpacity: 1,
        color: 'black',
        fillColor: getRandomColor(),
        weight: 1
    };

    parsed.lat = parsed.lat.toFixed(6);
    parsed.lng = parsed.lng.toFixed(6);

    const marker = L.circleMarker(L.latLng(parsed.lat, parsed.lng), markerOptions);
    marker.bindTooltip(`Latitude: ${parsed.lat}<br/>Longitude: ${parsed.lng}`);
    window.world.sites.addLayer(marker);
    window.world.map.panTo(marker.getLatLng());
    getLocationForecast(parsed);
};  

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

function displayResults(data) {
  $("#results").empty();
  
  let tbl = d3.select("#results")
      .append("table")
      .style("overflow", "scroll")
      .style("display", "block")
      .style("max-height", "300px")
      .style("max-width", "800px")
      .style("border-collapse", "collapse")
      .style("border", "2px black solid");
  
 // headers
  tbl.append("thead")
      .append("tr")
      .selectAll("th")  
      .data(d3.keys(data[0]))
      .enter().append("th")
      .text(function(d) {
          return d;
      })
      .style("border", "1px black solid");
  
  tbl.append("tbody")  
      .selectAll("tr")
      .data(data)
      .enter().append("tr")
      .selectAll("td")
      .data(function(d) {
        return d3.values(d);
      })
      .enter().append("td")
      .style("border", "1px black solid")
      .style("padding", "5px")
      .on("mouseover", function(){d3.select(this).style("background-color", "grey")})
      .on("mouseout", function(){d3.select(this).style("background-color", "white")})
      .text(function(d){return d;})
      .style("font-size", "12px");
};

function getLocationForecast(latLng) {
    const parsed = Object.assign({},{ lat: 0, lng: 0}, latLng);
    
    $.post('/locationDetails?' + $.param({
        lat: parsed.lat,
        lng: parsed.lng
      }), (results) => {
      $("#resultsHeader").text(`Radiation: (${parsed.lat}, ${parsed.lng})`);  
      displayResults(results);
    });
};

$(function() {
  console.log('Hello');
});
