/* Barra de herramientas de dibujo en Google Maps

1. Crea un mapa impio solo con la botonera de dibujo
2. Gestiona la activacion y la desactivacion de la edicion de los overlays creados

//V2
3. 

*/

//Variables globales
var map;                            //Controlador del Mapa
var drawingManager;                 //Controlador del toolbar 
var selectedShape = null;           //Variable global que recoge la forma seleccionada si hay alguna (o null)
var ruta;
var puntos;

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
        //TODO: probando cuando intercalo un marker si deselecciona
        clearSelection();
        if (shape.type !== 'marker') {
            //clearSelection();
            shape.setEditable(true);
        }                
        selectedShape = shape;
    }
    
    function deleteSelectedShape () {
    //Borra del mapa la forma seleccionada, overlay
    //Listener que se llama cuando se hace dobleclick en el mapa
        if (selectedShape) {
            selectedShape.setMap(null);     
        }
    }
    
    // Ahora creo el listener cuando se completa un nuevo overlay, onclick (editar), y rightclick (borrar)
    google.maps.event.addListener(drawingManager, 'overlaycomplete', 
        function (e) {
            var newShape = e.overlay;                           //Es una variable interna, ?Hacerlo Global para usarlo fuera?                  
            newShape.type = e.type;
            if (newShape.type == "marker") {
                console.log ("Lat: " + newShape.getPosition().lat());           //Ejemplo de accin especifica con el marker
            }

            //drawingManager.setDrawingMode(null);                  //Desactivo la barra de herramientas                            
            
            //Creo los listener onclick (editar), y rightclick (borrar)
            overlayEditable(newShape);
            setSelection(newShape);                                 //Activo la edicion del overlay creado por defecto
        }
    );

    //CReo los listener del objeto recien creado para que sea editable: onclick (editar), y rightclick (borrar)
    
    function overlayEditable(newShape){
    //Crea los listener a un objeto de dibujo para
    //onclick: objeto seleccinado y editable
    //rightclick: eliminar objeto

        google.maps.event.addListener(newShape, 'click',        //Creo el listener de onclick (activar edicion del overlay) 
            function (e) {                  
                setSelection(newShape);
            }
        );

        google.maps.event.addListener(newShape, 'rightclick',   //Creo el listener de dbclick (eliminar overlay) 
            function (e) {
                setSelection(newShape);                         //Selecciono el overlay clickado a borrar                      
                deleteSelectedShape(newShape);                  //Mando borrarlo
            }
        );
    }

    //Creo un listener para chequear cuando se cambia el tipo de tool
    google.maps.event.addListener(drawingManager, 'drawingmode_changed', function () {
        if (drawingManager.drawingMode==null){
            clearSelection();
        }
    });

    // Lanzo al mapa la barra de dibujo
    drawingManager.setMap(map);

    //TODO: revisar cuando se selecciona marker no se deselecciona la ultima overlay
    //Revisar que funcione 100% bien, corner cases


    function creaPuntos (){
    //Crea un conjunto de puntos y una polilinea que los une para pruebas y los pone en el mapa (map)
    //Devuelve un array de puntos tipo LatLng(), y una poliinea (global ruta) que los une
    
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
        ruta = new google.maps.Polyline({
            path: misPuntos,
            strokeColor: "white",
            strokeOpacity: 0.5,
            map: map
        });

        //Creo un array de markers con los puntos 
        //Creo los listener onclick (editar), y rightclick (borrar)
        
        var misMarkers = [];
        for (var i=0; i< misPuntos.length;i++){
            misMarkers.push ( new google.maps.Marker({
                position: {lat: misPuntos[i].lat(), lng: misPuntos[i].lng()},
                map: map,
                title: "Marcador" + i,
                editable: true,             //Modificable
                draggable: true,             //Movible
              })
            );
        }

        //Devuelvo el array de puntos
        //return misPuntos;
        return misMarkers;
    }

    //Creo una ruta de puntos de ejemplo para trabajar con ella
    puntos = creaPuntos();
        console.log("Punto[0]:" + puntos[0].getPosition().lat());

    //PRUEBAS: Determino los bordes de la forma seleccionada
    function perimetro(){
    //Determina la polilinea que delimita la forma elegida
        const coordenadas = new google.maps.LatLng(37.853, -3.734);
        const triangleCoords = [
            {lat: 37.8525, lng: -3.733},
            {lat: 37.8535, lng: -3.734},
            {lat: 37.8525, lng: -3.735}
            ];  
        myShape = new google.maps.Polygon({paths: triangleCoords});
        
        //Uso la funcion de google.maps para evaluar si esta dentro del polygon myShape
        var flag = google.maps.geometry.poly.containsLocation(coordenadas, myShape);
            console.log("Coordenas estan dentro?: " + flag);

        var aux = myShape.getBounds();
        var aux1 = myShape.getBounds().contains(cordenadas);
        
        
    }
    
    perimetro();

}
    



//------------------------------------------//
//      Mis Notas de codigo a reutilizar    //
//------------------------------------------//
/*
//Dos tipos de listener se disparan cada vez que se crea un overlay (elemento dibujado)
google.maps.event.addListener(drawingManager, 'circlecomplete', function(circle) {
  var radius = circle.getRadius();
});

google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
  if (event.type == 'circle') {
    var radius = event.overlay.getRadius();
  }
});

//Puedo meter un listener cuando cambia una propiedad del overlay
//Asi por ejemplo, volver a revisar los objetos superpuestos
    google.maps.event.addListener(drawingManager, 'circlecomplete', function (circle) {
        google.maps.event.addListener(circle, 'radius_changed', function () {
            console.log('radius changed');
        });
    });

*/