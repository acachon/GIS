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

    var geoXml = null;                      //Objeto con toda la informaicon importada de las capas del catastro
    var zIndexOffset=10;                    //Todos los objetos se indexan desde aqui. Reservo desde el zIndex=0 para mis usos (ej tapaMapa tiene zIndex=0)
    
    //SIGPAC
    var importedFileSigpac =null;           //Variable donde importo el contenido del fichero seleccionado
    const geoJsonDefaultOptions ={          //Opciones por defecto para lo cargado en al capa map.data (google.maps.Map.data)
        strokeColor:    "black",
        strokeOpacity:  0.8,
        fillColor:      "black",
        fillOpacity:    0.5,
        clickable:      false,
        visible:        true,           
        zIndex:         zIndexOffset,
    }
    const colorByUso={                      //Colores predefinidos para las parcelas segun su uso (property CD_USO) 
        TA: "yellow",
        OV: "green",
        IM: "black",
        PR: "brown"
    };

    var miGeoJson = new Object;             //Declaro un objeto tipo geoJson vacio, sin features 
    miGeoJson.type = "FeatureCollection";   //Tengo que incluir este atributo para que sea un geoJson y lo coja googleMaps en addGeoJson()

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

        //1. Creo la cabecera y datos comunes de la tabla ocn la info de cada parcela y sus cultivos
        //Cabecera html
        var col1 = "Nombre";
        var col2 = "Ref. Catastral";
        var col3 = "Subparcelas";
        var col4 = "Area (m2)";
        var cabeceraTabla = "<table><thead><tr><th>"+ col1 +"</th><th>"+ col2 +"</th><th>"+ col3 +"</th><th>"+ col4 +"</th></tr></thead>";
        //Arranco el body html
        var bodyHtml = "<tbody>";

        //2. Consulto en catastro los cultivos de los docs y lo actualizo para los nuevos
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

        
        ///*
        var sidebarHtml = '<table><tr><td><a href="javascript:showAllPoly();">Show All</a></td></tr>';
        //Crear el sidebar con la info de todos los poligonos y parcelas
        for (var n=0; n<docs.length; n++){
            //Recorro todas las poligonales de la n-capa KML (subparcelas) para ponerlas en el sidebar y darles formato   
            for (var i = 0; i < geoXml.docs[n].gpolygons.length; i++) {
                //Creo una nueva fila en el sidebar con la info de cada poligono: y le asigno una funcion de mouseover/out/etc...
                sidebarHtml += '<tr><td '
                +  'onmouseover="kmlHighlightPoly(' + n + "," + i + ');" '
                + 'onmouseout="kmlUnHighlightPoly(' + n + "," + i + ');">'
                +   '<a href="javascript:kmlClick(' + n + "," + i + ');">' 
                +  docs[0].placemarks[i].name +  '</a> - '
                +'<a href="javascript:kmlShowPoly(' + n + "," + i + ');">show</a></td></tr>';

                //Aplico el estilo normal por defecto y creo los listener de mouseover/out para realzar la subparacela
                geoXml.docs[n].gpolygons[i].normalStyle = normalStyle;
                highlightPolyListener(geoXml.docs[n].gpolygons[i]);   //Creo los listener en esta subparcela
            }
        }

        //Incrusto el codigo HTML creado con el listado de subparcelas (poligonales)
        sidebarHtml += "</table>";
        document.getElementById("sidebar").innerHTML = sidebarHtml;
        //*/

    };

    //--------------------------------------------------------------//
    //Funciones para visualizacion de la capa KML y sus subparcelas //
    //--------------------------------------------------------------// 

    function tablaCatastroSubparcelas (refCatastral){
    //Construye una tabla HTML donde visualizar la info de las subparcelas

        //Determino el doc asociado a esta refCatastral y selecciono sus cultivos
        for (var i=0; i<geoXml.docs.length; i++){
            if (geoXml.docs[i].cultivos.refCatastral==refCatastral) break;
        }
        var cultivos =   geoXml.docs[i].cultivos;

        //Construyo el codigo html de la ventana lateral con la info de la parcela
        //1. Cabecera
        var col1 = "Subparcela";
        var col2 = "Cultivo";  
        var col3 = "IP";
        var col4 = "Area (m2)";
        var cabeceraTabla = "<table><thead><tr><th>"+ col1 +"</th><th>"+ col2 +"</th><th>"+ col3 +"</th><th>"+ col4 +"</th></tr></thead>";

        //2. Recorro cada subparcela, cada registro de cultivos, para extraer la informacion de cada fila
        var bodyHtml = "<tbody>";
        cultivos.subparcelas.forEach((subparcela) => {

            var nombre      =   subparcela.subID;
            var cultivo     =   subparcela.cultivoID;   //Uso la abreviatura por simplicidad
            //var cultivo     =   subparcela.cultivo;
            var ip          =   subparcela.intensidad;
            var superficie  =   subparcela.superficie;

            //Calculo el indice de la poligonal que se corresponde con esta subparcela 9no tienen el mismo orden)
            //empiezo en 1 porque se que el primero no es una subparcela sino la parcela completa
            for (var j=1; j<geoXml.docs[i].gpolygons.length; j++){
                var empieza =   geoXml.docs[i].gpolygons[j].infoWindowOptions.content.indexOf("h3> ");
                var acaba   =   geoXml.docs[i].gpolygons[j].infoWindowOptions.content.indexOf("</h3");
                subpName    =   geoXml.docs[i].gpolygons[j].infoWindowOptions.content.substr(empieza+6, acaba-empieza-6);
                //refcat=doc.url.substr(doc.url.indexOf("refcat=")+7,14); //Cojo las 14 posiciones despues de "refcat="
                if (subpName==nombre) break;
            }
            var index = j;

            //Incluyo un evento mousever/out para resaltar la subparcela cuando se apunte a su nombre
            //La varibale i retiene el indice al docs[i] del que estamos calculando sus subparcelas
            var nombreActivo = ' style="color:blue;cursor: pointer;" ' 
                    +'onmouseover="kmlHighlightPoly(' + i + "," + index + ');" '
                    +'onmouseout="kmlUnHighlightPoly(' + i + "," + index + ');" '
                    +'onclick="kmlShowPoly(' + i + "," + index + ');" ' + '>'
                    + nombre;
            
            //Incluyo una nueva fila al body de la tabla
            //Observa que el td del nombre no esta cerrado para meter los listener del redCattastralActive
            bodyHtml += "<tr><td"+ nombreActivo +"</td><td>"+ cultivo +"</td><td>"+ ip +"</td><td>"+ superficie +"</td></tr>";
        });
        bodyHtml += "</tbody>";

        //3. Incrusto el codigo HTML creado con el listado de subparcelas (poligonales)
        var tablaHtml = cabeceraTabla + bodyHtml;
        tablaHtml += "</table>";
        document.getElementById("tabla-catastro-subparcelas").innerHTML = tablaHtml;

    }
    
    function tablaCatastroParcelas (){
    //Construye una tabla HTML donde visualizar la info de las parcelas

        //Construyo el codigo html de la ventana lateral con la info de la parcela
        //1. Cabecera
        var col1 = "";
        //var col1 = "Nombre";
        var col2 = '<a '+ ' style="color:blue;"'+ ' href="javascript:showAllPoly();">Ref. Catastral</a>';      //Si pincho en el titulo de la columna se muestra todo de nuevo
        //var col2 = "Ref. Catastral";  
        var col3 = "Subparcelas";
        var col4 = "Area (m2)";
        var cabeceraTabla = "<table><thead><tr><th>"+ col1 +"</th><th>"+ col2 +"</th><th>"+ col3 +"</th><th>"+ col4 +"</th></tr></thead>";

        //2. Recorro cada ref catastral, cada doc del geoXml, para extraer la informacion de cada fila
        var bodyHtml = "<tbody>";
        geoXml.docs.forEach((doc, index) => {
            //var nombre      =   doc.cultivos.nombre;
            var nombre      =   "";
            var refCatastral=   doc.cultivos.refCatastral;
            var subparcelas =   doc.cultivos.subparcelas.length;
            var superficie  =   doc.cultivos.superficie;

            //Incluyo un evento mousever/out para resaltar la parcela cuando se indique su refCatastral
            //La parcela completa siempre es el primer poligono de los importados del catastro.(hipotesis)
            var refCatastralActive = ' style="color:blue;cursor: pointer;" ' 
                    +'onmouseover="kmlHighlightPoly(' + index + "," + 0 + ');" '
                    +'onmouseout="kmlUnHighlightPoly(' + index + "," + 0 + ');" '
                    +'onclick="tablaCatastroSubparcelas(\'' + refCatastral + '\');"' + '>'
                    + refCatastral;
            
            //Incluyo una nueva fila al body de la tabla
            //Observ que el td de la RC no esta cerrado para meter los listener del redCattastralActive
            bodyHtml += "<tr><td>"+ nombre +"</td><td"+ refCatastralActive +"</td><td>"+ subparcelas +"</td><td>"+ superficie +"</td></tr>";
        });
        bodyHtml += "</tbody>";

        //3. Incrusto el codigo HTML creado con el listado de subparcelas (poligonales)
        var tablaHtml = cabeceraTabla + bodyHtml;
        tablaHtml += "</table>";
        document.getElementById("tabla-catastro-parcelas").innerHTML = tablaHtml;

    }

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

    //--------------------------------------------------------------//
    //Funciones para procesar la informacion del SIGPAC             //
    //--------------------------------------------------------------// 
    
    function seleccionarParcelasSigpac (refCats, ficheroGeoJson){
    //Extrae del fichero importedFileSigpac (geoJson) las features, recintos, requeridos
    //Input es un array de referencias catastrales y el fichero geoJson del Sigpac con toda la info
    //Output es un fichero geoJson con los recintos solicitados listo para añadir por GoogleMapps
    //Ejemplo: var miGeoJson = seleccionarParcelasSigpac (["23900A00900100","23900A01000043"], importedFileSigpac);
    
        //Si la capa SIGPAC (2) no es editable (false) no permito incluir nuevas capas
        if (!layersControl[2].flagEditable) {
            console.log("seleccionarParcelasSigpac: la capa SIGPAC esta NO editable");
            return;
        }
        //------------------------------------------------ 
    
        //0. compruebo que se han pasado los argumentos obligatorios
        if (!ficheroGeoJson || !refCats) return null

        //Si es un string solo lo meto como el [0] de un Array
        if (typeof refCats === 'string'){refCats=[refCats];}
        
        //Variables locales e inicializacion
        var geoJson = new Object;             //Declaro un objeto tipo geoJson vacio, sin features 
        geoJson.type = "FeatureCollection";   //Tengo que incluir este atributo para que sea un geoJson y lo coja googleMaps en addGeoJson()

        refCats.forEach(refCatastral => {
            //1. Extraigo los parametros de la Referencia catastral. Ejemplo:23900A01000045 (14 minimo de RC)
            var provincia = refCatastral.substr(0, 2);
            var municipio = refCatastral.substr(2, 3);
            var sector = refCatastral.substr(5, 1);         //No se necesita para esta consulta en concreto
            var poligono = refCatastral.substr(6, 3);
            var parcela = refCatastral.substr(9, 5);  
            
            //2. Filtro el fichero para extraer los datos de esta refCat
            var filtrado = ficheroGeoJson.features.filter(feature =>
                feature.properties.CD_POL==poligono && feature.properties.CD_PARCELA==parcela  
                && feature.properties.CD_MUN==municipio && feature.properties.CD_PROV==provincia  
            );
            
            //3. Incluyo las nuevas features en el listado existente del nuevo fichero geoJson
            !geoJson.features ? geoJson.features=filtrado : geoJson.features = geoJson.features.concat(filtrado);
            
        });       

        return geoJson;
    }

    function mostrarParcelasSigpac (geoJson){
    //Muestra el geoJson pasado en el mapa
    //Input el fichero geoJson extraido del Sigpac con la info de las RCs seleccionadas
    //Output objeto devuelto por la funcion 
    //Ejemplo: mostrarParcelasSigpac (miGeoJson);
        
        //0. compruebo que se han pasado los argumentos obligatorios
        if (!geoJson) return null

        //2. Incluyo el nuevo geoJson en la capa map.data
        var output = map.data.addGeoJson(geoJson);

        //3. Hago visibles las features con un color style personalizado. Recorro cada feature y asigno un fillColor segun su CD_USO
        showSIGPAC();

        //4. Incluyo un listener generico para la capa que resalte la feature clickada
        //Al pasar el raton se realza el recinto con opacity=1 ...
        map.data.addListener('mouseover', function(event) {
            if (!layersControl[2].flagClickable) return;                //Flag global que inhibie los listener cuando no SIGPAC no es seleccionable
            
            map.data.overrideStyle(event.feature, {fillOpacity: 1 });
        });
        map.data.addListener('mouseout', function(event) {
            if (!layersControl[2].flagClickable) return;                //Flag global que inhibie los listener cuando no SIGPAC no es seleccionable

            !!geoJsonDefaultOptions.fillOpacity? opacity= geoJsonDefaultOptions.fillOpacity : opacity= 0.5; 
            map.data.overrideStyle(event.feature, {fillOpacity: opacity });
        });
        //Al hacer click muestra una infoWindow con el parametro seleccionado en el desplegable
        map.data.addListener('click', function(event) {
            if (!layersControl[2].flagClickable) return;                //Flag global que inhibie los listener cuando no SIGPAC no es seleccionable            
            //Muestro ese parametro en la infoBox
            document.getElementById("info-box").innerHTML=event.feature.getProperty(selectedOption);
        });

        return output;
    }

    function importarFichero(e) {
    //Lee un fichero de texto seleccionado por el usuario       
    //Importo el contenido del fichero de texto en la variable gloabl importedFileSigpac
    //No puedo acceder a la ruta del fichero, y solo el usuario puede elegir los ficheros (por seguridad en javascript)
    //ToDo: gestionar carga multiple de ficheros
        if (!e.files[0]) return                 //Si no hay achivo m salgo sin hacer nada
    
        //Declaro el callback de la lectura del fichero y lo cargo en importFile
        var reader = new FileReader();
        document.getElementById('content-text').textContent = "Fichero: "+e.files[0].name;
        reader.onload = function (e) {
            importedFileSigpac= JSON.parse(e.target.result);          
            document.getElementById('content-text').textContent += "\nFichero importado";
            console.log("Fichero importado");

            //Lo meto aqui para que sea mas directo el proceso pinchando un solo boton
            //toDo: Pensar la logica y sacar esto de esta funcion !!
            //Extraigo las RCs que me interesan y construyo mi propio geoJson
            var miGeoJson = seleccionarParcelasSigpac (["23900A00900100","23900A01000043"], importedFileSigpac);

            //Muestro el fichero generado
            map.data.setStyle(geoJsonDefaultOptions);       //me aseguro de que se hayan cargado los valores por defecto (zIndex, por ejemplo)
            mostrarParcelasSigpac (miGeoJson);
        };
        //Lanzo la lectura del fichero (asincrona)
        reader.readAsText(e.files[0]);                //Lee xml, json
    }    

    function hideSIGPAC() {
    //Hace no visibles todas ls recintos de de la capa map.data
        map.data.setStyle({visible: false});
    }

    function showSIGPAC() {
    //Hace visible todos los recintos, aplicando la personalizacion de nuevo
    //Esta funcion (setStyle) es llamada cada vez que se incluye algo nuevo en map.data. No solo en este momento
        //map.data.setStyle(geoJsonDefaultOptions);
        map.data.setStyle(function(feature) {
            //Determino el color en base al tipo de uso del suelo
            var style = {
                fillColor:  colorByUso[feature.getProperty('CD_USO')],  //colorByUso es un Objeto global constante que signo un color a cada uso
                fillOpacity:    0.5,
                visible:        true,           
                zIndex:         zIndexOffset,
            };
            return style;
        });
        zIndexOffset++;    
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

    function combineOptions (overrides, defaults) {
    // Combine two options objects: a set of default values and a set of override values 
        var result = {};
        if (!!overrides) {
            for (var prop in overrides) {
                if (overrides.hasOwnProperty(prop)) {
                    result[prop] = overrides[prop];
                }
            }
        }
        if (!!defaults) {
            for (prop in defaults) {
                if (defaults.hasOwnProperty(prop) && (result[prop] === undefined)) {
                    result[prop] = defaults[prop];
                }
            }
        }
        return result;
    };