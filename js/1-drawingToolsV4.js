/* Barra de herramientas de dibujo en Google Maps

1. Crea un mapa impio solo con la botonera de dibujo
2. Gestiona la activacion y la desactivacion de la edicion de los overlays creados
3. Creo una serie de puntos en el mapa (no son "Marker", no se bien por que) para jugar a contarlos
4. Creo una funcion generica que calcula los puntos de un array dentro de un overlay el que sea
5. Cargo un objeto geoJson en la capa data del map
6. Seleccion multiple de overlays cuando tengo CTRL pulsado (y borrado multiple si dblclick con boton pulsado)
7. Icono de marker redondo y se resalta al seleccionar
8. Funcion para copiar los objetos seleccionados (boton copiar en formulario)
9. 

*/
console.log("Arranca el script drawingToolsV4");

//Variables globales
var map;                            //Controlador del Mapa
var drawingManager;                 //Controlador del toolbar 
var selectedShapes = [];           //Array global que recoge las formas seleccionadas si hay alguna
var selectingFlag = false           //Detecto si tengo CTRL pulsado y activo seleccion multiple

var migeoJSON;                      //Solo puedo llamar a funciones externas a initMap() desde un objeto global fuera de InitMap()
var ruta;
var puntos;


function initMap() {
//Esta funcion es el callback cuando se carga el API de Google
//Tambien crea la barra de dibujo y sus listeners (click(editar), rightclick(borrar)) 

    //1. MAPA: Configuro el objeto mapa y los valores por defecto
    map = new google.maps.Map(document.getElementById("map_canvas"), {
        center: {lat: 37.852, lng: -3.729}, //El Caimbo
        zoom: 16,                           
        mapTypeId: "satellite",	            //"terrain", "roadmap", "hybrid", "false" (no pinta nada pero funciona)
        zoomControl: false,                 //Desactivo boton del tipo de mapa para tener un mapa mas limpio                  
        mapTypeControl: true,              //Desactivo boton del zoom para tener un mapa mas limpio
        scaleControl: true,
        rotateControl: true,                     
        streetViewControl: false,           //Sin el control de Streetview                
        fullscreenControl: false,           //Sin boton de full screen (es igual con F11)
        disableDoubleClickZoom: true        //Elimino el zoom de dblclick porque uso esto para borrar overlays
    });

    //Creo un listener DOM para saer cuando se aprieta el Ctrl (seleccion multiple)
    google.maps.event.addDomListener(document.getElementById("map_canvas"), 'keydown', 
        function (e) {
            selectingFlag = ((e.ctrlKey == true) || (e.keyIdentifier == 'Control') );
            console.log("Key pressed again");
        }
    );
    google.maps.event.addDomListener(document.getElementById("map_canvas"), 'keyup', 
        function (e) {
            selectingFlag = false;
        }
    );

    //Creo una ruta de puntos de ejemplo para trabajar con sus puntos
    puntos = creaPuntos()[0];
    ruta = creaPuntos()[1];

    //2. TOOLBAR: Configuro el objeto drawingManager y los valores por defecto
    //Se requiere la libreria drawing para este objeto en la llama al API
    
    //Configuro un conjunto de opciones comunes a todos los controles del toolbar por defecto
    var multiOptions = {
        //fillColor: '#ffffff',     //Color de relleno
        //fillOpacity: 0.5,         //Transparencia
        //strokeWeight: 5,          //Ancho del borde 
        editable: true,             //Modificable
        draggable: true,             //Movible
    };

    //Creo el controlador de la barra de herramientas con las opciones por defecto  
    drawingManager = new google.maps.drawing.DrawingManager({
        //drawingMode: google.maps.drawing.OverlayType.MARKER,      //Por defecto activa el marker
        drawingControl: true,                                       //Hace visible la barra de drawing   
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
            drawingModes: ['marker', 'circle', 'polygon', 'polyline', 'rectangle']
        },
        markerOptions: multiOptions,
        polylineOptions: multiOptions,
        rectangleOptions: multiOptions,
        circleOptions: multiOptions,
        polygonOptions: multiOptions,
        //markerOptions: {icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png'},
    });
  

    // Ahora creo el listener cuando se completa un nuevo overlay, onclick (editar), y rightclick (borrar)
    google.maps.event.addListener(drawingManager, 'overlaycomplete', 
        function (e) {
            var newShape = e.overlay;                                   //Es una variable interna, ?Hacerlo Global para usarlo fuera?                  
            newShape.type = e.type;
            if (newShape.type == "marker") { //Ejemplo de accin especifica con el marker
                //console.log ("{Lat: " + newShape.getPosition().lat().toFixed(4) 
                //    + ", Lng: " + newShape.getPosition().lng().toFixed(4) + "},"
                //);
                console.log ("[" + newShape.getPosition().lng().toFixed(4)
                    + ", " + newShape.getPosition().lat().toFixed(4) + "],"   
                );
                //Configuro el marker por defecto
                newShape.opacity= 0.2;                      //Cuando selecciono el objeto lo pongo en opacity=1 para resaltar
                newShape.setOptions({
                    "opacity": 0.5,
                    "icon": {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        strokeWeight:15,                    //Con esto mayor que scale, parece un circulo y no un aro
                        strokeColor:'black',
                    }
                });   
            }
           
            //Creo los listener onclick (editar), y rightclick (borrar)
            overlayEditable(newShape);
            setSelection(newShape);                 //Activo la edicion del overlay creado por defecto
                //console.log(e.overlay.getBounds().getNorthEast().lat());  
            
            //Calculo cuantos objetos dentro del overlay
            if (newShape.type !== "marker"){
                var contador = cuentaObjetos(puntos, newShape) || 0;               
                console.log ("Objetos seleccionados :" + contador);    //Cuenta los objetos de misMarkers dentro del nuevo polygon
                document.getElementById("info-box").innerText = "Objetos: " + contador;
                document.getElementById("content-window").innerText += "\nObjetos: " + contador;
            }
        }
    );

    //Creo un listener para chequear cuando se cambia el tipo de tool
    //Y si se selecciona la mano (null) dejo de editar
    google.maps.event.addListener(drawingManager, 'drawingmode_changed', function () {
        if (drawingManager.drawingMode==null){
            clearSelection();
        }
    });

    // Lanzo al mapa la barra de dibujo
    drawingManager.setMap(map);

    //3. DATOS: Cargo otros tipos de datos, para explorar la capa maps.data
    //A. geoJSON
    migeoJSON = migeoJSON();                    //Creo un objeto con formato geoJSON

    map.data.addGeoJson(migeoJSON);             //loadGeoJson("http...") es para cargar un archivo
    map.data.setStyle({
        visible: true,
        strokeWeight: 5
    });

    //Probando integracion con Catastro !!
    //------------------------------------

    //1. Muestro RC y su KML de las coordenadas al hacer CTRL+click en el mapa
    //Creo el listener del click en el map y llamo a ejecutar una accion con sus coordenadas
    google.maps.event.addDomListener(map, 'click', 
        function (e) {
            if (selectingFlag && drawingManager.drawingMode==null){     //Si esta apretado el [CTRL] y no esta editando formas (modo mano)
                selectingFlag=false;        //Desmarco la tecla [CTRL]
                mostrarRC(e.latLng);        //Soliciito RC al catastro y lo muestro en Visor y ventana lateral
            }
        }
    );

}


