/**
 * Mis notas sobre este componente
 * 
 * 1. supressInfoWindow en las parseOptions hace que al cargar no se muestren ventanas.
 * 
 */

console.log("Arranca el script geoxml3");

//----------------------//
//Variables globales    //
//----------------------//

//Opciones del tipo de parsing a realizar
const defaultParserOptions = {
    //Opciones de parsing
    suppressInfoWindows: false,                     // Muestra las ventanas de info al clickar (false) o no (true)
    singleInfoWindow: true,                         // Mantiene visibles las ventanas de info al clickar (las clickadas)
    processStyles: false,                           // Lo dejo en principio a false para no hacer processStyles, processStyleID pero habra que matar esta llamada inutil
    zoom: true,                                     // No hace zoom a la capa cargada
    xhrTimeout: 60000,                              // Timeout maximo (6 seg) para cargar el archivo KML

    //Opciones de estilo
    polygonOptions: {
        strokeColor: "#FFFFFF",     //blanco
        strokeWeight: 2,
        strokeOpacity: 0.5,
        fillColor: "#008000",       //Verde mini
        fillOpacity: 0.2
    },
    markerOptions: {
        //icon: "img/edit.png",
        //shadow: "",
    },    
    infoWindowOptions: {
        //pixeloffstet: "",
    },
    polylineOptions: {  //No hay polilineas en Catastro, son todo poligonos y el marcador de la parcela
        strokeColor: "#000000",
        strokeWeight: 20,
        strokeOpacity: 1,
        zIndex: zIndexOffset++,
    },
};

//Estilo de las geometrias por defecto en caso de que no se indiquen en el KML (vacio)
const defaultStyle = {
    color: "ff000000", // black
    colorMode: "normal",
    width: 1,
    fill: true,
    outline: true,
    fillcolor: "3fff0000" // blue
};

// Declare namespace
geoXML3 = window.geoXML3 || { instances: [] };
geoXML3.fetchers = [];

//------------------------------------------//
// Funciones y metodos de este componente   //
//------------------------------------------//

//Creo una clase MultiGeometry que incluye las mismas propiedades en cada polilinea
// y les crea un listener a cada una
if (!!window.google && !!google.maps) { 
    function MultiGeometry(multiGeometryOptions) {
        function createPolyline(polylineOptions, mg) {
            var polyline = new google.maps.Polyline(polylineOptions);
            google.maps.event.addListener(polyline, 'click', function (evt) { google.maps.event.trigger(mg, 'click', evt); });
            google.maps.event.addListener(polyline, 'dblclick', function (evt) { google.maps.event.trigger(mg, 'dblclick', evt); });
            google.maps.event.addListener(polyline, 'mousedown', function (evt) { google.maps.event.trigger(mg, 'mousedown', evt); });
            google.maps.event.addListener(polyline, 'mousemove', function (evt) { google.maps.event.trigger(mg, 'mousemove', evt); });
            google.maps.event.addListener(polyline, 'mouseout', function (evt) { google.maps.event.trigger(mg, 'mouseout', evt); });
            google.maps.event.addListener(polyline, 'mouseover', function (evt) { google.maps.event.trigger(mg, 'mouseover', evt); });
            google.maps.event.addListener(polyline, 'mouseup', function (evt) { google.maps.event.trigger(mg, 'mouseup', evt); });
            google.maps.event.addListener(polyline, 'rightclick', function (evt) { google.maps.event.trigger(mg, 'rightclick', evt); });
            return polyline;
        }
        this.setValues(multiGeometryOptions);
        
        //Creo las polilineas en el mapa con las mismas opciones y un mismo listener para todas ellas.         
        this.polylines = [];
        for (i = 0; i < this.paths.length; i++) {
            var polylineOptions = multiGeometryOptions;
            polylineOptions.path = this.paths[i];
            var polyline = createPolyline(polylineOptions, this);
            // Bind the polyline properties to the MultiGeometry properties
            this.polylines.push(polyline);
        }
    }

    MultiGeometry.prototype = new google.maps.MVCObject();
    MultiGeometry.prototype.setMap = function (map) { this.set('map', map); };
    MultiGeometry.prototype.getMap = function () { return this.get('map'); };
    MultiGeometry.prototype.changed = function (key) {
        if (this.polylines) {
            for (var i = 0; i < this.polylines.length; i++) {
                this.polylines[i].set(key, this.get(key));
            }
        }
    };

}

// Extend the global String object with a method to remove leading and trailing whitespace
if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

