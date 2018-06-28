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
        let aux= document.getElementById("imagen1");
        document.getElementById("imagen1").src = contents;
    };

    //Lanzo la lectura del fichero (asincrona)
    reader.readAsText(file);                //Lee xml, json
    //reader.readAsDataURL(file);           //Lee imagenes
    //reader.readAsArrayBuffer(file);       //Lee caracter a caracter en un buffer e.target.result.Int8Array[]
    //reader.readAsBinaryString(file);      //Lee una cadena de caracteres

}

function openFileOption(){
//Aprieta el boton del input file cuando este est'a oculto (por feo !!) 
  document.getElementById("fileinput2").click();
}



//Investigar //
//-----------//
/*
    1. Clase FleReader y sus metodos (onload, readAsText, ..)
*/



//Codigo a reutilizar en un futuro//
//--------------------------------//
/*
function inicia(){
//Cosas que hacer una vez se haya cargado la pagina HTML 

}

//HTML
//<input type="file" id="input" multiple onchange="handleFiles(this.files)">

*/  