//----------------------------//
// FUNCIONES LOCALES          //
//----------------------------//

// Creo los listener para desactivar la edicion y activarla cuando se edite la forma
// Primero creo las funciones que necesitare para activar, desactivar y borrar             
    
function clearSelection () {
//Resetea la variable usada donde tengo todo lo seleccionado (selectedShapes)
//Es llamada por setSelection, por tanto, solo se desactiva un overlay cuando se activa otro	        
    if (selectedShapes.length>0) {
        for (var i in selectedShapes)
            {
                if (selectedShapes[i].type !== 'marker') {  //Los marcadores no son editales y falla si setEditable(false)
                    selectedShapes[i].setEditable(false);
                } else{
                    selectedShapes[i].setOpacity(0.5);
                } 
            }
        selectedShapes = [];                     //Reinicializo el array de elementos seleccionados
    }
}

function setSelection (shape) {
//Hago editable la forma seleccionada y actualizo la variable global (selectShape)
//Esta funcion es un listener cuando se hace click en un overlay
    
    if (!selectingFlag) clearSelection(); //si tengo pulsado el control no deselecciono lo anterior

    if (shape.type !== 'marker') {
        shape.setEditable(true);
    } else{
        shape.setOpacity(1);
    }

    selectedShapes.push(shape);
        console.log("Overlays seleccionados: " + selectedShapes.length);                
}

