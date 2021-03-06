/**
 * Script para importar capas KML con gexml3 y modificar su formato elemento por elemento
 * 
 */
    console.log("Arranca el script importGeoxml3-V1");

    //Variables globales
    var geoXml = null;      //Objeto con toda la informaicon importada de las capas del catastro

    //Defino los colores de las subparcelas de manera estatica y me salto lo que viene definido en al capa KML
    const normalStyle = {
        fillColor: "#008000",       //verde mini 
        fillOpacity: 0.3, 
        strokeColor: "#FFFFFF",     //white 
        strokeWidth: 20,
        strokeOpacity: 0.8,
    };

    //Estilo de la subparcela al hacer mouseover
    const highlightOptions = { 
        fillColor: "#00FF00",       //verde pera
        fillOpacity: 0.9, 
        strokeColor: "#000000",     //negro 
        strokeWidth: 40,
        strokeOpacity: 1, 
    };
    
    const defaultColor    = "#FFFF00";
    const defaultOpacity  = 0.5;

    function initialize() {
        //Inicializo el objeto geoXml ligada al map y con un callback (useTheData)
        geoXml = new geoXML3.parser({
            map: map,
            singleInfoWindow: true,
            afterParse: useTheData      //Funcion llamada tras concluir el parse del fichero KML
        });

        //Importo una parcela a modo de ejemplo (Caimbo)
        geoXml.parse("https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A015000050000SK&del=23&mun=900&tipo=3d");
    };

    function useTheData(doc) {
    //TODO Almacenar el nuevo doc en una array para que se pueda gestionar en el futuro. Mirar si es una referenia o una copia

        //Construyo el codigo html de la ventana lateral con la info de la parcela
        var sidebarHtml = '<table><tr><td><a href="javascript:showAll();">Show All</a></td></tr>';

        geoXmlDoc = doc[0];
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
        //Recorro todas las poligonales de la capa KML (subparcelas) para ponerlas en el sidebar y darles formato
          
            /* AJC: He sustituido por una variable estatica (normalStyle) donde defino los colores para todo tipo de parcela
            //Por cada poligonal (placemark), recupero el formato/stylo
            var placemark = geoXmlDoc.placemarks[i];
            var kmlStrokeColor = kmlColor(placemark.style.color);
            var kmlFillColor = kmlColor(placemark.style.fillcolor);
            var normalStyle = {
                strokeColor: kmlStrokeColor.color,
                strokeWeight: placemark.style.width,
                strokeOpacity: kmlStrokeColor.opacity,
                fillColor: kmlFillColor.color,
                fillOpacity: kmlFillColor.opacity
            };
            */
 
            //Creo una nueva fila en el sidebar con la info de cada poligono: y le asigno una funcion de mouseover/out/etc...
            sidebarHtml += '<tr><td onmouseover="kmlHighlightPoly(' + i + ');" onmouseout="kmlUnHighlightPoly(' + i + ');"><a href="javascript:kmlClick(' + i + ');">' + doc[0].placemarks[i].name + '</a> - <a href="javascript:kmlShowPoly(' + i + ');">show</a></td></tr>';
 
            geoXmlDoc.gpolygons[i].normalStyle = normalStyle;
            highlightPoly(geoXmlDoc.gpolygons[i]);
        }

        //Incrusto el codigo HTML creado con el listado de subparcelas (poligonales)
        sidebarHtml += "</table>";
        document.getElementById("sidebar").innerHTML = sidebarHtml;
    };

    //Funciones para visualizacion de la capa KML y sus subparcelas //
    //--------------------------------------------------------------// 

    function showAll() {
    //Muestra todas las subparcelas y ajusta el zoom para verse todas
        //Ajusto el zoom
        map.fitBounds(geoXmlDoc.bounds);
        //Muestro todas las subparcelas
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            geoXmlDoc.gpolygons[i].setMap(map);
        }
    }

    function kmlClick(pm) {
    //Hace zoom y muestra la subparcela seleccionada
        if (geoXml.docs[0].gpolygons[pm].getMap()) {
            google.maps.event.trigger(geoXmlDoc.gpolygons[pm], "click");
        } else { //Si la subparcela no estaba visible en el mapa la muestra y luego zoom
            geoXmlDoc.gpolygons[pm].setMap(map);
            google.maps.event.trigger(geoXmlDoc.gpolygons[pm], "click");
        }
    }

    function kmlShowPoly(polyID) {
    //Hace zoom en la subparcela polyID y oculta las demas
        //Oculto toda subparcela
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            geoXmlDoc.gpolygons[i].setMap(null);
        }
        //Muestro solo la parcela con el indice polyID seleccionado y hago zoom en ella
        geoXmlDoc.gpolygons[polyID].setMap(map);
        map.fitBounds(geoXmlDoc.gpolygons[polyID].bounds);
    }

    function kmlHighlightPoly(poly) {
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            if (i == poly) {
                geoXmlDoc.gpolygons[i].setOptions(highlightOptions);
            } else {
                geoXmlDoc.gpolygons[i].setOptions(geoXmlDoc.gpolygons[i].normalStyle);
            }
        }
    }

    function kmlUnHighlightPoly(poly) {
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            if (i == poly) {
                geoXmlDoc.gpolygons[i].setOptions(geoXmlDoc.gpolygons[i].normalStyle);
            }
        }
    }

    function highlightPoly(poly) {
        google.maps.event.addListener(poly, "mouseover", function () {
            poly.setOptions(highlightOptions);
        });
        google.maps.event.addListener(poly, "mouseout", function () {
            poly.setOptions(poly.normalStyle);
        });
    }

    function hide_markers_kml() {
        for (var i = 0; i < geoXmlDoc.markers.length; i++) {
            geoXmlDoc.markers[i].setVisible(false);
        }
    }
    
    function unhide_markers_kml() {
        for (var i = 0; i < geoXmlDoc.markers.length; i++) {
            geoXmlDoc.markers[i].setVisible(true);
        }
    }

    function hide_polys_kml() {
        for (var i = 0; i < geoXmlDoc.gpolylines.length; i++) {
            geoXmlDoc.gpolylines[i].setMap(null);
        }
    }

    function unhide_polys_kml() {
        for (var i = 0; i < geoXmlDoc.gpolylines.length; i++) {
            geoXmlDoc.gpolylines[i].setMap(map);
        }
    }

    //Funciones utiles para usar en su momento //
    //----------------------------------------//
    function hide_kml() {
    //Oculta toda la capa, todas las parcelas, subparcelas, etc..
        geoXml.hideDocument();
    }
    
    function unhide_kml() {
    //Muestra toda la capa, todas las parcelas, subparcelas, etc..
        geoXml.showDocument();
    }

    function reload_kml() {
    //Borra y vuelve a cargar la capa KML
        geoXml.hideDocument();
        delete geoXml;
        geoXml = new geoXML3.parser({
            map: map,
            singleInfoWindow: true,
            afterParse: useTheData
        });
        geoXml.parse("https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A015000050000SK&del=23&mun=900&tipo=3d");
    }

    function kmlColor(kmlIn) {
    //Convierte el formato de codigo de colores y la opacidad al usado por GoogleMaps
    //Solo es necesario si cojo los colores del KML. Si los defino estaticamente, no necesito esto
        var kmlColor = {};
        if (kmlIn) {
            aa = kmlIn.substr(0, 2);
            bb = kmlIn.substr(2, 2);
            gg = kmlIn.substr(4, 2);
            rr = kmlIn.substr(6, 2);
            kmlColor.color = "#" + rr + gg + bb;
            kmlColor.opacity = parseInt(aa, 16) / 256;
        } else {
            // defaults
            kmlColor.color = defaultColor;
            kmlColor.opacity = defaultOpacity;
        }
        return kmlColor;
    }