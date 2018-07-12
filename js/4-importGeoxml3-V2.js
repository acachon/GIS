/**
 * Script para presentar en pantalla la capa KML importada
 * 0. Carga un fichero KML eterminado al inicializarse a modo de ejemplo
 * 1. Muestra los poligonos importados
 * 2. Muestra listado en ventana lateral
 * 3. Visalizacion dinamica cuando para el raton o se selecciona a la derecha
 * 4. Override del estilo que indique el fichero orginal KML
 * 5. 
 */
    console.log("Arranca el script importGeoxml3-V1");

    //----------------------//
    //Variables globales    //
    //----------------------//

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
    
    //Solo para cuando se coge el estilo del KML y este viene vacio
    const defaultColor    = "#008000";
    const defaultOpacity  = 0.3;

    //------------------------------------------//
    //Funciones y metodos de este componente    //
    //------------------------------------------//

    function initialize() {
        //Inicializo el objeto geoXml ligada al map y con un callback (useTheData)
        geoXml = new geoXML3.parser({
            map: map,               // Mapa en el que visualizar la capa KML importada
            zoom: true,             // Hace zoom a la capa KML cargada 
            singleInfoWindow: true, // Muestra solo una ventana de info al clickar (la ultima), desapareciendo las demas      
            afterParse: useTheData, // Funcion llamada tras concluir el parse del fichero KML
        });

        //Importo una parcela a modo de ejemplo (Caimbo) del catastro
        const webServ   = "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?";
        const provincia = 23;       //Jaen
        const municipio = 900;      //Jaen
        const sector    = "A"       //Sector A
        const poligono  = "015";    //Grañena
        const parcela   = "00005";  //Caimbo

        geoXml.parse(
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?"
            + "refcat=" + provincia + municipio + sector + poligono + parcela
            + "&del=" + provincia
            + "&mun=" + municipio
            + "&tipo=3d"
            );

        /*Carga multiple de KML simulateamente
        geoXml.parse([
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A015000050000SK&del=23&mun=900&tipo=3d",
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A01000045&del=23&mun=900&tipo=3d",
            ]);
        */
    };

    function useTheData(doc) {
    //Crea un listado (html a incrustar) dinamico en la ventana lateral con las parcelas importadas
    
        //Construyo el codigo html de la ventana lateral con la info de la parcela
        var sidebarHtml = '<table><tr><td><a href="javascript:showAllPoly();">Show All</a></td></tr>';

        //Recorro todas las poligonales de la capa KML (subparcelas) para ponerlas en el sidebar y darles formato   
        geoXmlDoc = doc[0];
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
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
            //Aplico el estilo normal por defecto y creo los listener de mouseover/out para realzar la subparacela
            geoXmlDoc.gpolygons[i].normalStyle = normalStyle;
            highlightPolyListener(geoXmlDoc.gpolygons[i]);   //Creo los listener en esta subparcela
        }

        //Incrusto el codigo HTML creado con el listado de subparcelas (poligonales)
        sidebarHtml += "</table>";
        document.getElementById("sidebar").innerHTML = sidebarHtml;
    };

    //--------------------------------------------------------------//
    //Funciones para visualizacion de la capa KML y sus subparcelas //
    //--------------------------------------------------------------// 

    function highlightPolyListener(poly) {
    //Declaro los listener para realzar la subparcela al pasar el raton
        google.maps.event.addListener(poly, "mouseover", function () {
            poly.setOptions(highlightOptions);
        });
        google.maps.event.addListener(poly, "mouseout", function () {
            poly.setOptions(poly.normalStyle);
        });
    }

    function kmlClick(pm) {
    //Hace zoom y muestra la subparcela seleccionada como si la clickase
        if (geoXml.docs[0].gpolygons[pm].getMap()) {
            google.maps.event.trigger(geoXmlDoc.gpolygons[pm], "click");
        } else { //Si la subparcela no estaba visible en el mapa la muestra y luego zoom
            geoXmlDoc.gpolygons[pm].setMap(map);
            google.maps.event.trigger(geoXmlDoc.gpolygons[pm], "click");
        }
    }

    function showAllPoly() {
    //Muestra todas las subparcelas y ajusta el zoom para verse todas
        //Ajusto el zoom
        map.fitBounds(geoXmlDoc.bounds);
        //Muestro todas las subparcelas
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            geoXmlDoc.gpolygons[i].setMap(map);
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

    function kmlHighlightPoly(polyID) {
    //Resalto la subparcela polyID y dejo las demas en normal
        for (var i = 0; i < geoXmlDoc.gpolygons.length; i++) {
            geoXmlDoc.gpolygons[i].setOptions(geoXmlDoc.gpolygons[i].normalStyle);
        }
        //Resalto la subparcela indicada por su indice polyID
        geoXmlDoc.gpolygons[polyID].setOptions(highlightOptions);
    }

    function kmlUnHighlightPoly(polyID) {
    //Vuelvo al estilo normal a la subparcela polyID
        geoXmlDoc.gpolygons[polyID].setOptions(geoXmlDoc.gpolygons[polyID].normalStyle);
    }

    //-----------------------------------------//
    //Funciones utiles para usar en su momento //
    //-----------------------------------------//
    /*
    function kmlShowMarkers(flag) {
    //Muestra o no los marcadores KML segun indique el flag (true or false)
        for (var i = 0; i < geoXmlDoc.markers.length; i++) {
            geoXmlDoc.markers[i].setVisible(flag);
        }
    }

    function kmlShowPolyLines(flag) {
    //Muestro o no en el mapa las polilineas del KML segun sea el flag (true or false)
        flag ? canvas=map : canvas=null;
        for (var i = 0; i < geoXmlDoc.gpolylines.length; i++) {
            geoXmlDoc.gpolylines[i].setMap(canvas);
        }
    }
    
    function kmlShow(flag) {
    //Muestra toda la capa KML o no segun el flag (true or false)
        if (flag){ 
            geoXml.showDocument();
        }
        else {      
            geoXml.hideDocument();
        }
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
    */