function deleteSelectedShapes () {
//Borra del mapa la forma seleccionada, overlay
//Listener que se llama cuando se hace dobleclick en el mapa
    
    for (var i=0; i<selectedShapes.length;i++){
        selectedShapes[i].setMap(null);
    }
    selectedShapes=[];
    selectingFlag=false;
}
    
//CReo los listener del objeto recien creado para que sea editable: onclick (editar), y dblclick (borrar)
function overlayEditable(newShape){
//Crea los listener a un objeto de dibujo para que sean editables
//onclick: objeto seleccinado y editable
//dblclick: eliminar objeto

    google.maps.event.addListener(newShape, 'click',        //Creo el listener de onclick (activar edicion del overlay) 
        function (event) {
            console.log("Seleccion multiple: " + selectingFlag);
            setSelection(newShape);
        }
    );

    google.maps.event.addListener(newShape, 'dblclick',   //Creo el listener de dblclick (eliminar overlay) 
        function () {
            setSelection(newShape);                         //Selecciono el overlay clickado a borrar                      
            deleteSelectedShapes();                         //Mando borrarlo
        }
    );

}

function cuentaObjetos(misPuntos, miOverlay) {
//Devuelve cuantos puntos del array misPuntos estan dentro de miOverlay (circle, rectangle, polygon). 
    //1. Determino que forma tiene, y en base a eso uso uno u otro algortimo de in o no
    //2. Recorro todos los puntos del array y cuento si esta dentro
    var contador = 0;    
    if (miOverlay.type == "polygon") {
        for (var i=0; i< misPuntos.length;i++){
            if (google.maps.geometry.poly.containsLocation(misPuntos[i].getPosition(), miOverlay)){
                contador++;
            }
        }    
    }else if (miOverlay.type == "circle") {
        var center = miOverlay.center;
        var radio = miOverlay.radius;
        for (var i=0; i< misPuntos.length;i++){
            if (google.maps.geometry.spherical.computeDistanceBetween (misPuntos[i].getPosition(), center) <= radio){
                contador++;
            }
        }    
    }else if (miOverlay.type == "rectangle") {
        var upLat= miOverlay.getBounds().getNorthEast().lat();
        var downLat=miOverlay.getBounds().getSouthWest().lat();
        var leftLng=miOverlay.getBounds().getSouthWest().lng();
        var rightLng= miOverlay.getBounds().getNorthEast().lng();
        for (var i=0; i< misPuntos.length;i++){
            if (misPuntos[i].getPosition().lat()<=upLat && misPuntos[i].getPosition().lat()>=downLat){
                if (misPuntos[i].getPosition().lng()<=rightLng && misPuntos[i].getPosition().lng()>=leftLng){
                    contador++;
                }
            }
        }             
    }
    return contador;
}

