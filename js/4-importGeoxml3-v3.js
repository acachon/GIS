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
    var zIndexOffset=10;    //Todos los objetos se indexan desde aqui. Reservo desde el zIndex=0 para mis usos (ej tapaMapa tiene zIndex=0)
    var importedFile =null; //Variable donde importo el contenido del fichero seleccionado

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
        miUrls=[
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A015000050000SK&del=23&mun=900&tipo=3d",
            "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat=23900A01000045&del=23&mun=900&tipo=3d",
            ];
        geoXml.parse(miUrls);
        
    };

    function useTheData(docs) {
    //Crea un listado (html a incrustar) dinamico en la ventana lateral con las parcelas importadas

        //Consulto en catastro los cultivos de los docs y lo actualizo para los nuevos
        //Reviso todos los docs para ver si tienen cultivos o no. En caso negativo los calculo y los meto
        geoXml.docs.forEach(doc => {
            if (!doc.cultivos){    //si no tiene aun atributo de cultivos
                //Calculo la refCat de ese doc
                var refcat=doc.url.substr(doc.url.indexOf("refcat=")+7,14); //Cojo las 14 posiciones despues de "refcat="

                //Consulto los cultivos al catastro y los asigno al doc como callback
                cultivosRefCatastral(refcat, function(cultivos){
                    doc.cultivos=cultivos;
                });
            }
        });
    
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
        //Muestro todo el geoXml
        geoXml.showDocument();
        //Zoom a todos los docs[]
        map.fitBounds(geoXml.boundsAll());        

//------//Pruebas a eliminar---------------------------------------------------
        console.log("Pruebas acachon");
 
       
        //Pruebo a cargar el fichero del SIGPAC convertido
        //var data = map.data.loadGeoJson(geoJsonFile);
        //map.data.addGeoJson(data);

        map.data.addGeoJson(importedFile);
        map.data.setStyle({
            visible: true,
            //strokeWeight: 5,
            strokeColor: "white",
            zIndex: zIndexOffset,                              //Asi tapaMapa esta por debajo
        });
        zIndexOffset++;
//--------------------------------------------------------------------------
    }

    function kmlShowPoly(docID, polyID) {
    //Hace zoom en la subparcela polyID y oculta las demas
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

    function importarFichero(e) {
    //Lee un fichero de texto seleccionado por el usuario       
    //Importo el contenido del fichero de texto en la variable gloabl importedFile
    //ToDo: gestionar carga multiple de ficheros
        if (!e.files[0]) return                 //Si no hay achivo m salgo sin hacer nada
    
        //Declaro el callback de la lectura del fichero y lo cargo en importFile
        var reader = new FileReader();
        document.getElementById('file-content').textContent = "Fichero: "+e.files[0].name;
        reader.onload = function (e) {
            importedFile= JSON.parse(e.target.result);          
            document.getElementById('file-content').textContent += "\nFichero importado";
            console.log("Fichero importado");
        };
        //Lanzo la lectura del fichero (asincrona)
        reader.readAsText(e.files[0]);                //Lee xml, json
    }

    //--------------------------------------------------------------//
    //Funciones a eliminar porque no se usan o  aplican en Catastro //
    //--------------------------------------------------------------// 

    function killListeners (poly){
    //Elimino los listener del array de Listeners
        for (var i=poly.listeners.length-1; i>=0;i--){
            poly.listeners[i].remove();
            poly.listeners.pop
        }   
    }