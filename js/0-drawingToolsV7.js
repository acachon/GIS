/* Barra de herramientas de dibujo en Google Maps

1. Crea un mapa impio solo con la botonera de dibujo
2. Gestiona la activacion y la desactivacion de la edicion de los overlays creados
3. Creo una serie de puntos en el mapa (no son "Marker", no se bien por que) para jugar a contarlos
4. Creo una funcion generica que calcula los puntos de un array dentro de un overlay el que sea
5. Cargo un objeto geoJson en la capa data del map

*/

//Variables globales
var map;                            //Controlador del Mapa
var drawingManager;                 //Controlador del toolbar 
var selectedShape = null;           //Variable global que recoge la forma seleccionada si hay alguna (o null)
var ruta;
var puntos;
var migeoJSON;                      //Solo puedo llamar a funciones externas a initMap() desde un objeto global fuera de InitMap()

function initMap() {
//Esta funcion es el callback cuando se carga el API de Google
//Tambien crea la barra de dibujo y sus listeners (click(editar), rightclick(borrar)) 

    //1. MAPA: Configuro el objeto mapa y los valores por defecto
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 37.852, lng: -3.729}, //El Caimbo
        zoom: 16,                           
        mapTypeId: "satellite",	            //"terrain", "roadmap", "hybrid"
        zoomControl: false,                 //Desactivo boton del tipo de mapa para tener un mapa mas limpio                  
        mapTypeControl: false,              //Desactivo boton del zoom para tener un mapa mas limpio
        scaleControl: true,
        rotateControl: true,                     
        streetViewControl: false,           //Sin el control de Streetview                
        fullscreenControl: false            //Sin boton de full screen (es igual con F11)
    });

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
  
    // Creo los listener para desactivar la edicion y activarla cuando se edite la forma
    // Primero creo las funciones que necesitare para activar, desactivar y borrar             
        
    function clearSelection () {
    //Resetea la variable usada para saber lo seleccionado (selectedShape)
    //Es llamada por setSelection, por tanto, solo se desactiva un overlay cuando se activa otro	        
        if (selectedShape) {
            if (selectedShape.type !== 'marker') {  //Los marcadores no son editales y falla si setEditable(false)
                selectedShape.setEditable(false);
            }                    
            selectedShape = null;
        }
    }
    
    function setSelection (shape) {
    //Hago editable la forma seleccionada y actualizo la variable global (selectShape)
    //Esta funcion es un listener cuando se hace click en un overlay
        clearSelection();
        if (shape.type !== 'marker') {
            //clearSelection();
            shape.setEditable(true);
        }                
        selectedShape = shape;
    }
    
    function deleteSelectedShape (shape) {
    //Borra del mapa la forma seleccionada, overlay
    //Listener que se llama cuando se hace dobleclick en el mapa
        if (shape) {
            shape.setMap(null);     
        }
    }

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
            }

            //drawingManager.setDrawingMode(null);                      //Desactivo la barra de herramientas                            
            
            //Creo los listener onclick (editar), y rightclick (borrar)
            overlayEditable(newShape);
            setSelection(newShape);                 //Activo la edicion del overlay creado por defecto
                //console.log(e.overlay.getBounds().getNorthEast().lat());  
            
            //Calculo cuantos objetos dentro del overlay
            if (newShape.type !== "marker"){
                var contador = cuentaObjetos(puntos, newShape) || 0;               
                console.log ("Objetos seleccionados :" + contador);    //Cuenta los objetos de misMarkers dentro del nuevo polygon
                document.getElementById("info-box").innerText = "Objetos: " + contador;
            }
        }
    );

    //CReo los listener del objeto recien creado para que sea editable: onclick (editar), y rightclick (borrar)
    
    function overlayEditable(newShape){
    //Crea los listener a un objeto de dibujo para
    //onclick: objeto seleccinado y editable
    //rightclick: eliminar objeto

        google.maps.event.addListener(newShape, 'click',        //Creo el listener de onclick (activar edicion del overlay) 
            function () {                  
                setSelection(newShape);
            }
        );

        google.maps.event.addListener(newShape, 'rightclick',   //Creo el listener de dbclick (eliminar overlay) 
            function () {
                setSelection(newShape);                         //Selecciono el overlay clickado a borrar                      
                deleteSelectedShape(newShape);                  //Mando borrarlo
            }
        );

    }

    //Creo un listener para chequear cuando se cambia el tipo de tool
    //Y si se selecciona la mano (null) dejo de editar
    google.maps.event.addListener(drawingManager, 'drawingmode_changed', function () {
        if (drawingManager.drawingMode==null){
            clearSelection();
        }
    });

    // Lanzo al mapa la barra de dibujo
    drawingManager.setMap(map);

    //Cargo otros tipos de datos, para explorar la capa maps.data
    //1. geoJSON
    migeoJSON = migeoJSON();                    //Creo un objeto con formato geoJSON

    map.data.addGeoJson(migeoJSON);             //loadGeoJson("http...") es para cargar un archivo
    map.data.setStyle({
        visible: true,
        strokeWeight: 5
    });

    //2. KLM

    //3. FusionTables


}


// FUNCIONES GLOBALES         //
//----------------------------//

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
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'  //Icono azul (red, yellow, green, purple )
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

/*TODO: probar esta funcion para recuperar las coordenadas (o otra property) de cada feature del geoJSON
var eid = 30;

map.data.forEach(function(feature){
    if(feature.getProperty('eid') === eid){
        LatLng = feature.getGeometry().get();
        id = feature.getProperty('id');

        //Elimina esa feature del map.data
        map.data.remove(feature);
    } 
  });
  */