function creaPuntos(){
//Crea un conjunto de puntos y una polilinea que los une para pruebas y los pone en el mapa (map)
//Devuelve un array con 2 objetos: 0) array de puntos tipo LatLng(), 1) una Polilyne que los une 
//Viaulza loa puntos y la polilinea en el mapa (map)

    // Meto una serie de puntos en el punto como si fueran muestras de una ruta
    var misPuntos = [
        new google.maps.LatLng(37.852986, -3.73398),
        new google.maps.LatLng(37.853249, -3.734023) ,
        new google.maps.LatLng(37.853592, -3.73405) ,
        new google.maps.LatLng(37.853952, -3.734088) ,
        new google.maps.LatLng(37.854295, -3.734157) ,
        new google.maps.LatLng(37.854303, -3.733701) ,
        new google.maps.LatLng(37.854083, -3.733685) ,
        new google.maps.LatLng(37.853871, -3.733653) ,
        new google.maps.LatLng(37.853685, -3.733637) ,
        new google.maps.LatLng(37.853537, -3.7336) ,
        new google.maps.LatLng(37.85338, -3.7336) ,
        new google.maps.LatLng(37.853223, -3.733584) ,
        new google.maps.LatLng(37.853062, -3.733562) ,
        new google.maps.LatLng(37.852961, -3.733546) ,
        new google.maps.LatLng(37.852982, -3.733299) ,
        new google.maps.LatLng(37.853329, -3.733348) ,
        new google.maps.LatLng(37.853736, -3.733412) ,
        new google.maps.LatLng(37.854096, -3.73345) ,
        new google.maps.LatLng(37.854299, -3.733471) ,
        new google.maps.LatLng(37.854176, -3.733235) ,
        new google.maps.LatLng(37.854028, -3.733004) ,
        new google.maps.LatLng(37.853952, -3.732849) ,
        new google.maps.LatLng(37.853952, -3.732849) 
    ];

    // Meto una polilinea que una los puntos del heatmap y asigno a la variable global         
    var ruta = new google.maps.Polyline({
        path: misPuntos,
        strokeColor: "white",
        strokeOpacity: 0.5,
        draggable: true,
        map: map
    });

    //Creo un array de markers con los puntos     
    var misMarkers = [];
    for (var i=0; i< misPuntos.length;i++){
        //Creo un marker por cada coordenada de puntos anterior
        misMarkers.push ( new google.maps.Marker({
            position: {lat: misPuntos[i].lat(), lng: misPuntos[i].lng()},
            map: map,
            title: "Marcador" + i,
            editable: true,             //Modificable
            draggable: true,            //Movible
            //icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',  //Icono azul (red, yellow, green, purple )
            opacity: 0.6,               //Cuando selecciono el objeto lo pongo en opacity=1 para resaltar
            icon: {
                path: google.maps.SymbolPath.CIRCLE,    //Icono predefinido como circulo
                scale: 5,                              
                strokeWeight:6,                         //Con el grosor de linea tan grande parece un circulo
                strokeColor:'white'                     //Color por defecto azul
            }            
            })
        );
    }

    //Devuelvo el array de puntos
    //return misPuntos;
    return [misMarkers, ruta];
}

function migeoJSON(){
//Devuelvo un fichero geoJSON con puntos y una liena de ejemplo
    var geoJSON={
        "type": "Feature",
        "geometry": 
        {
            "type": "GeometryCollection",
            "geometries": 
            [
                {
                "type": "Point",
                "coordinates": [-3.7305, 37.8527]
                },
                {
                "type": "LineString",
                "coordinates": 
                    [
                        [-3.7309, 37.8525], 
                        [-3.7296, 37.8526]
                    ]
                }
            ]
        },
        "properties": 
        {
            "name": "null island"
        }
    };
    return geoJSON;
}

