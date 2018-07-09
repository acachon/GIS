//Asignar infoWindows a cada marcador
// marcador 1
var marker1 = new google.maps.Marker({
position: new google.maps.LatLng(41.385064, 2.173404),
map: map,
});
 
// InfoWindow para el marcador 1
var infowindow1 = new google.maps.InfoWindow({
content: 'Barcelona <a href="http://es.wikipedia.org/wiki/Barcelona" target="_blank">Wikipedia</a>'
});
 
// Añadimos un evento de clic al marcador
google.maps.event.addListener(marker1, 'click', function() {
    // Ejemplo:Llamamos el método open del InfoWindow
    infowindow1.open(map, marker1);
});
