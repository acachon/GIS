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
    
    //Pruebos las funciones del Catastro
    //1. Averiguo la referenciaCatastral de unas coordenadas (asincrono)
    refCatastralCoordenadas(caimbo, function(respuesta){
        if (respuesta!=-1) console.log("RC es: "+ respuesta)
    });

    //2. Averiguo las coordenadas del centroide de una parcela que le paso por su RC (asincrono)
    let refCastastral="23900A01000004";

    coordenadasRefCatastral(refCastastral, function(respuesta){
        console.log("laLng() es: "+ respuesta[1] + ", "+ respuesta[2]);
        console.log("La finca es: " + respuesta[0]);
    });

    //Pruebo la direccion 
    let newDir="https://www.sedecatastro.gob.es/Cartografia/DescargarGMLParcela.aspx?refcat=23900A015000050000SK&del=23&mun=900";

    miAjaxGet(newDir, function(respuesta){
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

//Funciones locales y metodos
//---------------------------//


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


    //Consulta_CPMRC?Provincia=string&Municipio=string&SRS=string&RC=string

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
        +"&&layers="        +   "CATASTRO"  //Capas(separadas por comas: CATASTRO (todas segun zoom), MASA, PARCELA, SUBPARCE, CONSTRU(construcciones), ELEMLIN (caminos y rios)    
        //+"&&layers="        +   "MASA,PARCELA,SUBPARCE,CONSTRU,ELEMLIN"      //Capas sin leyendas    
        //+"&&TIME="          +   "2018-05-13"//Historico catastral solicitado (AAAA>=2002)

        +"&&bbox="          +   sw.lng()+","+sw.lat()+","+ne.lng()+","+ne.lat()//BoundingBox de la foto
        ,mapa.getBounds()
    );

    //3. Refresco el mapa
    this.catastro.setMap(mapa);

}

//Mis notas proximas versiones    //
//--------------------------------//
/*
Probar este servicio SIGPAC http://wms.mapama.es/wms/wms.aspx

*/