function copiarOverlays(){
//Hace una copia de los overlays que se le pasen en un array. Con un desplazamiento respecto al original
//Devuelve un array con la copia de los objetos,
    var arrayCopiados=[];
    selectingFlag=true;                     //Para que se queden todas las copias seleccionadas

    for (var i in selectedShapes){
        const OFFLAT= 0.0003;
        const OFFLNG= 0.0003;
        var molde = selectedShapes[i];          //Copio la ubicacion a partir del objeto seleccionado
        
        //Creo un elemento nuevo y le asigno los para metros de la copia
        if (molde.type == "marker"){
            //Creo el objeto copia
            var nuevo = new google.maps.Marker({
                map: map,
                type: "marker",             //El objeto por defecto se crea sin este atributo !!
                position: {lat: molde.getPosition().lat()+ OFFLAT, lng: molde.getPosition().lng()+ OFFLNG},
                opacity: 0.6,               //Cuando selecciono el objeto lo pongo en opacity=1 para resaltar
                icon: molde.icon,            
                editable: true,             //Modificable
                draggable: true,            //Movible
            });

            //Asigno los listener para hacerlo editable
            overlayEditable(nuevo);
            selectedShapes[i].opacity=0.5;            

        } else if (molde.type == "circle"){
            //Creo el objeto copia
            var nuevo = new google.maps.Circle({
                map: map,
                type: "circle",             //El objeto por defecto se crea sin este atributo !!
                center: {lat: molde.center.lat()+ OFFLAT, lng: molde.center.lng()+ OFFLNG},
                radius: molde.radius,
                editable: true,             //Modificable
                draggable: true,            //Movible
              });

            //Asigno los listener para hacerlo editable
            overlayEditable(nuevo);
            selectedShapes[i].setEditable(false);      

        } else if (molde.type == "polygon"){
            //Creo el objeto copia
            var nuevo = new google.maps.Polygon({
                map: map,
                type: "polygon",                                          //El objeto por defecto se crea sin este atributo !!
                paths: molde.getPaths(),
                editable: true,             //Modificable
                draggable: true,            //Movible
              });

            
            for (var j=0, miPath=[]; j<nuevo.getPaths().getAt(0).length;j++){         //Recorro cada vertice de la copia para desplazarlo
                miLat =  molde.getPaths().getAt(0).getAt(j).lat() + OFFLAT; 
                miLng =  molde.getPaths().getAt(0).getAt(j).lng() + OFFLNG;
                miPath.push({lat: miLat,lng: miLng});
            }
            nuevo.setPaths(miPath);

            //Asigno los listener para hacerlo editable
            overlayEditable(nuevo);
            selectedShapes[i].setEditable(false);

        } else if (molde.type == "rectangle"){
            //Creo el objeto copia
            var nuevo = new google.maps.Rectangle({
                map: map,
                type: "rectangle",                                          //El objeto por defecto se crea sin este atributo !!
                bounds: {                                                   //Desfaso las coordenadas respecto al molde original
                    north: molde.getBounds().getNorthEast().lat() + OFFLAT,
                    south: molde.getBounds().getSouthWest().lat() + OFFLAT,
                    east: molde.getBounds().getNorthEast().lng() + OFFLNG,
                    west: molde.getBounds().getSouthWest().lng() + OFFLNG
                  },
                editable: true,             //Modificable
                draggable: true,            //Movible
              });

            //Asigno los listener para hacerlo editable
            overlayEditable(nuevo);
            selectedShapes[i].setEditable(false);  

        } else if (molde.type == "polyline"){
            //Creo el objeto copia
            var nuevo = new google.maps.Polyline({
                map: map,
                type: "polyline",                                          //El objeto por defecto se crea sin este atributo !!
                path: molde.getPath(),
                editable: true,             //Modificable
                draggable: true,            //Movible
                });

            for (var j=0, miPath=[]; j<nuevo.getPath().length;j++){         //Recorro cada vertice de la copia para desplazarlo
                miLat =  molde.getPath().getAt(j).lat() + OFFLAT; 
                miLng =  molde.getPath().getAt(j).lng() + OFFLNG;
                miPath.push({lat: miLat,lng: miLng});
            }
            nuevo.setPath(miPath);

            //Asigno los listener para hacerlo editable
            overlayEditable(nuevo);
            selectedShapes[i].setEditable(false);    

        }

        //Voy almacenando en el array de salida los nuevos elementos copiados
        arrayCopiados.push(nuevo);
    }
    //Marco como seleccionados los elementos recien creados
    selectedShapes=arrayCopiados;

    selectingFlag=false;                                    //Lo desactivo una vez hecha la copia
    return arrayCopiados;

}


function mostrarRC(miLatLng){
//TODO: ejecuta una accion con las coordenadas pasadas: pintar en ventana resultados y la RefCatastral *consulta catastro) en el visor
    //1. Muestra las coordenadas en la ventana lateral
    document.getElementById("content-window").innerText +=  "\nLat: " + Math.round(miLatLng.lat()*1000)/1000
                                                            +"\nLng: " + Math.round(miLatLng.lng()*1000)/1000;
    //Solicito la RC del Catastro para esas coordenadas y la muestro en el visor
    refCatastralCoordenadas(miLatLng, function(respuesta){
        //2. Muestro el RC en el visor inferior 
        document.getElementById("info-box").innerText=respuesta;
        
        //3. Muestro la capa KML en el mapa
        geoXmlNew = new geoXML3.parser({
            map: map,
            singleInfoWindow: true,
            afterParse: useTheData
        });
        geoXmlNew.parse("https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat="+ respuesta +"&del=23&mun=900&tipo=3d");

    });
}


//------------------------------//
//  Servicios Web del Catastro  //
//------------------------------//

/**
 * @description Devuelve las coordenadas del centroide de una referencia catatral dada por su RC
 * @param {*} refCatastral:  referencia catastral de la que obtener las coordenadas de su centroide. Es tipo string de 14 caracteres
 * @param {*} miCallback:   funcion llamada cuando obtengo la respuesta, con el parametro coordendas que es un .latLng()
 * @example     referenciaCoordenadas(caimbo, function(respuesta){console.log("RC es: "+ respuesta)});
 * 
 * @requires    conexion a internet al catastro https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx?
 * @requires    function miAjaxGet(miUrl, miCallback) 
 * @returns     Array con [nombre, lat(), lng()]     
 */
