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

var tapaMapa;                       //Rectangulo como la peninsula que tapa el mapa entero

var selectedOption="CD_RECINTO";    //Propiedad seleccionada en el html por el usuario

// Gestion de capas //
const layersOptions = {
//Iconos e informacion estatica para el menu de control de capas
    iconViewable:       "./img/visible.png",
    iconNotViewable:    "./img/visible.png",
    
    iconClickable:       "./img/seleccionar.png",
    iconNotClickable:    "./img/seleccionar.png",

    iconEditable:       "./img/edit.png",
    iconNotEditable:    "./img/edit.png",
};

var layersControl = [
//Informacion de cada capa gestionada, incluyendo su estado.
    {   layerID:        0,
        layerName:      "Mapas",
        flagViewable:   true,
        flagClickable:  false,
        flagEditable:   true,
    },
    {   layerID:        1,
        layerName:      "Catastro",
        flagViewable:   true,
        flagClickable:  true,
        flagEditable:   false,
    },
    {   layerID:        2,
        layerName:      "SIGPAC",
        flagViewable:   true,
        flagClickable:  true,
        flagEditable:   true,
    },
];

//----------------------------//
// FUNCION INICIALIZAR        //
//----------------------------//

function initMap() {
//Esta funcion es el callback cuando se carga el API de Google
//Tambien crea la barra de dibujo y sus listeners (click(editar), rightclick(borrar)) 

    //1. MAPA: Configuro el objeto mapa y los valores por defecto
    map = new google.maps.Map(document.getElementById("map_canvas"), {
        center: {lat: 37.852, lng: -3.729}, //El Caimbo
        zoom: 16,                           
        mapTypeId: "satellite",	            //"terrain", "roadmap", "hybrid", "false" (no pinta nada pero funciona)
        zoomControl: false,                 //Desactivo boton del zoom para tener un mapa mas limpio                  
        mapTypeControl: false,               //El control de tipo de mapa esta embebido en el control de capas
        scaleControl: false,
        rotateControl: false,                     
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

    //Defino un rectangulo como la peninsula para tapar el mapa cuando se quiera no visible
    tapaMapa = new google.maps.Rectangle({          //Rectangulo opaco para ocultar el mapa
        bounds: {north:44,south:35, east:5, west:-10},  //Rectangulo que cubre toda la peninsula
        editable: false, draggable: false,              //rectangulo no editale
        fillColor: "#ffffff", fillOpacity: 1,           //Blanco no traslucido
        strokeWidth: 0, strokeColor: "#ffffff",
        zIndex: 0,
    });

    /*  https://stackoverflow.com/questions/15627325/google-maps-polygon-and-marker-z-index
    The Maps API uses several layers known as MapPanes in a fixed Z order:

        4: floatPane (infowindow)
        3: overlayMouseTarget (mouse events)
        2: markerLayer (marker images)
        1: overlayLayer (polygons, polylines, ground overlays, tile layer overlays)
        0: mapPane (lowest pane above the map tiles)

        --------------------------------------------------------
        var globalZIndex = 1; //Be sure you can access anywhere
        //... Other instructions for creating map, polygon and any else
        polygon.setOptions({ zIndex: globalZIndex++ });
        Notice that markers have a method setZIndex(zIndex:number).
    
    */

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

    //-------------------------------------------------------------//
    // Ejemplo de otro tipo de datos, GeoJSON. No lo uso por ahora //
    //-------------------------------------------------------------//
    //-------------------------------------------------------------------------------------------------//
    //3. DATOS: Cargo otros tipos de datos, para explorar la capa maps.data
    //A. geoJSON
    migeoJSON = migeoJSON();                    //Creo un objeto con formato geoJSON

    map.data.addGeoJson(migeoJSON);             //loadGeoJson("http...") es para cargar un archivo
    map.data.setStyle({
        visible: true,
        strokeWeight: 5,
        zIndex: 2,                              //Asi tapaMapa esta por debajo
    });
    //map.data.setStyle(geoJsonDefaultOptions);
    
    //-------------------------------------------------------------------------------------------------//

    //Probando integracion con Catastro !!
    //------------------------------------

    //1. Muestro RC y su KML de las coordenadas al hacer CTRL+click en el mapa
    //Creo el listener del click en el map y llamo a ejecutar una accion con sus coordenadas
    google.maps.event.addDomListener(map, 'click', 
        function (e) {
            if (selectingFlag && drawingManager.drawingMode==null){     //Si esta apretado el [CTRL] y no esta editando formas (modo mano)
                selectingFlag=false;                    //Desmarco la tecla [CTRL]
                mostrarRefCatastral(e.latLng);          //Soliciito RC al catastro y lo muestro en Visor y ventana lateral
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
        strokeColor: "red",
        strokeOpacity: 0.5,
        draggable: true,
        map: map,
        zIndex: zIndexOffset++,               //tapaMapa tiene asignado por defecto zIndex: 0 para estar por debajo de todo
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
                strokeColor:'pink'                     //Color por defecto azul
            },
            zIndex: zIndexOffset++,            
            })
        );
    }

    //Devuelvo el array de puntos
    //return misPuntos;
    return [misMarkers, ruta];
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
                zIndex: zIndexOffset++,
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
                zIndex: zIndexOffset++,
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
                zIndex: zIndexOffset++,
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
                zIndex: zIndexOffset++,
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
                zIndex: zIndexOffset++,
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

// Funcion que se usa solo a modo de ejemplo de otra forma de importar datos //
//---------------------------------------------------------------------------//
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

//------------------------------//
//  Servicios Web del Catastro  //
//------------------------------//

/**
 * @description la referencia catastral de unas coordenadas (Consulta_DNPPP_Codigos)
 * @param {*} refCatastral: RefCatastral de la parcela a consultar sus subparcelas y cultivos. Es tipo string 14 digitos
 * @param {*} miCallback:   funcion llamada cuando obtengo la respuesta, con el objeto "cultivos{}" procesado ya con procesarCultivos(responseXML)
 * @example     cultivosRefCatastral("23900A01500005", function(respuesta){console.log("Los cultivos: "+ respuesta)});
 * 
 * @requires    conexion a internet al catastro https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos?
 * @requires    function miAjaxGet(miUrl, miCallback),  
 * @returns     Devuelve un objeto con los cultivos de cada recinto de una parcela     
 */
function cultivosRefCatastral(refCatastral, miCallback){ 
    //0. Declaro la funcion interna que procesa el XML recibido de Catastro
    function procesarXmlCultivos (responseXML){
    //Busco la informacion necesaria en el XML y devuelvo un Objeto de cultivos solo con esto

        //Si el XML recibido es -1 es que hubo un error al importar, no hago nada!!
        if (responseXML==-1) return (null)

        //0. Estructura de salida para el listado de cultivos de una parcela    
        var cultivos = {
            refCastastral:  "",     //23900A01000045
            descripcion:    "",     //Polígono 10 Parcela 45, JAEN (JAÉN)
            nombre:         "",     //Caimbo
            subparcelas:     [{
                subID:      "",            //a
                cultivoID:  "",            //OR
                cultivo:    "",            //Olivos regadio
                intensidad: "",            //03 (ip, intensidad productiva)
                superficie: "",            //196566 (ssp, metros cuadrados)
            }],
            agregado:       [{      //Atributo calculado agregando las subparcelas (recintos)
                cultivoID:  "",         //codigo tipo cultivo
                cultivo:    "",         //tipo de cultivo
                superficie: "",         //Agregado de superficies para ese cultivo
                recintos:   "",         //contador numero de recintos con ese cultivo
            }],
            superficie:     "",     //Atributo calculado como la suma de las superifices de los recintos o subparcelas
        }
        //Varibales internas para carga masiva de datos de subparcelas
        var subID=      [];            //a
        var cultivoID=  [];            //OR
        var cultivo=    [];            //Olivos regadio
        var intensidad= [];            //03 (ip, intesidad productiva)
        var superficie= [];            //196566 (ssp)
    
    
        //1. Recupero los campos sencillos que son comunes a la parcela
        cultivos.refCastastral  =responseXML.getElementsByTagName("pc1")[0].innerHTML+responseXML.getElementsByTagName("pc2")[0].innerHTML;
        cultivos.descripcion    =responseXML.getElementsByTagName("ldt")[0].innerHTML;
        cultivos.nombre         =responseXML.getElementsByTagName("npa")[0].innerHTML;
        
        //2. Recupero la informacion de cada subparcela y lo meto en el array
        subID       =responseXML.getElementsByTagName("cspr");
        cultivoID   =responseXML.getElementsByTagName("ccc");
        cultivo     =responseXML.getElementsByTagName("dcc");
        intensidad  =responseXML.getElementsByTagName("ip");
        superficie  =responseXML.getElementsByTagName("ssp");
    
        //3. Lo meto ahora ordenado como un array de objetos
        cultivos.subparcelas=[]; //Inicializo el array para que el primer psuh vaya al [0]
        
        for (var i=0; i<subID.length; i++){     //El primero viene siempre vacio, por eso empiezo en 1
            cultivos.subparcelas.push({
                subID:      subID[i].innerHTML,       
                cultivoID:  cultivoID[i].innerHTML,   
                cultivo:    cultivo[i].innerHTML,     
                intensidad: intensidad[i].innerHTML,            
                superficie: superficie[i].innerHTML,              
            });
        }

        //4. Calculo un agregado por tipo de cultivo a partir de las subparcelas (recintos)
        /*
        var agregadoCultivos = [{
            cultivoID,          //codigo tipo cultivo
            cultivo,            //tipo de cultivo
            superficie,         //Agregado de superficies para ese cultivo
            recintos,           //contador numero de recintos con ese cultivo
        }];
        */
        var agregadoCultivos=[];    
        cultivos.superficie = 0;    //Lo inicializo como numero

        cultivos.subparcelas.forEach(subparcela => {    //Recorro todas las subparcelas
            //Miro si el tipo de cultivo ya existe
            flagNuevo=true;
            agregadoCultivos.forEach(agregado => {      
                if (agregado.cultivoID==subparcela.cultivoID){  //Si ya existe, agrego sobre el
                    agregado.superficie += parseFloat(subparcela.superficie);
                    agregado.recintos++;
                    
                    flagNuevo=false;
                    //break; //Salgo del agregadoCultivos.forEach ToDo: No me deja meter un break aqui, hay que transformarlo en un for normal
                }
            });

            if (flagNuevo){ //Si ninguno de los agregados existentes coincide con este cultivo
                //Creo un nuevo agregado al final del array
                agregadoCultivos[agregadoCultivos.length] = {
                    cultivoID:  subparcela.cultivoID,            
                    cultivo:    subparcela.cultivo,            
                    superficie: parseFloat(subparcela.superficie),         
                    recintos:   1,           
                }
            };

            //Acumulo la superficie total
            cultivos.superficie += parseFloat(subparcela.superficie);
        });        

        //Incoporo el agregado total calculado al objeto cultivos
        cultivos.agregado = agregadoCultivos;

        //5. Devuelvo esta estructura con los cultivos de la parcela
            //console.log(cultivos);
        return (cultivos);
    };

    //1. Extraigo los parametros de la Referencia catastral. Ejemplo:23900A01000045 (14 minimo de RC)
    var provincia = refCatastral.substr(0, 2);
    var municipio = refCatastral.substr(2, 3);
    var sector = refCatastral.substr(5, 1);     //No se necesita para esta consulta en concreto
    var poligono = refCatastral.substr(6, 3);
    var parcela = refCatastral.substr(9, 5);

    //2. Construyo la direccion y los parametros de la llamada al catastro
    let url="https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos?"
    //https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos?CodigoProvincia=23&CodigoMunicipio=900&CodigoMunicipioINE=900&Poligono=015&Parcela=0005
    //CodigoProvincia=23&CodigoMunicipio=900&CodigoMunicipioINE=900&Poligono=015&Parcela=0005
    +"CodigoProvincia=" + provincia  
    +"&CodigoMunicipio=" + municipio
    +"&CodigoMunicipioINE=" + municipio
    +"&Poligono=" + poligono
    +"&Parcela=" + parcela
    ;
    
    //3. Llamo al catastro y espero la respuesta para actualizar la variable de salida
    miAjaxGet(url, function(respuesta){
        if (respuesta!= -1){
                console.log("JSON del catastro recibido OK");
            //4. Proceso el XML recibido para generar un objeto tipo Cultivos{}
            var misCultivos; 
            misCultivos = procesarXmlCultivos(respuesta.responseXML);

            //5. Devuelvo el objeto Cultivos
            miCallback(misCultivos);
        }
        else{ //respuesta es -1
                console.log("Error servidor catastro");
            miCallback(respuesta);                 
        }   
    });

    //3b. Pruebo con otro funcoin equivalente a miAjaxGet que tiene el propio geoxml3
    //geoXML3.fetchXML(url, function (responseXML) { 
    //    console.log(responseXML); 
    //});
}

function mostrarRefCatastral(miLatLng){
//Muestra en la ventana lateral las coordenadas, en el visor la RefCat devuelta por catastro
//Llama a la funcion para consultar del catastro la Ref a partir de las coordenandas y visualizarlas
    //1. Muestra las coordenadas en la ventana lateral
    document.getElementById("content-window").innerText +=  "\nLat: " + Math.round(miLatLng.lat()*1000)/1000
                                                            +"\nLng: " + Math.round(miLatLng.lng()*1000)/1000;
    //Solicito la RC del Catastro para esas coordenadas y la muestro en el visor
    refCatastralCoordenadas(miLatLng, function(refCastastral){
        //2. Muestro el RC en el visor inferior 
        document.getElementById("info-box").innerText=refCastastral;
    
        //2.1 Importo la capa XML de la referencia catastral del servicio web de Catastro y lo incluyo en el mapa y geoXml
        importarXmlRefCastastral(refCastastral);

        //2.2 Importo los recintos SIGPAC de la referencia catastral del fichero importedFile y lo incluyo en el map.data
        var miGeoJson = seleccionarParcelasSigpac(refCastastral, importedFileSigpac);   //Selecciono los recintos y creo un geoJson
        mostrarParcelasSigpac (miGeoJson);                                              //Doy formato, activo listeners y pongo en el mapa
    });
}
    
function importarXmlRefCastastral(refCatastral){
//Importa del catastro la capa XML de la referencia catastral que se le solicita
//Llama a useTheData como callback para actuar tras importar la capa XML

    //Si la capa catastro (1) no es editable (false) no permito incluir nuevas capas y trae esta del catastro
    if (!layersControl[1].flagEditable) {
        console.log("importarXmlRefCastastral: la capa catastro esta no editable");
        return;
    }
    //------------------------------------------------ 
    
    if (!geoXml){                           //Si no existe ya alguna capa XML importada del catastro
        geoXml = new geoXML3.parser({
            map: map,
            singleInfoWindow: true,
            afterParse: useTheData
        });
    }
    //1. Importo la capa del catastro, la formateo y la muestor en el mapa
    geoXml.parse(
        "https://ovc.catastro.meh.es/Cartografia/WMS/BuscarParcelaGoogle3D.aspx?refcat="
        + refCatastral 
        +"&del=23&mun=900&tipo=3d"
    );
    //2. Añado la informacion de los cultivos
    cultivosRefCatastral(refCatastral, function(cultivos){
        geoXml.docs[geoXml.docs.length-1].cultivos=cultivos;
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


/** No se usa aun en esta aplicacion
 * @description Devuelve las coordenadas del centroide de una referencia catatral dada por su RC
 * No se usa de momento pero en un futuro puede ser util para centrar el mapa en una RefCat
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

//------------------------------//
//Menu desplegable de las capas //
//------------------------------//

function toogleViewable (layerID){
//Cambia de visible a no visible y viceversa el contenido de la capa indicada por su layerID
    console.log("Cambia Viewable del LayerID: " + layerID + " (" + !layersControl[layerID].flagViewable + ")");

    //funcion especifica de cada layer
    if (layerID==0){
        //Cubro el mapa con un rectangulo opaco blanco.
        layersControl[layerID].flagViewable ? tapaMapa.setMap(map) : tapaMapa.setMap(null) ;       //Show or hide
    }
    else if(layerID==1){
        //Llama al metodo interno de geoXml que muestra u oculta todos los docs
        layersControl[layerID].flagViewable ? geoXml.hideDocument() : geoXml.showDocument() ;       //Show or hide        
    }
    else if(layerID==2){
        //Para no visible basta con cambiar visible, para volverlo visible hay que recrear los fillcolor
        layersControl[layerID].flagViewable ? hideSIGPAC() : showSIGPAC() ;       //Show or hide        
    }

    //Comun a todas las capas
    layersControl[layerID].flagViewable ? src="./img/invisible.png" : src="./img/visible.png" ; //Next icon to be updated
    document.getElementById("#ver" + layerID).src=src;                                          //Cambio el icono
    layersControl[layerID].flagViewable = !layersControl[layerID].flagViewable;                 //toggle status flag
}

function toogleClickable (layerID){
//Cambia de seleccionable a no'selecccionable y viceversa el contenido de la capa indicada por su layerID
    console.log("Cambia Clickable del LayerID: " + layerID + " (" + !layersControl[layerID].flagClickable + ")");
    //funcion especifica de cada layer
    
    if (layerID==0){
        //Muestro el submenu con los mapas disponibles
        //layersControl[layerID].flagClickable? display="none": display="block" 
        //document.getElementById("myDropdown2").style.display=display;                    //Show or hide los mapas disponibles
        document.getElementById("myDropdown2").style.display!=="none"? display="none":display="block";document.getElementById("myDropdown2").style.display=display; 

    }
    else if(layerID==1){
        //Llama al metodo interno de geoXml que muestra u oculta todos los docs
        geoXml.activatePlacemarks(!layersControl[layerID].flagClickable);       //Cambia la propiedad active usada por los listerners para inhibirse
    }
    else if(layerID==1){
    //Al cambiar (toggle) el flagClickable de la capa, los listener se inhibiran porque revisan este flag antes de tomar accion
    //No hay que hacer nada mas aqui especifico para esta capa SIGPAC  
    }

    layersControl[layerID].flagClickable ? src="./img/noseleccionar.png" : src="./img/seleccionar.png"; //Next icon to be updated
    document.getElementById("#seleccionar" + layerID).src=src;                                          //Cambio el icono
    layersControl[layerID].flagClickable = !layersControl[layerID].flagClickable;                       //toggle status flag
}

function toogleEditable (layerID){
//Cambia de editable a noeditable y viceversa el contenido de la capa indicada por su layerID
    console.log("Cambia Editable del LayerID: " + layerID + " (" + !layersControl[layerID].flagEditable + ")");
    
    if (layerID==0){    //Mapas
        //Desactivo/activo la barra de dibujo (lo pongo al valor distinto al que tiene, i.e. toggle)
        drawingManager.setOptions({
            drawingMode: null,                        //Desactivo la barra antes de ocultarla y cuando la vuelvo a mostrar
            drawingControl: !layersControl[layerID].flagEditable,   //Cambio de visible a no visible y viceversa segun el flag
        });
    }
    else if(layerID==1){    //Catastro
    //Layer1 (catastro): al cambiar el flagEditable de esta layer despues de este if, inhinibe la funcion mostrar RC que importa nuevas capas de Catastro

    //Muestro info de como incluir nuevas RC en el mapa al activar edicion
    if (!layersControl[1].flagEditable) alert("Haz Ctrl+Click en el mapa para importar nuevas parcelas");                 
        
    }
    
    layersControl[layerID].flagEditable ? src="./img/noedit.png" : src="./img/edit.png";    //Next icon to be updated
    document.getElementById("#editar" + layerID).src=src;                              //Cambio el icono

    layersControl[layerID].flagEditable = !layersControl[layerID].flagEditable;           //toggle status flag
}