//--------------------------------------------------------------//
// Constructor for the root KML parser object (ver metodo render)
// 1. options if provided (defaultParserOptions) override default 
// 2. Crea el docs[]
// 3. Pinta en el mapa y crea los placemarks en googleMaps
// 4. CRea un listener (click) para mostrar infoWindow  
//--------------------------------------------------------------//
geoXML3.parser = function (options) {
    
    // Inherit from Google MVC Object to include event handling   
    google.maps.MVCObject.call(this);

    // parseOptions: Private variables are overrided by options in case provided
    var parserOptions = geoXML3.combineOptions(options, defaultParserOptions);
    parserOptions.infoWindow = new google.maps.InfoWindow();
    geoXML3.xhrTimeout = parserOptions.xhrTimeout;  //timeout maximo para cargar archivo KML (1min por defecto)

    var docs = [];                              // Individual KML documents cargados
    var parserName;
    //var boundsAll;                              // Atributo con el bounds agregado de todos los docs       

    // Metodos y funciones del constructor del geoXML3.parser   //
    //----------------------------------------------------------//

     // 1. CReo los objetos doc y los atributos,url, etc para importar y llamo al importador
    var parse = function (urls, docSet) {
    // Process one or more KML documents
    // urls es un array de string con las rutas de cada KML a importar
    // Llama al importador de ficheros 

        //Varibales internas para el parsing
        //----------------------------------//
        if (!parserName) {
            parserName = 'geoXML3.instances[' + (geoXML3.instances.push(this) - 1) + ']';
        }

        //Si solo le paso un string con una KML, lo meto en el [0] del array de urls
        if (typeof urls === 'string') { 
            urls = [urls];
        }

        // Internal values for the set of documents as a whole
        var internals = {
            parser: this,
            docSet: docSet || [],               //Almaceno el listado de documentos (capas KML, definidas por su Url) que proceso
            remaining: urls.length,
            parseOnly: !(parserOptions.afterParse || parserOptions.processStyles)
        };

        //Comienza el parsing   //
        //----------------------//

        // 1. CReo un documento por cada capa KML a crear y le asigno las opciones por defecto
        var thisDoc, j;
        for (var i = 0; i < urls.length; i++) {         
        //Recorro cada url para repetirlo con cada capa solicitada
        
            //var baseUrl = urls[i].split('?')[0];
            var baseUrl = urls[i];                //Cambio esto en el geoXML.parse porque la baseUrl es simepre catastro    
            for (j = 0; j < docs.length; j++) {     
                if (baseUrl === docs[j].baseUrl) {
                    // Reloading an existing document
                    thisDoc = docs[j];
                    thisDoc.reload = true;
                    break;
                }
            }

            //Si no se trata de un documento repetido, creo uno nuevo y lo almaceno en mi var internals
            if (j >= docs.length) {         
                thisDoc = new Object();
                thisDoc.baseUrl = baseUrl;
                internals.docSet.push(thisDoc);
            }

            //Iniciliazo el documento con los datos de la url requerida
            thisDoc.url = urls[i];
            thisDoc.internals = internals;
            var url = thisDoc.url;
            if (parserOptions.proxy) url = parserOptions.proxy + thisDoc.url;       //Se puede definir una opcion proxy con la ruta a los KML

            //LLamo a la funcion que importa el fichero KML y llama al render
            fetchDoc(url, thisDoc);
        }
    };

    // 2. Importo el fichero del servidor y llamo al render en callback para añadirlo a doc
    function fetchDoc(url, doc) {
        geoXML3.fetchXML(url, function (responseXML) { render(responseXML, doc); })
    }

    // 3. Proceso el fichero importado y lo muestro en el mapa
    // Esta es la funcion principal del parsing //
    //------------------------------------------//
    var render = function (responseXML, doc) {
    // Callback for retrieving a KML document: parse the KML and display it on the map
        if (!responseXML || responseXML == "failed parse") {
            // Error retrieving the data
            geoXML3.log('Unable to retrieve ' + doc.url);
            if (parserOptions.failedParse) {
                parserOptions.failedParse(doc);
            }
        } else if (!doc) {
            throw 'geoXML3 internal error: render called with null document';
        } else { //no errors
          // Importado fichero KML sin errores  
            
            //Variables locales
            var i;
            var styles = {};
            doc.placemarks = [];
            doc.groundoverlays = [];
            doc.ggroundoverlays = [];
            doc.networkLinks = [];
            doc.gpolygons = [];
            doc.gpolylines = [];
            doc.markers = [];

            // Declare some helper functions in local scope for better performance
            var nodeValue = geoXML3.nodeValue;

            // 1. Parse styles: almaceno en styles[] los distintos styles del KML con un id que empieza por #
            var styleID;
            //var styleNodes;
            nodes = responseXML.getElementsByTagName('Style');
            for (i = 0; i < nodes.length; i++) {
                thisNode = nodes[i];
                var thisNodeId = thisNode.getAttribute('id');
                if (!!thisNodeId) {
                    styleID = '#' + thisNodeId;
                    processStyle(thisNode, styles, styleID);        //Recupera los atributos y los mete en styles[]
                }
            }

            // 2. Parse styleMap: almaceno tambien en styles[] los distintos styleMap del KML con un id que empieza por #
            // 
            nodes = responseXML.getElementsByTagName('StyleMap');
            for (i = 0; i < nodes.length; i++) {
                thisNode = nodes[i];
                var thisNodeId = thisNode.getAttribute('id');
                if (!!thisNodeId) {
                    styleID = '#' + thisNodeId;
                    processStyleMap(thisNode, styles, styleID);     //Recupera los atributos y los mete en styles[]
                }
            }

            // 3. Almaceno todos los estilos en el doc, dentro de styles
            doc.styles = styles;
            //Procesa los estlos para depurar cosas de los marcadores. Es inutil
            //toDo: eliminar la llamada a processStyles(doc) y eliminar esa funcion y la processStyleID()
            if (!!parserOptions.processStyles || !parserOptions.createMarker) {
                // Convert parsed styles into GMaps equivalents
                processStyles(doc);
            }

            // 4. Parseo los placemarks (marcadores, polilineas, poligonos, ...)
            if (!!doc.reload && !!doc.markers) {
                for (i = 0; i < doc.markers.length; i++) {
                    doc.markers[i].active = false;
                }
            }

            var placemark, node, marker, poly, polygonNodes ;
            //var coords, path, coords, path, pathLength,  coordList;

            // 5. Recorro cada placemark
            var placemarkNodes = responseXML.getElementsByTagName('Placemark');
            for (pm = 0; pm < placemarkNodes.length; pm++) {
                // Init the placemark object
                node = placemarkNodes[pm];
                placemark = {
                    name: geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
                    description: geoXML3.nodeValue(node.getElementsByTagName('description')[0]),
                    styleUrl: geoXML3.nodeValue(node.getElementsByTagName('styleUrl')[0]),
                    id: node.getAttribute('id')
                };

                // Estos estilos quedan sin efecto porque asigno defaultOptions
                //------------------------------------------------------------------------------------//
                //Recupero el style del array de styles a partir del styleUrl
                placemark.style = doc.styles[placemark.styleUrl] || clone(defaultStyle);
                // inline style overrides shared style
                var inlineStyles = node.getElementsByTagName('Style');
                if (inlineStyles && (inlineStyles.length > 0)) {
                    var style = processStyle(node, doc.styles, "inline");
                    processStyleID(style);
                    if (style) placemark.style = style;
                }
                //------------------------------------------------------------------------------------//

                if (/^https?:\/\//.test(placemark.description)) {
                    placemark.description = ['<a href="', placemark.description, '">', placemark.description, '</a>'].join('');
                }

                // Esto de la multiGEometry no aplica en el Catastro 
                //------------------------------------------------------------------------------------//
                // process MultiGeometry
                var GeometryNodes = node.getElementsByTagName('coordinates');
                var Geometry = null;
                if (!!GeometryNodes && (GeometryNodes.length > 0)) {
                    for (var gn = 0; gn < GeometryNodes.length; gn++) {
                        if (!GeometryNodes[gn].parentNode ||
                            !GeometryNodes[gn].parentNode.nodeName) {

                        } else { // parentNode.nodeName exists
                            var GeometryPN = GeometryNodes[gn].parentNode;
                            Geometry = GeometryPN.nodeName;

                            // Extract the coordinates
                            // What sort of placemark?
                            switch (Geometry) {
                                case "Point":
                                    placemark.Point = processPlacemarkCoords(node, "Point")[0];
                                    if (!!window.google && !!google.maps)
                                        placemark.latlng = new google.maps.LatLng(placemark.Point.coordinates[0].lat, placemark.Point.coordinates[0].lng);
                                    pathLength = 1;
                                    break;
                                case "LinearRing":
                                    // Polygon/line
                                    polygonNodes = node.getElementsByTagName('Polygon');
                                    // Polygon
                                    if (!placemark.Polygon)
                                        placemark.Polygon = [{
                                            outerBoundaryIs: { coordinates: [] },
                                            innerBoundaryIs: [{ coordinates: [] }]
                                        }];
                                    for (var pg = 0; pg < polygonNodes.length; pg++) {
                                        placemark.Polygon[pg] = {
                                            outerBoundaryIs: { coordinates: [] },
                                            innerBoundaryIs: [{ coordinates: [] }]
                                        }
                                        placemark.Polygon[pg].outerBoundaryIs = processPlacemarkCoords(polygonNodes[pg], "outerBoundaryIs");
                                        placemark.Polygon[pg].innerBoundaryIs = processPlacemarkCoords(polygonNodes[pg], "innerBoundaryIs");
                                    }
                                    coordList = placemark.Polygon[0].outerBoundaryIs;
                                    break;

                                case "LineString":
                                    pathLength = 0;
                                    placemark.LineString = processPlacemarkCoords(node, "LineString");
                                    break;

                                default:
                                    break;
                            }
                        } // parentNode.nodeName exists
                    } // GeometryNodes loop
                } // if GeometryNodes 
                //------------------------------------------------------------------------------------//

                // call the custom placemark parse function if it is defined
                if (!!parserOptions.pmParseFn) parserOptions.pmParseFn(node, placemark);
                
                // Almaceno los placemarks en el doc
                doc.placemarks.push(placemark);
                if (!!window.google && !!google.maps) {

                    //Para los markers (Punto central de la parcela)
                    //-------------------------------------------//
                    if (placemark.Point) {

                        //ACtualizo los bounds incluyendo el nuevo bound ahora con todos los placemarks
                        if (!!window.google && !!google.maps) {
                            doc.bounds = doc.bounds || new google.maps.LatLngBounds();
                            doc.bounds.extend(placemark.latlng);
                        }

                        if (!!parserOptions.createMarker) {
                            // User-defined marker handler
                            parserOptions.createMarker(placemark, doc);
                        } else { // !user defined createMarker
                            // Check to see if this marker was created on a previous load of this document
                            var found = false;
                            if (!!doc) {
                                doc.markers = doc.markers || [];
                                if (doc.reload) {
                                    for (var j = 0; j < doc.markers.length; j++) {
                                        if ((doc.markers[j].id == placemark.id) ||
                                            // if no id, check position
                                            (!doc.markers[j].id &&
                                                (doc.markers[j].getPosition().equals(placemark.latlng)))) {
                                            found = doc.markers[j].active = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            if (!found) {
                                // Call the built-in marker creator
                                marker = createMarker(placemark, doc);
                                if (marker) {
                                    marker.active = true;
                                    marker.id = placemark.id;
                                }
                            }
                        }
                    }

                    //  Para los poligonos
                    //---------------------//
                    if (placemark.Polygon) {
                        if (!!doc) {
                            doc.gpolygons = doc.gpolygons || [];
                        }

                        if (!!parserOptions.createPolygon) {
                            // User-defined polygon handler
                            poly = parserOptions.createPolygon(placemark, doc);
                        } else {  // ! user defined createPolygon
                            // Check to see if this marker was created on a previous load of this document
                            poly = createPolygon(placemark, doc);
                            poly.active = true;
                        }
                        if (!!window.google && !!google.maps) {
                            doc.bounds = doc.bounds || new google.maps.LatLngBounds();
                            doc.bounds.union(poly.bounds);
                        }
                    }

                    //  Para las polilineas
                    //---------------------//
                    if (placemark.LineString) { // polyline
                        if (!!doc) {
                            doc.gpolylines = doc.gpolylines || [];
                        }
                        if (!!parserOptions.createPolyline) {
                            // User-defined polyline handler
                            poly = parserOptions.createPolyline(placemark, doc);
                        } else { // ! user defined createPolyline
                            // Check to see if this marker was created on a previous load of this document
                            poly = createPolyline(placemark, doc);
                            poly.active = true;
                        }
                        if (!!window.google && !!google.maps) {
                            doc.bounds = doc.bounds || new google.maps.LatLngBounds();
                            doc.bounds.union(poly.bounds);
                        }
                    }
                }
            } // placemark loop

            if (!!doc.reload && !!doc.markers) {
                for (i = doc.markers.length - 1; i >= 0; i--) {
                    if (!doc.markers[i].active) {
                        if (!!doc.markers[i].infoWindow) {
                            doc.markers[i].infoWindow.close();
                        }
                        doc.markers[i].setMap(null);
                        doc.markers.splice(i, 1);
                    }
                }
            }

            // Esta parte del codigo sobra porque no tenemos groundoverlays en el catastro
            //------------------------------------------------------------------------------//            
            // Parse ground overlays
            //Desactivo los groundoverlays si es un reload
            if (!!doc.reload && !!doc.groundoverlays) {
                for (i = 0; i < doc.groundoverlays.length; i++) {
                    doc.groundoverlays[i].active = false;
                }
            }

            if (!!doc) {
                doc.groundoverlays = doc.groundoverlays || [];
            }
            var groundOverlay, overlay;
            var groundNodes = responseXML.getElementsByTagName('GroundOverlay');
            for (i = 0; i < groundNodes.length; i++) {
                node = groundNodes[i];

                // Init the ground overlay object
                groundOverlay = {
                    name: geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
                    description: geoXML3.nodeValue(node.getElementsByTagName('description')[0]),
                    icon: { href: geoXML3.nodeValue(node.getElementsByTagName('href')[0]) },
                    latLonBox: {
                        north: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('north')[0])),
                        east: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('east')[0])),
                        south: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('south')[0])),
                        west: parseFloat(geoXML3.nodeValue(node.getElementsByTagName('west')[0]))
                    }
                };
                if (!!window.google && !!google.maps) {
                    doc.bounds = doc.bounds || new google.maps.LatLngBounds();
                    doc.bounds.union(new google.maps.LatLngBounds(
                        new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
                        new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
                    ));
                }

                // Opacity is encoded in the color node
                var colorNode = node.getElementsByTagName('color');
                if (colorNode && colorNode.length && (colorNode.length > 0)) {
                    groundOverlay.opacity = geoXML3.getOpacity(nodeValue(colorNode[0]));
                } else {
                    groundOverlay.opacity = 0.45;
                }

                doc.groundoverlays.push(groundOverlay);
                if (!!window.google && !!google.maps) {
                    if (!!parserOptions.createOverlay) {
                        // User-defined overlay handler
                        parserOptions.createOverlay(groundOverlay, doc);
                    } else { // ! user defined createOverlay
                        // Check to see if this overlay was created on a previous load of this document
                        var found = false;
                        if (!!doc) {
                            doc.groundoverlays = doc.groundoverlays || [];
                            if (!!window.google && !!google.maps && doc.reload) {
                                overlayBounds = new google.maps.LatLngBounds(
                                    new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
                                    new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east));
                                var overlays = doc.groundoverlays;
                                for (i = overlays.length; i--;) {
                                    if ((overlays[i].bounds().equals(overlayBounds)) &&
                                        (overlays.url_ === groundOverlay.icon.href)) {
                                        found = overlays[i].active = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!found) {
                            // Call the built-in overlay creator
                            overlay = createOverlay(groundOverlay, doc);
                            overlay.active = true;
                        }
                    }
                    if (!!doc.reload && !!doc.groundoverlays && !!doc.groundoverlays.length) {
                        var overlays = doc.groundoverlays;
                        for (i = overlays.length; i--;) {
                            if (!overlays[i].active) {
                                overlays[i].remove();
                                overlays.splice(i, 1);
                            }
                        }
                        doc.groundoverlays = overlays;
                    }
                }
            }
            //------------------------------------------------------------------------------//

            
            // Esta parte del codigo sobre porque no tenemos networklinks en el catastro
            //------------------------------------------------------------------------------//               
            // Parse network links
            var networkLink;
            var docPath = document.location.pathname.split('/');
            docPath = docPath.splice(0, docPath.length - 1).join('/');
            var linkNodes = responseXML.getElementsByTagName('NetworkLink');
            for (i = 0; i < linkNodes.length; i++) {
                node = linkNodes[i];

                // Init the network link object
                networkLink = {
                    name: geoXML3.nodeValue(node.getElementsByTagName('name')[0]),
                    link: {
                        href: geoXML3.nodeValue(node.getElementsByTagName('href')[0]),
                        refreshMode: geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0])
                    }
                };

                // Establish the specific refresh mode 
                if (networkLink.link.refreshMode === '') {
                    networkLink.link.refreshMode = 'onChange';
                }
                if (networkLink.link.refreshMode === 'onInterval') {
                    networkLink.link.refreshInterval = parseFloat(geoXML3.nodeValue(node.getElementsByTagName('refreshInterval')[0]));
                    if (isNaN(networkLink.link.refreshInterval)) {
                        networkLink.link.refreshInterval = 0;
                    }
                } else if (networkLink.link.refreshMode === 'onChange') {
                    networkLink.link.viewRefreshMode = geoXML3.nodeValue(node.getElementsByTagName('viewRefreshMode')[0]);
                    if (networkLink.link.viewRefreshMode === '') {
                        networkLink.link.viewRefreshMode = 'never';
                    }
                    if (networkLink.link.viewRefreshMode === 'onStop') {
                        networkLink.link.viewRefreshTime = geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0]);
                        networkLink.link.viewFormat = geoXML3.nodeValue(node.getElementsByTagName('refreshMode')[0]);
                        if (networkLink.link.viewFormat === '') {
                            networkLink.link.viewFormat = 'BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth]';
                        }
                    }
                }

                if (!/^[\/|http]/.test(networkLink.link.href)) {
                    // Fully-qualify the HREF
                    networkLink.link.href = docPath + '/' + networkLink.link.href;
                }

                // Apply the link
                if ((networkLink.link.refreshMode === 'onInterval') &&
                    (networkLink.link.refreshInterval > 0)) {
                    // Reload at regular intervals
                    setInterval(parserName + '.parse("' + networkLink.link.href + '")',
                        1000 * networkLink.link.refreshInterval);
                } else if (networkLink.link.refreshMode === 'onChange') {
                    if (networkLink.link.viewRefreshMode === 'never') {
                        // Load the link just once
                        doc.internals.parser.parse(networkLink.link.href, doc.internals.docSet);
                    } else if (networkLink.link.viewRefreshMode === 'onStop') {
                        // Reload when the map view changes

                    }
                }
            }
            //------------------------------------------------------------------------------//
        }
             
        //Actualizo los bounds
        if (!!doc.bounds && !!window.google && !!google.maps) {
            doc.internals.bounds = doc.internals.bounds || new google.maps.LatLngBounds();
            doc.internals.bounds.union(doc.bounds);
        }
        if (!!doc.markers || !!doc.groundoverlays || !!doc.gpolylines || !!doc.gpolygons) {
            doc.internals.parseOnly = false;
        }

        doc.internals.remaining -= 1;

        //Finalizo el rendering tras haber recorrido todos los docs
        //Llamo al callback y actualizo el objecto geoXml
        if (doc.internals.remaining === 0) {
        // We're done processing this set of KML documents
        // Options that get invoked after parsing completes

            //Hago zoom en la capa cargada
            if (parserOptions.zoom && !!doc.internals.bounds &&
                !doc.internals.bounds.isEmpty() && !!parserOptions.map) {
                parserOptions.map.fitBounds(doc.internals.bounds);
            }

            //Almaceno el resultado en doc
            if (!doc.internals.parseOnly) {
                // geoXML3 is not being used only as a real-time parser, so keep the processed documents around
                for (var i = 0; i < doc.internals.docSet.length; i++) {
                    docs.push(doc.internals.docSet[i]);
                }
                //TODO: pruebo si me lo cargo o lo limpio
                docs.forEach(element => {
                    element.internals=""
                });
                
                //docs[0].internals="";
            }



            //Llamo a la funcion callback definida por afterParse
            if (parserOptions.afterParse) {
                parserOptions.afterParse(docs);
                //parserOptions.afterParse(doc.internals.docSet);
            }

            //No tengo claro lo que hace exactamente
            google.maps.event.trigger(doc.internals.parser, 'parsed');
        }
    };

    //Recupera del nodo de stilo (thisNode) los parametros del estilo en custion (styleID)
    //Devuelve Los parametros del estilo se guardan en styles[styleID] como atributos segun el tipo de style que sea
    function processStyle(thisNode, styles, styleID) {
        //elimina caracteres en blanco y ociosos del fichero KML
        var nodeValue = geoXML3.nodeValue;      
        styles[styleID] = styles[styleID] || clone(defaultStyle);
        
        // Iconos//
        //Scale del icono
        var styleNodes = thisNode.getElementsByTagName('IconStyle');
        if (!!styleNodes && !!styleNodes.length && (styleNodes.length > 0)) {
            styles[styleID].scale = parseFloat(nodeValue(styleNodes[0].getElementsByTagName('scale')[0]));
        }
        if (isNaN(styles[styleID].scale)) styles[styleID].scale = 1.0;

        //href del icono a visualizar. 
        //NodeValue elimina caracteres vacios y asigna por defecto si KML esta vacio
        styleNodes = thisNode.getElementsByTagName('Icon');
        if (!!styleNodes && !!styleNodes.length && (styleNodes.length > 0)) {
            styles[styleID].href = nodeValue(styleNodes[0].getElementsByTagName('href')[0]);
        }
        
        // Polilineas
        styleNodes = thisNode.getElementsByTagName('LineStyle');
        if (!!styleNodes && !!styleNodes.length && (styleNodes.length > 0)) {
            styles[styleID].color = nodeValue(styleNodes[0].getElementsByTagName('color')[0], defaultStyle.color);
            styles[styleID].colorMode = nodeValue(styleNodes[0].getElementsByTagName('colorMode')[0], defaultStyle.colorMode);
            styles[styleID].width = nodeValue(styleNodes[0].getElementsByTagName('width')[0], defaultStyle.width);
        }

        //Polygons
        styleNodes = thisNode.getElementsByTagName('PolyStyle');
        if (!!styleNodes && !!styleNodes.length && (styleNodes.length > 0)) {
            styles[styleID].outline = getBooleanValue(styleNodes[0].getElementsByTagName('outline')[0], defaultStyle.outline);
            styles[styleID].fill = getBooleanValue(styleNodes[0].getElementsByTagName('fill')[0], defaultStyle.fill);
            styles[styleID].colorMode = nodeValue(styleNodes[0].getElementsByTagName('colorMode')[0], defaultStyle.colorMode);
            styles[styleID].fillcolor = nodeValue(styleNodes[0].getElementsByTagName('color')[0], defaultStyle.fillcolor);
        }
        return styles[styleID];
    }

    //Como la anterior pero para StyleMap solo
    function processStyleMap(thisNode, styles, styleID) {
        var nodeValue = geoXML3.nodeValue;
        var pairs = thisNode.getElementsByTagName('Pair');
        var map = new Object();
        // add each key to the map
        for (var pr = 0; pr < pairs.length; pr++) {
            var pairkey = nodeValue(pairs[pr].getElementsByTagName('key')[0]);
            var pairstyle = nodeValue(pairs[pr].getElementsByTagName('Style')[0]);
            var pairstyleurl = nodeValue(pairs[pr].getElementsByTagName('styleUrl')[0]);
            if (!!pairstyle) {
                processStyle(pairstyle, map[pairkey], styleID);
            } else if (!!pairstyleurl && !!styles[pairstyleurl]) {
                map[pairkey] = clone(styles[pairstyleurl]);
            }
        }
        if (!!map["normal"]) {
            styles[styleID] = clone(map["normal"]);
        } else {
            styles[styleID] = clone(defaultStyle);
        }
        if (!!map["highlight"] && !!parserOptions.processStyles) {
            processStyleID(map["highlight"]);
        }
        styles[styleID].map = clone(map);
    }

    //-----------------------------------------------//
    // Funciones internas para agilizar el procesado //
    //-----------------------------------------------//

    function clone(obj) {
    // from http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-a-javascript-object
    // http://keithdevens.com/weblog/archive/2007/Jun/07/javascript.clone
        if (obj == null || typeof (obj) != 'object') return obj;
        var temp = new obj.constructor();
        for (var key in obj) temp[key] = clone(obj[key]);
        return temp;
    }

    function getBooleanValue(node) {
        var nodeContents = geoXML3.nodeValue(node);
        if (!nodeContents) return true;
        if (nodeContents) nodeContents = parseInt(nodeContents);
        if (isNaN(nodeContents)) return true;
        if (nodeContents == 0) return false;
        else return true;
    }

    function processPlacemarkCoords(node, tag) {
        var parent = node.getElementsByTagName(tag);
        var coordListA = [];
        for (var i = 0; i < parent.length; i++) {
            var coordNodes = parent[i].getElementsByTagName('coordinates')
            if (!coordNodes) {
                if (coordListA.length > 0) {
                    break;
                } else {
                    return [{ coordinates: [] }];
                }
            }

            for (var j = 0; j < coordNodes.length; j++) {
                var coords = geoXML3.nodeValue(coordNodes[j]).trim();
                coords = coords.replace(/,\s+/g, ',');
                var path = coords.split(/\s+/g);
                var pathLength = path.length;
                var coordList = [];
                for (var k = 0; k < pathLength; k++) {
                    coords = path[k].split(',');
                    if (!isNaN(coords[0]) && !isNaN(coords[1])) {
                        coordList.push({
                            lat: parseFloat(coords[1]),
                            lng: parseFloat(coords[0]),
                            alt: parseFloat(coords[2])
                        });
                    }
                }
                coordListA.push({ coordinates: coordList });
            }
        }
        return coordListA;
    }

    var kmlColor = function (kmlIn, colorMode) {
        var kmlColor = {};
        kmlIn = kmlIn || 'ffffffff';  // white (KML 2.2 default)

        var aa = kmlIn.substr(0, 2);
        var bb = kmlIn.substr(2, 2);
        var gg = kmlIn.substr(4, 2);
        var rr = kmlIn.substr(6, 2);

        kmlColor.opacity = parseInt(aa, 16) / 256;
        kmlColor.color = (colorMode === 'random') ? randomColor(rr, gg, bb) : '#' + rr + gg + bb;
        return kmlColor;
    };

    var randomColor = function (rr, gg, bb) {
        var col = { rr: rr, gg: gg, bb: bb };
        for (var k in col) {
            var v = col[k];
            if (v == null) v = 'ff';

            // RGB values are limiters for random numbers (ie: 7f would be a random value between 0 and 7f)
            v = Math.round(Math.random() * parseInt(rr, 16)).toString(16);
            if (v.length === 1) v = '0' + v;
            col[k] = v;
        }

        return '#' + col.rr + col.gg + col.bb;
    };

    //-----------------------------------------------------------//
    // Metodos exportados por geoXML3 para manejar el conjunto   //
    //-----------------------------------------------------------//     

    //Oculta del mapa todos los elementos de un doc concreto (document), si no se pasa coge el docs[0]
    var hideDocument = function (document) {

        for (var n=0; n<this.docs.length;n++){
            !document? doc = docs[n]: doc= document;    // si no se pasa un doc concreto, hago el bucle entero y oculto todo doc

            // Hide the map objects associated with a document 
            var i;
            if (!!window.google && !!google.maps) {
                if (!!doc.markers) {
                    for (i = 0; i < doc.markers.length; i++) {
                        if (!!doc.markers[i].infoWindow) doc.markers[i].infoWindow.close();
                        doc.markers[i].setVisible(false);
                    }
                }
                if (!!doc.ggroundoverlays) {
                    for (i = 0; i < doc.ggroundoverlays.length; i++) {
                        doc.ggroundoverlays[i].setOpacity(0);
                    }
                }
                if (!!doc.gpolylines) {
                    for (i = 0; i < doc.gpolylines.length; i++) {
                        if (!!doc.gpolylines[i].infoWindow) doc.gpolylines[i].infoWindow.close();
                        doc.gpolylines[i].setMap(null);
                    }
                }
                if (!!doc.gpolygons) {
                    for (i = 0; i < doc.gpolygons.length; i++) {
                        if (!!doc.gpolygons[i].infoWindow) doc.gpolygons[i].infoWindow.close();
                        doc.gpolygons[i].setMap(null);
                    }
                }
            }
            if (!!document) break; //Si se ha pasado un doc concreto, una vez procesado ese me salgo del bucle de docs[n]
        }
    };
    //Muestra toda la capa docs[i] indicada por document o toma todos los docs en su defecto
    var showDocument = function (document) {

        for (var n=0; n<this.docs.length;n++){
            !document? doc = docs[n]: doc= document;    // si no se pasa un doc concreto, hago el bucle entero y oculto todo doc
        
            // Show the map objects associated with a document 
            var i;
            if (!!window.google && !!google.maps) {
                if (!!doc.markers) {
                    for (i = 0; i < doc.markers.length; i++) {
                        doc.markers[i].setVisible(true);
                    }
                }
                if (!!doc.ggroundoverlays) {
                    for (i = 0; i < doc.ggroundoverlays.length; i++) {
                        doc.ggroundoverlays[i].setOpacity(doc.ggroundoverlays[i].percentOpacity_);
                    }
                }
                if (!!doc.gpolylines) {
                    for (i = 0; i < doc.gpolylines.length; i++) {
                        doc.gpolylines[i].setMap(parserOptions.map);
                    }
                }
                if (!!doc.gpolygons) {
                    for (i = 0; i < doc.gpolygons.length; i++) {
                        doc.gpolygons[i].setMap(parserOptions.map);
                    }
                }
            }
            if (!!document) break; //Si se ha pasado un doc concreto, una vez procesado ese me salgo del bucle de docs[n]
        }
    };
    //Metodo pra calcular los bounds agregados de todos los docs[]
    var boundsAll = function () {
    //Calculo el bound agregado de todos los docs
        //Asigno a boundsAll el bounds agregado incluyendo todos los docs[]
        var bounds = new google.maps.LatLngBounds();
        for (var n=0; n<docs.length; n++){
            point1  = new google.maps.LatLng(docs[n].bounds.f.b,geoXml.docs[n].bounds.b.b);
            point2  = new google.maps.LatLng(docs[n].bounds.f.f,geoXml.docs[n].bounds.b.f);
            bounds.extend(point1);
            bounds.extend(point2);
        }
        return bounds;
    }

    //Activa el atributo "active" de todos los placemarks
    //Lo hace para una parcela, un doc que se le pase como document (o de todos los docs por defecto)
    //Este atributo hace que los listener se des/activen como se requiere al definir la capa como seleccionable o no
    var activatePlacemarks = function (flag, document){
        for (var n=0; n<docs.length; n++){
            //Si se indica una capa RC concreta salto a ella, si no recorro todas
            !!document? doc=document : doc = docs[n];
            
            //Activo los markers como indica el flag
            doc.markers.forEach(element => {
                element.active = flag;
                //Borro los titulos y los vuelvo a crear segun este activo o no
                //Ejemplo de infoWindowOptions.content ....
                //"<div class="geoxml3_infowindow"><h3>Polígono 15 Parcela 5, JAEN (JAÉN)</h3><div><font size=+1>Consultar en la Sede Electrónica<br>del Catastro la parcela:</font><br><font size=+2><A href="https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?del=23&muni=900&rc1=23900A0&rc2=1500005">23900A015000050000SK</a></font></div></div>"
                !flag? titulo="" : titulo = element.infoWindowOptions.content.split('>')[2].slice(0, -4);    //El titulo esta tambien en el conenido de infoWindows
                element.setTitle(titulo);   //El title hay que cambiarlo con setTitle o no se modifica por parte de GoogleMaps si lo haces .title=""
            });
            //Activo los polygons como indica el flag
            doc.gpolygons.forEach(element => {element.active = flag;});
            //Activo los polylines como indica el flag
            doc.gpolylines.forEach(element => {element.active = flag;});

            if (document) break;    //Si se solicito para un solo doc en concreto (document) salgo del bucle de docs[]
        }
    }

    //-----------------------------------------------//
    // Funciones internas para crear los placemarks  //
    //-----------------------------------------------//    

    //CRea el marker en el mapa, con las opciones por defecto
    //CRea un listener on click que muestra la infoWindow
    var createMarker = function (placemark, doc) {
        // create a Marker to the map from a placemark KML object

        // Load basic marker properties
        var markerOptions = geoXML3.combineOptions(parserOptions.markerOptions, {
            map: parserOptions.map,
            position: new google.maps.LatLng(placemark.Point.coordinates[0].lat, placemark.Point.coordinates[0].lng),
            title: placemark.name,
            zIndex: Math.round(placemark.Point.coordinates[0].lat * -100000) << 5,
            icon: placemark.style.icon,
            shadow: placemark.style.shadow,
            zIndex: zIndexOffset++,
        });

        // Create the marker on the map
        var marker = new google.maps.Marker(markerOptions);
        if (!!doc) {
            doc.markers.push(marker);
        }

        // Set up and create the infowindow if it is not suppressed
        if (!parserOptions.suppressInfoWindows) {
            var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
                content: '<div class="geoxml3_infowindow"><h3>' + placemark.name +
                    '</h3><div>' + placemark.description + '</div></div>',
                pixelOffset: new google.maps.Size(0, 2)
            });
            if (parserOptions.infoWindow) {
                marker.infoWindow = parserOptions.infoWindow;
            } else {
                marker.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            }
            marker.infoWindowOptions = infoWindowOptions;

            // Infowindow-opening event handler
            google.maps.event.addListener(marker, 'click', function () {
                if (!marker.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa

                this.infoWindow.close();
                marker.infoWindow.setOptions(this.infoWindowOptions);
                this.infoWindow.open(this.map, this);
            });
        }
        placemark.marker = marker;
        return marker;
    };

    // Create Polyline
    var createPolyline = function (placemark, doc) {
        var paths = [];
        var bounds = new google.maps.LatLngBounds();
        for (var j = 0; j < placemark.LineString.length; j++) {
            var path = [];
            var coords = placemark.LineString[j].coordinates;
            for (var i = 0; i < coords.length; i++) {
                var pt = new google.maps.LatLng(coords[i].lat, coords[i].lng);
                path.push(pt);
                bounds.extend(pt);
            }
            paths.push(path);
        }

        // point to open the infowindow if triggered 
        var point = paths[0][Math.floor(path.length / 2)];

        // Load basic polyline properties
        var kmlStrokeColor = kmlColor(placemark.style.color, placemark.style.colorMode);
        var polyOptions = geoXML3.combineOptions(parserOptions.polylineOptions, {
            map: parserOptions.map,
            strokeColor: kmlStrokeColor.color,
            strokeWeight: placemark.style.width,
            strokeOpacity: kmlStrokeColor.opacity,
            title: placemark.name,
            zIndex: zIndexOffset++,
        });
        if (paths.length > 1) {
            polyOptions.paths = paths;
            var p = new MultiGeometry(polyOptions);
        } else {
            polyOptions.path = paths[0];
            var p = new google.maps.Polyline(polyOptions);
        }
        p.bounds = bounds;

        // setup and create the infoWindow if it is not suppressed
        if (!parserOptions.suppressInfoWindows) {
            var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
                content: '<div class="geoxml3_infowindow"><h3>' + placemark.name +
                    '</h3><div>' + placemark.description + '</div></div>',
                pixelOffset: new google.maps.Size(0, 2)
            });
            if (parserOptions.infoWindow) {
                p.infoWindow = parserOptions.infoWindow;
            } else {
                p.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            }
            p.infoWindowOptions = infoWindowOptions;
            // Infowindow-opening event handler
            google.maps.event.addListener(p, 'click', function (e) {
                if (!p.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa

                p.infoWindow.close();
                p.infoWindow.setOptions(p.infoWindowOptions);
                if (e && e.latLng) {
                    p.infoWindow.setPosition(e.latLng);
                } else {
                    p.infoWindow.setPosition(point);
                }
                p.infoWindow.open(p.map || p.polylines[0].map);
            });
        }
        if (!!doc) doc.gpolylines.push(p);
        placemark.polyline = p;
        return p;
    }

    // Create Polygon
    var createPolygon = function (placemark, doc) {
        var bounds = new google.maps.LatLngBounds();
        var paths = [];
        var pathsLength = 0;

        for (var polygonPart = 0; polygonPart < placemark.Polygon.length; polygonPart++) {
            for (var j = 0; j < placemark.Polygon[polygonPart].outerBoundaryIs.length; j++) {
                var coords = placemark.Polygon[polygonPart].outerBoundaryIs[j].coordinates;
                var path = [];
                for (var i = 0; i < coords.length; i++) {
                    var pt = new google.maps.LatLng(coords[i].lat, coords[i].lng);
                    path.push(pt);
                    bounds.extend(pt);
                }
                paths.push(path);
                pathsLength += path.length;
            }
            for (var j = 0; j < placemark.Polygon[polygonPart].innerBoundaryIs.length; j++) {
                var coords = placemark.Polygon[polygonPart].innerBoundaryIs[j].coordinates;
                var path = [];
                for (var i = 0; i < coords.length; i++) {
                    var pt = new google.maps.LatLng(coords[i].lat, coords[i].lng);
                    path.push(pt);
                    bounds.extend(pt);
                }
                paths.push(path);
                pathsLength += path.length;
            }
        }

        // Load basic polygon properties
        var kmlStrokeColor = kmlColor(placemark.style.color, placemark.style.colorMode);
        var kmlFillColor = kmlColor(placemark.style.fillcolor, placemark.style.colorMode);
        if (!placemark.style.fill) kmlFillColor.opacity = 0.0;
        var strokeWeight = placemark.style.width;
        if (!placemark.style.outline) {
            strokeWeight = 0;
            kmlStrokeColor.opacity = 0.0;
        }
        var polyOptions = geoXML3.combineOptions(parserOptions.polygonOptions, {
            map: parserOptions.map,
            paths: paths,
            title: placemark.name,
            strokeColor: kmlStrokeColor.color,
            strokeWeight: strokeWeight,
            strokeOpacity: kmlStrokeColor.opacity,
            fillColor: kmlFillColor.color,
            fillOpacity: kmlFillColor.opacity,
            zIndex: zIndexOffset++,
        });
        var p = new google.maps.Polygon(polyOptions);
        p.bounds = bounds;
        if (!parserOptions.suppressInfoWindows) {
            var infoWindowOptions = geoXML3.combineOptions(parserOptions.infoWindowOptions, {
                content: '<div class="geoxml3_infowindow"><h3>' + placemark.name +
                    '</h3><div>' + placemark.description + '</div></div>',
                pixelOffset: new google.maps.Size(0, 2)
            });
            if (parserOptions.infoWindow) {
                p.infoWindow = parserOptions.infoWindow;
            } else {
                p.infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            }
            p.infoWindowOptions = infoWindowOptions;
            // Infowindow-opening event handler
            google.maps.event.addListener(p, 'click', function (e) {
                if (!p.active) return;           //Flag que desactiva el Listener cuando se pone a no-clikable esa capa

                p.infoWindow.close();
                p.infoWindow.setOptions(p.infoWindowOptions);
                if (e && e.latLng) {
                    p.infoWindow.setPosition(e.latLng);
                } else {
                    p.infoWindow.setPosition(p.bounds.getCenter());
                }
                p.infoWindow.open(this.map);
            });
        }
        if (!!doc) doc.gpolygons.push(p);
        placemark.polygon = p;
        return p;
    }

    //------------------------------------------//   
    // funciones y codigo a eliminar o puntear  //
    //------------------------------------------//
    