function coordenadasRefCatastral(refCatastral, miCallback){ 

    //Construyo la direccion y los parametros de la llamada al catastro
    let url="https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC?Provincia=&Municipio="
    +"&SRS=EPSG:" + "4326"                     //Sistemas de coordenadas usado por googleMaps
    +"&RC=" + refCatastral;
    
    //Llamo al catastro y espero la respuesta para actualizar la variable de salida
    miAjaxGet(url, function(respuesta){
        if (respuesta!= -1){
            console.log("JSON del catastro recibido " + respuesta.responseXML);
            miCallback([respuesta.responseXML.all[13].innerHTML,        // Nombre (ldt)
                        respuesta.responseXML.all[11].innerHTML,        // lat()    
                        respuesta.responseXML.all[10].innerHTML]);      // lng()
        }
        else{
            console.log("Error servidor catastro");
            miCallback(respuesta);                  //refCatastral devuelta es -1
        }    
    });
}

/**
 * @description Devuelve la referencia catastral de unas coordenadas
 * @param {*} coordenadas:  coordenadas del punto al que calcular RefCatastral. Es tipo .latLng(), i.e. {lat: 37.8555 ,lng:-3.7555}
 * @param {*} miCallback:   funcion llamada cuando obtengo la respuesta, con el parametro refCastastral que es un String (14 digitos)
 * @example     referenciaCoordenadas(caimbo, function(respuesta){console.log("RC es: "+ respuesta)});
 * 
 * @requires    conexion a internet al catastro https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx?
 * @requires    function miAjaxGet(miUrl, miCallback) 
 * @returns     (modficacion) nombre de la parcela tambien se podria devolver si se llama al callback con respuesta.responseXML.all[13].innerHTML     
 */
function refCatastralCoordenadas(coordenadas, miCallback){ 

    //Construyo la direccion y los parametros de la llamada al catastro
    let url="https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR?"
    +"SRS=EPSG:" + "4326"                     //Sistemas de coordenadas usado por googleMaps
    +"&Coordenada_X=" + coordenadas.lng()  
    +"&Coordenada_Y=" + coordenadas.lat();
    
    //Llamo al catastro y espero la respuesta para actualizar la variable de salida
    miAjaxGet(url, function(respuesta){
        if (respuesta!= -1){
            console.log("JSON del catastro recibido " + respuesta.responseXML.all);
            miCallback(respuesta.responseXML.all[7].innerHTML+respuesta.responseXML.all[8].innerHTML);
        }
        else{
            console.log("Error servidor catastro");
            miCallback(respuesta);                  //refCatastral devuelta es -1
        }
            
    });
}

/**
 * @description Llamada asincrona con Http GET al servidor (miUrl) para llamar con la respuesta recibida a miCallback cuando este disponible
 * @param {*} miUrl         Direccion del servidor que recibe el GET y presta el servicio
 * @param {*} miCallback    Funcion que recibe como parametro l arespuesta del servidor al GET y que es llamada asincronamente
 * @example     miAjaxGet("http://localhostx:3000/imagenes", function(respuesta){ console.log("La respuesta es " + respuesta); });
 * 
 * @returns     devuelve -1 si hay un error del servidor y no responde Ok. Si todo OK devuelve lo que se le pasa (JSON, XML, ...)
 */
function miAjaxGet(miUrl, miCallback) {

    var request = new XMLHttpRequest(); 
    request.open("GET", miUrl, true);                       //Asincrona = true
    
    //Creo el listener que llama a 'miCallback'
    request.addEventListener("load", function() {
    if (request.status >= 200 && request.status < 400) {    //Status ha ido bien
        miCallback(request);                                //Llamo a miCallback con la respuesta    
    } else {
        miCallback(-1);                                     //Devuelve -1 en caso de error 
        console.error("miAjaxGET error: " + request.status + "- " + request.statusText); //Error de servidor
    }
    });

    //Creo el listener que gestiona los errores 
    request.addEventListener("error", function(){
        miCallback(-1);                                         //Devuelve -1 en caso de error 
        console.error("miAjaxGET error: error de conexión");        //La llamada al servidor ha fallado
    });

    //Finalmente lanzo la peticion al servidor
    request.send(null);
}
