//Catastreando//
//------------//
/*
    1.Cargo un overlay del catastro sobre mi mapa 
    2.El mapa actualiza la vista del catastro al cargar y con el zoom y drag
        a) Segun sea el nivel de zoom de la bounding box, el catastro devuelve distinto nivel de detalle
            zoom=13 --> Nivel Municipio
            zoom=15 --> Nivel Masa
            zoom=16 --> Nivel Parcela+Subparcela
            zoom=19 --> Nivel Construcciones
    3.  

*/

var mapa = null;        //Mi mapa sobre el canvas
var catastro = null;    //el overlay del catastro

function cargaMapa(){
    //1. Creo el mapa enmi canvas centrado en mi zona
    let urbano = new google.maps.LatLng(38.345628,-0.480759);   //Punto urbano para pruebas
    let caimbo=new google.maps.LatLng(37.852,-3.729);           //Punto rural para pruebas
    let myMapOptions = {
        zoom:       16,                                 
        center:     caimbo,                         
        mapTypeId:  google.maps.MapTypeId.ROADMAP,
        zoomControl: false,                 //Desactivo boton del tipo de mapa para tener un mapa mas limpio                  
        mapTypeControl: true,              
        scaleControl: false,
        rotateControl: false,                     
        streetViewControl: false, 
    };
    mapa = new google.maps.Map(document.getElementById("mapCanvas"), myMapOptions);
 
    //2. Creo los eventos que recargaran la vista del catastro (recalculada al nuevo bounding box)
    google.maps.event.addListener(mapa,'dragend',function(){
        overlay();
    });
 
    google.maps.event.addListener(mapa, 'zoom_changed',function(){
        overlay();
    });
 
    google.maps.event.addListenerOnce(mapa, 'tilesloaded',function(){
        overlay();
    }); 

}

//Funciones locales y metodos
//---------------------------//

function overlay(){
//Solicita y sobre pone como un overlay el mapa del catastro

    //1.'Despinta' el overlay anterior mientras recalcula para que no se duplique y maree al actualizar
    if(this.catastro != null){
        this.catastro.setMap(null)
        this.catastro = null
    }

    //2. Consulto la imagen del catastro
    //   Determino el bounding box, extremos de mi vista donde se solicita imagen catastral
    let bounds = mapa.getBounds()
    let ne = bounds.getNorthEast()
    let sw = bounds.getSouthWest()
  
    //  Consulto la imagen del catastro

    this.catastro = new google.maps.GroundOverlay(
        "http://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx?"  //Servidor del catastro
                                                                        //Documentacion API==> http://www.catastro.meh.es/servicios/wms/wms.htm
        +"SERVICE=WMS&&SRS=EPSG:4326"       //Sistema de coordenadas de Google Maps
        +"&&REQUEST=GETMAP"
        +"&&width="         +   "640"       //Resolcuion de la imagen descargada (Max 4000)
        +"&&height="        +   "480"       //Resolcuion de la imagen descargada (Max 4000)
        +"&&format="        +   "PNG"       //Formato de la imagen: JPG, GIF, BMP, (fondo blanco no transparente),TIF y WMF(no soportado por GoogleMaps) 
        +"&&transparent="   +   "Yes"       //Transparencia
        +"&&layers="        +   "CATASTRO"      //Capas(separadas por comas: CATASTRO (todas segun zoom), MASA, PARCELA, SUBPARCE, CONSTRU(construcciones), ELEMLIN (caminos y rios)    
        //+"&&layers="        +   "MASA,PARCELA,SUBPARCE,CONSTRU,ELEMLIN"      //Capas sin leyendas    
        //+"&&TIME="          +   "2018-05-13"//Historico catastral solicitado (AAAA>=2002)

        +"&&bbox="          +   sw.lng()+","+sw.lat()+","+ne.lng()+","+ne.lat()//BoundingBox de la foto
        ,mapa.getBounds()
    );

 /*   
    //Pruebo el servicio INSPIRE
    this.catastro = new google.maps.GroundOverlay(
        "http://ovc.catastro.meh.es/cartografia/INSPIRE/spadgcwms.aspx?"
        +"service=wms&request=getmap"
        +"&format=image/jpeg"
        +"&width=1000&height=1000"
        
        +"&srs=epsg:23029"
        +"&bbox=" + "512300,4663000,512500,4663200"
        //"&srs=epsg:4326"
        //"&bbox=" + sw.lng()+","+sw.lat()+","+ne.lng()+","+ne.lat()
        
        +"&layers=cp.cadastralparcel"
        ,mapa.getBounds()
    );
  */  

    //3. Refresco el mapa
    this.catastro.setMap(mapa);
}

//Mis notas     //
//--------------//
/*
Probar este servicio SIGPAC http://wms.mapama.es/wms/wms.aspx

*/
