//Arranca el script
    console.log("Arranca el script");
    //window.onload=inicia; //Llama a la funcion "inicia";

//Variables y constantes globales
    //const CONSTANTE_PI=Math.PI;
    //var arrayGlobal = [];
    //var varGlobal = 0;

//Funciones locales//
//-----------------//

function readSingleFile(e) {
    var file = e.files[0];          //Cojo el primer archivo de los seleccionados (//TODO: rehacer con varios archivos)
    if (!file) {return}             //Si no hay achivo m salgo sin hacer nada

    //Declaro el callback de la lectura del fichero
    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;

        //Muestro el fichero en la etiqueta <pre>
        document.getElementById('file-content').textContent = contents;
        
        //Converting text file into a GML file
        let objeto = txt2GML(contents);
        console.log("Objeto: ");
    };

    //Lanzo la lectura del fichero (asincrona)
    reader.readAsText(file);                //Lee xml, json

}

/**
 * @description Convert a txt file into a GML object to access atributs and info easily
 * @param {*} archivoTxt txt file to be converted into a GML object 
 * @returns     a GML object (XML file)
 */
function txt2GML(archivoTxt){
    let gmlObject;
    console.log("Comienzo la conversion");

    //Parsing the input
    let parser = new DOMParser();                                       //Paser nativo del DOM
    let xmlDoc = parser.parseFromString(archivoTxt,"text/xml");         //Objeto XML DOM
    let stringPuntos = xmlDoc.getElementsByTagName("gml:posList")[0].textContent;          //Navego como si fuera un html por el doc
    let arrayPuntos=stringPuntos.split(" ");

    //Convierto ese string de puntos en un array de latLng() que uego pueda usar para una polygon
    let myPath = [];
    for (let i=0;i<=arrayPuntos.length/2;i=i+2){
        //Hay que pasarlas de UTM a Geograficas
        //myPath.push(new google.maps.LatLng(arrayPuntos[i+1], arrayPuntos[i]));  //En el GML viene lng y lat y no al reves como requiree GoogleMaps
    }



    return gmlObject;
}

//Investigar //
//-----------//
/*
    1. Clase FleReader y sus metodos (onload, readAsText, ..)
*/