//----------------------------------------------------------------
    var parseKmlString = function (kmlString, docSet) {
    // Internal values for the set of documents as a whole
        var internals = {
            parser: this,
            docSet: docSet || [],
            remaining: 1,
            parseOnly: !(parserOptions.afterParse || parserOptions.processStyles)
        };
        thisDoc = new Object();
        thisDoc.internals = internals;
        internals.docSet.push(thisDoc);
        render(geoXML3.xmlParse(kmlString), thisDoc);
    }

    //Ajusta el formato del icono que se haya pasado.
    //complicado y no le veo la utilidad.
    //ToDo: eliminar esta funcion y la processStyles() o bien configurar como processStyles=false
    var processStyleID = function (style) {

        if (!!window.google && !!google.maps) {
            var zeroPoint = new google.maps.Point(0, 0);

            if (!!style.href) {
                var markerRegEx = /\/(red|blue|green|yellow|lightblue|purple|pink|orange|pause|go|stop)(-dot)?\.png/;
                if (markerRegEx.test(style.href)) {
                    //bottom middle
                    var anchorPoint = new google.maps.Point(16 * style.scale, 32 * style.scale);
                } else {
                    var anchorPoint = new google.maps.Point(16 * style.scale, 16 * style.scale);
                }
                // Init the style object with a standard KML icon
                style.icon = {
                    url: style.href,
                    size: new google.maps.Size(32 * style.scale, 32 * style.scale),
                    origin: zeroPoint,
                    // bottom middle 
                    anchor: anchorPoint,
                    scaledSize: new google.maps.Size(32 * style.scale, 32 * style.scale)
                };
                // Look for a predictable shadow
                var stdRegEx = /\/(red|blue|green|yellow|lightblue|purple|pink|orange)(-dot)?\.png/;
                var shadowSize = new google.maps.Size(59, 32);
                var shadowPoint = new google.maps.Point(16, 32);
                if (stdRegEx.test(style.href)) {
                    // A standard GMap-style marker icon
                    style.shadow = {
                        url: 'http://maps.google.com/mapfiles/ms/micons/msmarker.shadow.png',
                        size: shadowSize,
                        origin: zeroPoint,
                        anchor: shadowPoint,
                        scaledSize: shadowSize
                    };
                } else if (style.href.indexOf('-pushpin.png') > -1) {
                    // Pushpin marker icon
                    style.shadow = {
                        url: 'http://maps.google.com/mapfiles/ms/micons/pushpin_shadow.png',
                        size: shadowSize,
                        origin: zeroPoint,
                        anchor: shadowPoint,
                        scaledSize: shadowSize
                    };
                } else {
                    // Other MyMaps KML standard icon
                    style.shadow = {
                        url: style.href.replace('.png', '.shadow.png'),
                        size: shadowSize,
                        origin: zeroPoint,
                        anchor: shadowPoint,
                        scaledSize: shadowSize
                    };
                }
            }
        }
    }

    //Llama a la funcion processStyleID, que no hace mucho, la verdad
    //toDo: eliminar eta funcion y su llamada
    var processStyles = function (doc) {
        for (var styleID in doc.styles) {
            processStyleID(doc.styles[styleID]);
        }
    };

    //CRea el ground overlay pero no tenemos nosotros
    //Eliminar
    var createOverlay = function (groundOverlay, doc) {
        // Add a ProjectedOverlay to the map from a groundOverlay KML object

        if (!window.ProjectedOverlay) {
            throw 'geoXML3 error: ProjectedOverlay not found while rendering GroundOverlay from KML';
        }

        var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(groundOverlay.latLonBox.south, groundOverlay.latLonBox.west),
            new google.maps.LatLng(groundOverlay.latLonBox.north, groundOverlay.latLonBox.east)
        );
        var overlayOptions = geoXML3.combineOptions(parserOptions.overlayOptions, { percentOpacity: groundOverlay.opacity * 100 });
        var overlay = new ProjectedOverlay(parserOptions.map, groundOverlay.icon.href, bounds, overlayOptions);

        if (!!doc) {
            doc.ggroundoverlays = doc.ggroundoverlays || [];
            doc.ggroundoverlays.push(overlay);
        }

        return overlay;
    };

