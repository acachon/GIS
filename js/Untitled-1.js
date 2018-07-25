parserOptions.infoWindow = new google.maps.InfoWindow();

if (!!doc.markers[i].infoWindow) {
    doc.markers[i].infoWindow.close();
}

if (!!doc.gpolygons) {
    for (i = 0; i < doc.gpolygons.length; i++) {
        if (!!doc.gpolygons[i].infoWindow) doc.gpolygons[i].infoWindow.close();
        doc.gpolygons[i].setMap(null);
    }
}
//---------------------------------------------------
    var p = new google.maps.Polygon(polyOptions);
    
function creaClickHandlerSigpac (recinto){
//CRea una infoWindow y la asocia al recinto facilitado
//CRea el listener onclick para mostrar dicha infowindow

    //1. Defino la infoWindow
    var infoWindowOptions = {
        content:        '<div class="sigpac_infowindow"><h3>Recinto: ' + recinto.getProperty("ID_RECINTO") +'</h3>'
                        +'<br><h5>Cultivo: ' + recinto.getProperty("CD_USO") + '</h5></div>',
        pixelOffset:    new google.maps.Size(0, 2),
    };

    //2. Creo la infoWindow y al maceno tambien las opciones para poder recrearla  mas adelante
    polygon.setProperty("infoWindow")           = new google.maps.InfoWindow(infoWindowOptions);
    polygon.setProperty("infoWindowOptions")    = infoWindowOptions;

    //3. Creo el Listener que lo asocia al click en el poligono "p"
    google.maps.event.addListener(polygon, 'click', function (e) {
        //if (!polygon.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa

        polygon.getProperty("infoWindow").close();                           //La cierro
        polygon.getProperty("infoWindow").setOptions(p.infoWindowOptions);   //La vuelvo a configurar (variando estas Options puedo hacer que muestre cosas distintas cada vez)
        polygon.getProperty("infoWindow").setPosition(e.latLng);             //Indico el lugar donde mostrarse
        polygon.getProperty("infoWindow").open(this.map);                    //Y finalmente lo muestro
    });
}





    map.data.forEach(feature => {
        if (!!feature.getProperty("ID_RECINTO")){
        }
    });
    
    map.data.addListener('mouseover', function(event) {
        if (!layersControl[2].flagClickable) return;                //Flag global que inhibie los listener cuando no SIGPAC no es seleccionable
        
        map.data.overrideStyle(event.feature, {fillOpacity: 1 });
    });

//---------------------------------------------------
if (!parserOptions.suppressInfoWindows) {
    var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
        content: '<div class="geoxml3_infowindow"><h3>' + placemark.name +
            '</h3><div>' + placemark.description + '</div></div>',
        pixelOffset: new google.maps.Size(0, 2)
    });
    if (parserOptions.infoWindow) {
        p.infoWindow = parserOptions.infoWindow;
    } else {
        p.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
    }
    p.infoWindowOptions = infoWindowOptions;
    // Infowindow-opening event handler
    google.maps.event.addListener(p, 'click', function (e) {
        if (!p.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa

        p.infoWindow.close();
        p.infoWindow.setOptions(p.infoWindowOptions);
        if (e && e.latLng) {
            p.infoWindow.setPosition(e.latLng);
        } else {
            p.infoWindow.setPosition(p.bounds.getCenter());
        }
        p.infoWindow.open(this.map);
    });
}