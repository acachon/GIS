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

        /*
        geoXml.parse(
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?"
            + "refcat=" + provincia + municipio + sector + poligono + parcela
            + "&del=" + provincia
            + "&mun=" + municipio
            + "&tipo=3d"
            );
        */
        ///*
        //Carga multiple de KML simulateamente
        geoXml.parse([
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A015000050000SK&del=23&mun=900&tipo=3d",
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A01000045&del=23&mun=900&tipo=3d",
            ]);
        //*/
    };

    function useTheData(docs) {
    //Crea un listado (html a incrustar) dinamico en la ventana lateral con las parcelas importadas
    
        //Construyo el codigo html de la ventana lateral con la info de la parcela
        var sidebarHtml = '<table><tr><td><a href="javascript:showAllPoly();">Show All</a></td></tr>';

        //Crear el sidebar con la info de todos los poligonos y parcelas
        //CReo un listenr en cada pol'igono para resaltarlo con mouseover
        for (var n=0; n<docs.length; n++){
            //Recorro todas las poligonales de la n-capa KML (subparcelas) para ponerlas en el sidebar y darles formato   
            for (var i = 0; i < geoXml.docs[n].gpolygons.length; i++) {
                //Creo una nueva fila en el sidebar con la info de cada poligono: y le asigno una funcion de mouseover/out/etc...
                sidebarHtml += '<tr><td onmouseover="kmlHighlightPoly(' + n + "," + i + ');" onmouseout="kmlUnHighlightPoly(' + n + "," + i + ');"><a href="javascript:kmlClick(' + n + "," + i + ');">' + docs[0].placemarks[i].name + '</a> - <a href="javascript:kmlShowPoly(' + n + "," + i + ');">show</a></td></tr>';
                //Aplico el estilo normal por defecto y creo los listener de mouseover/out para realzar la subparacela
                geoXml.docs[n].gpolygons[i].normalStyle = normalStyle;
                highlightPolyListener(geoXml.docs[n].gpolygons[i]);   //Creo los listener en esta subparcela
            }
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
    //toDo: hacer los listener con un array de handlers
        
        var listeners = []; //Array donde guardo los listener handlers
        listener = google.maps.event.addListener(poly, "mouseover", function () {
            if (!poly.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa
            poly.setOptions(highlightOptions);
        });
        listeners.push(listener);

        listener = google.maps.event.addListener(poly, "mouseout", function () {
            if (!poly.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa            
            poly.setOptions(poly.normalStyle);
        });
        listeners.push(listener);

        if (!poly.listeners){
            poly.listeners = listeners; //Creo un atributo listeners y le asociado el array recien declarado
        }else { 
            //si ya existe el array de listerner en el objeto poly: añado los nuevos listeners
            for (var i=0; i<listeners.length; i++){
                poly.listeners.push(listeners[i]);
            }
        }
    }

    function killListeners (poly){
    //Elimino los listener del array de Listeners
        for (var i=poly.listeners.length-1; i>=0;i--){
            poly.listeners[i].remove();
            poly.listeners.pop
        }   
    }

    function kmlClick(docID, polyID) {
    //Hace zoom y muestra la subparcela seleccionada como si la clickase
        if (geoXml.docs[docID].gpolygons[polyID].getMap()) {
            google.maps.event.trigger(geoXml.docs[docID].gpolygons[polyID], "click");
        } else { //Si la subparcela no estaba visible en el mapa la muestra y luego zoom
            geoXml.docs[docID].gpolygons[polyID].setMap(map);
            google.maps.event.trigger(geoXml.docs[docID].gpolygons[polyID], "click");
        }
    }

    function showAllPoly() {
    //Muestra todas las subparcelas y ajusta el zoom para verse todas
        //Zoom a todos los docs[]
        map.fitBounds(geoXml.boundsAll());

        //Muestro todo el geoXml
        geoXml.docs.forEach(element => {
            element.gpolygons.forEach(element => {element.setMap(map)});
            element.gpolylines.forEach(element => {element.setMap(map)});
            element.markers.forEach(element => {element.setVisible(true)});
        });

        //Activo el flag de visibility del layer catastro
        

//------//Pruebas a eliminar---------------------------------------------------
        console.log("Pruebas acachon");
        //geoXml.activatePlacemarks(false);

//--------------------------------------------------------------------------
    }

    function kmlShowPoly(docID, polyID) {
    //Hace zoom en la subparcela polyID y oculta las demas
        //Oculto todo
        /*
        for (var n=0; n<geoXml.docs.length; n++){
            //Oculto los poligonos
            geoXml.docs[n].gpolygons.forEach(element => {element.setMap(null)});
            //Oculto las polilineas
            geoXml.docs[n].gpolylynes.forEach(element => {element.setMap(null)});
            //Oculto los marcadores
            geoXml.docs[n].markers.forEach(element => {element.setVisible(false)});
        }
        */
        geoXml.hideDocument();
        
        //Muestro solo la parcela con el indice polyID seleccionado y hago zoom en ella
        geoXml.docs[docID].gpolygons[polyID].setMap(map);
        map.fitBounds(geoXml.docs[docID].gpolygons[polyID].bounds);
    }

    function kmlHighlightPoly(docID, polyID) {
    //Resalto la subparcela polyID
    //docID es el indice del documento, de la parcela KML.
    //polyID es el indice del array de poligonos dentro de docs[docID]
        geoXml.docs[docID].gpolygons[polyID].setOptions(highlightOptions);
    }

    function kmlUnHighlightPoly(docID, polyID) {
    //Vuelvo al estilo normal a la subparcela polyID
    //docID es el indice del documento, de la parcela KML.
    //polyID es el indice del array de poligonos dentro de docs[docID]
        geoXml.docs[docID].gpolygons[polyID].setOptions(geoXml.docs[docID].gpolygons[polyID].normalStyle);
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
    
    function switchListeners (flag){
    //Cambio la propiedad active de todos los placemarkers
    //Todos los listerners los he hecho que verifiquen esta propiedad para desactivarse o activarse
        for (var n=0; n<geoXml.docs.length; n++){
            //Polygons
            for (var i = 0; i < geoXml.docs[n].gpolygons.length; i++) {
                geoXml.docs[n].gpolygons[i].active=flag;
            }
            
            //Markers
            for (var i = 0; i < geoXml.docs[n].markers.length; i++) {
                geoXml.docs[n].markers[i].active=flag;
            }

            //Polylines
            for (var i = 0; i < geoXml.docs[n].gpolylines.length; i++) {
                geoXml.docs[n].gpolylines[i].active=flag;
            }
        }  
    }
    */