//----------------------------------------------------------------



    return {
        // Expose some properties and methods
        options: parserOptions,
        docs: docs,
        boundsAll: boundsAll,
        hideDocument: hideDocument,
        showDocument: showDocument,
        parse: parse,
        activatePlacemarks: activatePlacemarks,

        //render: render,
        //parseKmlString: parseKmlString,
        //processStyles: processStyles,
        //createMarker: createMarker,
        //createOverlay: createOverlay,
        //createPolyline: createPolyline,
        //createPolygon: createPolygon
    };
};
// End of KML Parser

//--------------------------------------------------------------//

// Extraxct Opacity from color atributes in kML when it exits (1 if not)
geoXML3.getOpacity = function (kmlColor) {
    // Extract opacity encoded in a KML color value. Returns a number between 0 and 1.
    if (!!kmlColor &&
        (kmlColor !== '') &&
        (kmlColor.length == 8)) {
        var transparency = parseInt(kmlColor.substr(0, 2), 16);
        return transparency / 255;
    } else {
        return 1;
    }
};

// Log a message to the debugging console, if one exists
geoXML3.log = function (msg) {
    if (!!window.console) {
        console.log(msg);
    } else { alert("log:" + msg); }
};

// Combine two options objects: a set of default values and a set of override values 
geoXML3.combineOptions = function (overrides, defaults) {
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


/**
 * Parses the given XML string and returns the parsed document in a
 * DOM data structure. This function will return an empty DOM node if
 * XML parsing is not supported in this browser.
 * @param {string} str XML string.
 * @return {Element|Document} DOM.
 */
geoXML3.xmlParse = function (str) {
    if ((typeof ActiveXObject != 'undefined') || ("ActiveXObject" in window)) {
        var doc = new ActiveXObject('Microsoft.XMLDOM');
        doc.loadXML(str);
        return doc;
    }

    if (typeof DOMParser != 'undefined') {
        return (new DOMParser()).parseFromString(str, 'text/xml');
    }

    return document.createElement('div', null);
}

// from http://stackoverflow.com/questions/11563554/how-do-i-detect-xml-parsing-errors-when-using-javascripts-domparser-in-a-cross
geoXML3.isParseError = function (parsedDocument) {
    if ((typeof ActiveXObject != 'undefined') || ("ActiveXObject" in window))
        return false;
    // parser and parsererrorNS could be cached on startup for efficiency
    var p = new DOMParser(),
        errorneousParse = p.parseFromString('<', 'text/xml'),
        parsererrorNS = errorneousParse.getElementsByTagName("parsererror")[0].namespaceURI;

    if (parsererrorNS === 'http://www.w3.org/1999/xhtml') {
        // In PhantomJS the parseerror element doesn't seem to have a special namespace, so we are just guessing here :(
        return parsedDocument.getElementsByTagName("parsererror").length > 0;
    }

    return parsedDocument.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0;
};

//AjaxGet asincrono para traer un fichero dado por su url (similar a miAjaxGet
geoXML3.fetchXML = function (url, callback) {
    function timeoutHandler() {
        geoXML3.log('XHR timeout');
        callback();
    };

    var xhrFetcher = new Object();
    if (!!geoXML3.fetchers.length) {
        xhrFetcher = geoXML3.fetchers.pop();
    } else {
        if (!!window.XMLHttpRequest) {
            xhrFetcher.fetcher = new window.XMLHttpRequest(); // Most browsers
        } else if (!!window.ActiveXObject) {
            xhrFetcher.fetcher = new window.ActiveXObject('Microsoft.XMLHTTP'); // Some IE
        }
    }

    if (!xhrFetcher.fetcher) {
        geoXML3.log('Unable to create XHR object');
        callback(null);
    } else {
        xhrFetcher.fetcher.open('GET', url, true);
        if (xhrFetcher.fetcher.overrideMimeType) {
            xhrFetcher.fetcher.overrideMimeType('text/xml');
        }
        xhrFetcher.fetcher.onreadystatechange = function () {
            if (xhrFetcher.fetcher.readyState === 4) {
                // Retrieval complete
                if (!!xhrFetcher.xhrtimeout)
                    clearTimeout(xhrFetcher.xhrtimeout);
                if (xhrFetcher.fetcher.status >= 400) {
                    geoXML3.log('HTTP error ' + xhrFetcher.fetcher.status + ' retrieving ' + url);
                    callback();
                } else {
                    // Returned successfully
                    var xml = geoXML3.xmlParse(xhrFetcher.fetcher.responseText);
                    if (xml.parseError && (xml.parseError.errorCode != 0)) {
                        geoXML3.log("XML parse error " + xml.parseError.errorCode + ", " + xml.parseError.reason + "\nLine:" + xml.parseError.line + ", Position:" + xml.parseError.linepos + ", srcText:" + xml.parseError.srcText);
                        xml = "failed parse"
                    } else if (geoXML3.isParseError(xml)) {
                        geoXML3.log("XML parse error");
                        xml = "failed parse"
                    }
                    callback(xml);
                }
                // We're done with this fetcher object
                geoXML3.fetchers.push(xhrFetcher);
            }
        };
        xhrFetcher.xhrtimeout = setTimeout(timeoutHandler, geoXML3.xhrTimeout);
        xhrFetcher.fetcher.send(null);
    }
};

//nodeValue: Extract the text value of a DOM node, with leading and trailing whitespace trimmed
geoXML3.nodeValue = function (node, defVal) {
    var retStr = "";
    if (!node) {
        return (typeof defVal === 'undefined' || defVal === null) ? '' : defVal;
    }
    if (node.nodeType == 3 || node.nodeType == 4 || node.nodeType == 2) {
        retStr += node.nodeValue;
    } else if (node.nodeType == 1 || node.nodeType == 9 || node.nodeType == 11) {
        for (var i = 0; i < node.childNodes.length; ++i) {
            retStr += arguments.callee(node.childNodes[i]);
        }
    }
    return retStr;
};