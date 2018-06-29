/**
 * Script para importar capas KML con gexml3 y modificar su formato elemento por elemento
 * 
 */
    console.log("Arranca el script importGeoxml3-V1");

    //Variables globales
    var geoXml = null;
    //var map = null;           //Map is defined (gloablly) in drawingTools

    function initialize() {

        var myOptions = {
            zoom: 16,
            center: {lat: 37.852, lng: -3.729},         //El Caimbo
            mapTypeId: "satellite",
            streetViewControl: false,           //Sin el control de Streetview                
        };

        //map is initialized in drawingTools.js
        //map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

        geoXml = new geoXML3.parser({
            map: map,
            singleInfoWindow: true,
            afterParse: useTheData
        });
        //geoXml.parse('http://www.geocodezip.com/TrashDays40.xml');
        geoXml.parse("https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A015000050000SK&del=23&mun=900&tipo=3d");
    };

    function useTheData(doc) {
        // Geodata handling goes here, using JSON properties of the doc object
        var sidebarHtml = '<table><tr><td><a href="javascript:showAll();">Show All</a></td></tr>';

        geoXmlDoc = doc[0];
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            // console.log(doc[0].markers[i].title);
            sidebarHtml += '<tr><td onmouseover="kmlHighlightPoly(' + i + ');" onmouseout="kmlUnHighlightPoly(' + i + ');"><a href="javascript:kmlClick(' + i + ');">' + doc[0].placemarks[i].name + '</a> - <a href="javascript:kmlShowPoly(' + i + ');">show</a></td></tr>';
            //    sidebarHtml += '<tr><td><a href="javascript:kmlClick('+i+');">'+doc[0].placemarks[i].name+'</a> - <a href="javascript:kmlShowPoly('+i+');">show</a></td></tr>';
            var placemark = geoXmlDoc.placemarks[i];
            //    var fill = kmlColor(style.color);
            //    var stroke = kmlColor(style.fillcolor);
            //    alert("color="+style.color+", fillcolor="+style.fillcolor);
            var kmlStrokeColor = kmlColor(placemark.style.color);
            var kmlFillColor = kmlColor(placemark.style.fillcolor);
            var normalStyle = {
                strokeColor: kmlStrokeColor.color,
                strokeWeight: placemark.style.width,
                strokeOpacity: kmlStrokeColor.opacity,
                fillColor: kmlFillColor.color,
                fillOpacity: kmlFillColor.opacity
            };
            geoXmlDoc.gpolygons[i].normalStyle = normalStyle;

            highlightPoly(geoXmlDoc.gpolygons[i]);

            //doc[0].markers[i].setVisible(false);
        }
        sidebarHtml += "</table>";
        document.getElementById("sidebar").innerHTML = sidebarHtml;
    };

    function hide_kml() {
        geoXml.hideDocument();
    }
    function unhide_kml() {
        geoXml.showDocument();
    }
    function reload_kml() {
        geoXml.hideDocument();
        delete geoXml;
        geoXml = new geoXML3.parser({
            map: map,
            singleInfoWindow: true,
            afterParse: useTheData
        });
        geoXml.parse('http://www.geocodezip.com/TrashDays40.xml');
        //geoXml.parse('counties01.xml'); 

    }
    function showAll() {
        map.fitBounds(geoXmlDoc.bounds);
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            geoXmlDoc.gpolygons[i].setMap(map);
        }
    }

    function kmlClick(pm) {
        /*
            if (geoXml.docs[0].markers[pm].getMap())
                google.maps.event.trigger(geoXml.docs[0].markers[pm],"click");
        */
        if (geoXml.docs[0].gpolygons[pm].getMap()) {
            google.maps.event.trigger(geoXmlDoc.gpolygons[pm], "click");
        } else {
            geoXmlDoc.gpolygons[pm].setMap(map);
            google.maps.event.trigger(geoXmlDoc.gpolygons[pm], "click");
        }
    }
    function kmlShowPoly(poly) {
        map.fitBounds(geoXmlDoc.gpolygons[poly].bounds);
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            if (i == poly) {
                geoXmlDoc.gpolygons[i].setMap(map);
                /*       geoXmlDoc.markers[i].setMap(map); */
            } else {
                geoXmlDoc.gpolygons[i].setMap(null);
                /*       geoXmlDoc.markers[i].setMap(null); */
            }
        }
    }

    function kmlColor(kmlIn) {
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
            kmlColor.color = randomColor();
            kmlColor.opacity = 0.45;
        }
        return kmlColor;
    }
    function randomColor() {
        var color = "#";
        var colorNum = Math.random() * 8388607.0;  // 8388607 = Math.pow(2,23)-1
        var colorStr = colorNum.toString(16);
        color += colorStr.substring(0, colorStr.indexOf('.'));
        return color;
    };

    var highlightOptions = { 
        fillColor: "#FFFF00", 
        strokeColor: "#000000", 
        fillOpacity: 0.9, 
        strokeWidth: 10 
    };

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

    function hide_markers_kml() {
        for (var i = 0; i < geoXmlDoc.markers.length; i++) {
            geoXmlDoc.markers[i].setVisible(false);
        }
    }

    function highlightPoly(poly) {
        //    poly.setOptions({fillColor: "#0000FF", strokeColor: "#0000FF", fillOpacity: 0.3});
        google.maps.event.addListener(poly, "mouseover", function () {
            poly.setOptions(highlightOptions);
        });
        google.maps.event.addListener(poly, "mouseout", function () {
            poly.setOptions(poly.normalStyle);
        });
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
