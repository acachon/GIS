/* Barra de herramientas de dibujo en Google Maps

1. Crea un mapa impio solo con la botonera de dibujo
2. Gestiona la activacion y la desactivacion de la edicion de los overlays creados
 

*/

//Variables globales
var map;                            //Controlador del Mapa
var drawingManager;                 //Controlador del toolbar 
var selectedShape = null;           //Variable global que recoge la forma seleccionada si hay alguna (o null)

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
    
    // Ahora creo el listener cuando se completa un nuevo overlay, onclick (editar), y dblclick (borrar)
    google.maps.event.addListener(drawingManager, 'overlaycomplete', 
        function (e) {
            var newShape = e.overlay;                           //Es una variable interna, ?Hacerlo Global para usarlo fuera?                  
            newShape.type = e.type;
            if (newShape.type == "marker") {
                console.log ("Lat: " + newShape.getPosition().lat());           //Ejemplo de accin especifica con el marker
            }

            //drawingManager.setDrawingMode(null);                  //Desactivo la barra de herramientas                            
            google.maps.event.addListener(newShape, 'click',        //Creo el listener de onclick (activar edicion del overlay) 
                function (e) {                  
                    setSelection(newShape);
                });
            
            google.maps.event.addListener(newShape, 'rightclick',   //Creo el listener de dbclick (eliminar overlay) 
                function (e) {
                    setSelection(newShape);                         //Selecciono el overlay clickado a borrar                      
                    deleteSelectedShape(newShape);                  //Mando borrarlo
                });

            setSelection(newShape);                                 //Activo la edicion del overlay creado por defecto
        }
    );

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