/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var sentinel2 = ee.ImageCollection("COPERNICUS/S2"),
    climate = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR"),
    dtm = ee.Image("USGS/SRTMGL1_003"),
    StudyArea = /* color: #23cba7 */ee.Geometry.MultiPoint();
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//"APIPRO MAP" Version 1.10
// DATA 22 GEN 2025
//Developer: Dott. Johnny Moretto, Ph.D.
//E-mail: johnny.moretto@ateagroup.it 
//Cell. +39 3491246671 

//SCOPO SCRIPT:
//Generare mappe di potenzialità mellifera e pollinica
    
//APIPRO PROJECJ  - INNOVATION BROKERING - VERSION 1.1

/////////////////////////////////A) IMPOSTAZIONI VISUALIZZAZIONE INIZIALE: SOFODO E CENTRO MAPPA////////////////////////////////////////////////////////////////
Map.setOptions('SATELLITE');
Map.setCenter(12.4319, 45.7278, 10);

/////////////////////////////////B) PALETTE COLORI ////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Palette per NDVI (puoi modificare i colori se necessario)
var NDVI_palette = {
  min: 0, 
  max: 12, 
  palette: ['440000','920000','F20000','F25900', 'F2A100', 'F2C900', 'E2F200', 'B1F200', '71F200', '59B707','418605', '336605', '244A03']};

// Palette per NDRE (puoi modificare i colori se necessario)
var NDRE_palette = {
  min: 0,
  max: 9,
  palette: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837']
};

// Palette per GDD cumulati (puoi modificare i colori se necessario)
var GDD_palette = {
  min: 0, 
  max: 400, 
  palette: ['FF3300','FF6F00','FFA200','FFC400', 'FFFF00','CDFF00','91FF00','09FF00', '00FF80', '00FFD5', '00F7FF', '00DEFF', '00B3FF', '0089FF','006FFF', '004DFF', '0011FF', '000ED1', '020DAC', '010975']};
  
// Palette per DTM (puoi modificare i colori se necessario)
var DTM_palette = {
  min: 0,
  max: 3000,
  palette: ['#edf8fb', '#ccece6', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081', '#062a65', '#041a41', '#031330', '#010c1d']
};


// Palette di colori e le etichette per le classi CORINE
    var corineClasses = [
      {code: 111, label: 'Tessuto urbano continuo', color: '#ff0000'},
      {code: 112, label: 'Tessuto urbano discontinuo', color: '#ff7f00'},
      {code: 121, label: 'Unità industriali o commerciali', color: '#ffff00'},
      {code: 122, label: 'Reti di trasporto e aree connesse', color: '#00ff00'},
      {code: 123, label: 'Aree portuali', color: '#0000ff'},
      {code: 124, label: 'Aeroporti', color: '#4b0082'},
      {code: 131, label: 'Siti di estrazione mineraria', color: '#9400d3'},
      {code: 132, label: 'Discariche', color: '#8b4513'},
      {code: 133, label: 'Cantieri', color: '#fa8072'},
      {code: 141, label: 'Aree verdi urbane', color: '#7fff00'},
      {code: 142, label: 'Impianti sportivi e ricreativi', color: '#d2b48c'},
      {code: 211, label: 'Terreni arabili non irrigati', color: '#ffd700'},
      {code: 212, label: 'Terreni arabili irrigati permanentemente', color: '#daa520'},
      {code: 213, label: 'Risaie', color: '#b8860b'},
      {code: 221, label: 'Vigneti', color: '#ff69b4'},
      {code: 222, label: 'Frutteti e piantagioni di bacche', color: '#ff1493'},
      {code: 223, label: 'Oliveti', color: '#db7093'},
      {code: 231, label: 'Pascoli', color: '#006400'},
      {code: 241, label: 'Colture annuali associate a colture permanenti', color: '#8fbc8f'},
      {code: 242, label: 'Sistemi colturali complessi', color: '#20b2aa'},
      {code: 243, label: 'Mosaico di colture e vegetazione naturale', color: '#3cb371'},
      {code: 244, label: 'Aree agroforestali', color: '#2e8b57'},
      {code: 311, label: 'Foreste di latifoglie', color: '#228b22'},
      {code: 312, label: 'Foreste di conifere', color: '#32cd32'},
      {code: 313, label: 'Foreste miste', color: '#008000'},
      {code: 321, label: 'Prati naturali', color: '#adff2f'},
      {code: 322, label: 'Brughiere e cespugli', color: '#7cfc00'},
      {code: 323, label: 'Vegetazione sclerofilla', color: '#00ff00'},
      {code: 324, label: 'Boschi in evoluzione', color: '#7fff00'},
      {code: 331, label: 'Spiagge, dune e sabbie', color: '#f5deb3'},
      {code: 332, label: 'Rocce nude', color: '#a9a9a9'},
      {code: 333, label: 'Aree scarsamente vegetate', color: '#d3d3d3'},
      {code: 334, label: 'Aree bruciate', color: '#000000'},
      {code: 335, label: 'Ghiacciai e nevi perenni', color: '#ffffff'},
      {code: 411, label: 'Paludi interne', color: '#6b8e23'},
      {code: 412, label: 'Torbiere', color: '#556b2f'},
      {code: 421, label: 'Paludi salmastre', color: '#2f4f4f'},
      {code: 422, label: 'Saline', color: '#708090'},
      {code: 423, label: 'Piane tidali', color: '#778899'},
      {code: 511, label: 'Corsi d\'acqua', color: '#4169e1'},
      {code: 512, label: 'Corpi idrici', color: '#4682b4'},
      {code: 521, label: 'Lagune costiere', color: '#0000ff'},
      {code: 522, label: 'Estuari', color: '#00008b'},
      {code: 523, label: 'Mare e oceano', color: '#191970'}
    ]; 
  

///////////////////////////////// C) TOOL DISEGNO POLIGONO ////////////////////////////////////////////////////////////////////////////////////////////////////////////
var drawingTools = Map.drawingTools();
drawingTools.setShown(false);

//clear existing geometries
while (drawingTools.layers().length() > 0) {
  var layer = drawingTools.layers().get(0);
  drawingTools.layers().remove(layer);
}

//dummy geometryLayer
var dummyGeometry =
ui.Map.GeometryLayer({geometries: null, name: 'StudyArea', color: '23cba7'});

drawingTools.layers().add(dummyGeometry);

//DRAWING BUTTONS

//1. Clear geometry
function clearGeometry () {
  var layers = drawingTools.layers();
  layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}

//2. funzionidisegno
//poligono
function drawPolygon() {
  clearGeometry();
  drawingTools.setShape('polygon');
  drawingTools.draw();
}

var symbol = {
  polygon: '🔺',
};

///////////////////////////////// D) USER INTERFACE ELEMENTS ////////////////////////////////////////////////////////////////////////////////////////////////////////////

//TEXT BOX START RICERCA IMMAGINE
var dataSTAR = ui.Textbox('YYYY-MM-DD','2024-04-01');
   
//TEXT BOX STOP RICERCA IMMAGINE
var dataEN = ui.Textbox('YYYY-MM-DD','2024-05-01');

//LIST BOX SCELTA FIORITURA
var flower = ui.Select({
  items: ['Tarassaco', 'Acacia', 'Castagno', 'Rododendro', 'Tiglio', 'Barena'],
  placeholder: 'Seleziona la fioritura',
  value: 'Tarassaco',
  style: {width: '250px'}
  });

//TEXT BOX DATA START ACCUMULO GDD
//var dataSTARGDD = ui.Textbox('YYYY-MM-DD','2024-01-01');

  
  // Aggiungiamo elementi UI per consentire all'utente di selezionare un intervallo di date per il grafico
var plotDataStart = ui.Textbox({
  placeholder: 'YYYY-MM-DD',
  value: '2019-01-01',
  style: {width: '250px'}
});

var plotDataEnd = ui.Textbox({
  placeholder: 'YYYY-MM-DD',
  value: '2024-12-31',
  style: {width: '250px'}
});
 
// Pulsante per generare il grafico
var plotButton = ui.Button('Genera Grafico');
  

  //BOTTON
  var RunButton = ui.Button('RUN');
  var resetButton = ui.Button('Reset Data');
  
  
///////////////////////////////// E) USER INTERFACE (Pannello Principale - Con Minimizzazione) ////////////////////////////////////////////////////////////////////////////////////////////////////////////

var controlPanelDSS = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: { width: '320px', height: '600px', position: 'top-left' }
});

// --- PULSANTE MINIMIZZA (Opzione 2) ---
var minimizeButton = ui.Button({
    label: '➖', // Usa un simbolo meno per indicare la minimizzazione
    style: { width: '30px', margin: '0 0 0 auto' } // Posiziona il pulsante in centro
});
controlPanelDSS.insert(0, minimizeButton); // Inserisci *prima* degli altri elementi

var isMinimized = false; // Tiene traccia dello stato (minimizzato o no)
var originalHeight;     // Memorizza l'altezza originale

minimizeButton.onClick(function() {
    if (isMinimized) {
        // Ripristina
        controlPanelDSS.style().set('height', originalHeight);
        minimizeButton.setLabel('➖');
        // Mostra tutti gli elementi tranne il pulsante di minimizzazione
        controlPanelDSS.widgets().forEach(function(widget, index) {
            if (index !== 0) { // Non mostrare il pulsante di minimizzazione
                widget.style().set('shown', true);
            }
        });
        isMinimized = false;
    } else {
        // Minimizza
        originalHeight = controlPanelDSS.style().get('height'); // Salva l'altezza
        controlPanelDSS.style().set('height', '30px');      // Imposta un'altezza minima
        minimizeButton.setLabel('➕');
         // Nascondi tutti gli elementi tranne il pulsante
        controlPanelDSS.widgets().forEach(function(widget, index) {
            if (index !== 0) {  // Non nascondere il pulsante di minimizzazione
                widget.style().set('shown', false);
            }
        });

        isMinimized = true;
    }
});

// --- RESTO DELL'INTERFACCIA (come prima, ma senza opzioni avanzate) ---

// 1. TITOLO E INTRODUZIONE
controlPanelDSS.add(ui.Label('ApiPRO MAP', { fontWeight: 'bold', fontSize: '24px', margin: '10px 5px' }));
controlPanelDSS.add(ui.Label('Strumento per la stima della potenzialità mellifera.', { fontSize: '14px' }));

// 2. SEZIONE DISEGNO AREA
var drawSection = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '10px 0', border: '1px solid gray', padding: '8px' }
});

drawSection.add(ui.Label('1. Disegna l\'area di interesse:', { fontWeight: 'bold' }));
drawSection.add(ui.Label('Clicca sul pulsante e poi sulla mappa per disegnare un poligono.', { fontSize: '12px' }));
drawSection.add(ui.Button({
    label: symbol.polygon + ' Disegna Poligono',
    onClick: drawPolygon,
    style: { stretch: 'horizontal' }
}));
controlPanelDSS.add(drawSection);

// 3. SEZIONE DATE
var dateSection = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '10px 0', border: '1px solid gray', padding: '8px' }
});

dateSection.add(ui.Label('2. Seleziona il periodo per l\'immagine satellitare:', { fontWeight: 'bold' }));
dateSection.add(ui.Label('Inizio (15-20 giorni prima della fioritura):', { fontSize: '12px' }));
dateSection.add(dataSTAR);
dateSection.add(ui.Label('Fine (data della fioritura/volo):', { fontSize: '12px' }));
dateSection.add(dataEN);
controlPanelDSS.add(dateSection);

// 4. SEZIONE FIORITURA
var flowerSection = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '10px 0', border: '1px solid gray', padding: '8px' }
});
flowerSection.add(ui.Label('3. Seleziona la fioritura:', { fontWeight: 'bold' }));
flowerSection.add(flower);
controlPanelDSS.add(flowerSection);

// 5. SEZIONE GRAFICO
var plotSection = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: { margin: '10px 0', border: '1px solid gray', padding: '8px' }
});

plotSection.add(ui.Label('4. Impostazioni Grafico (opzionale):', { fontWeight: 'bold' }));
plotSection.add(ui.Label('Data inizio:', { fontSize: '12px' }));
plotSection.add(plotDataStart);
plotSection.add(ui.Label('Data fine:', { fontSize: '12px' }));
plotSection.add(plotDataEnd);
plotSection.add(plotButton);
controlPanelDSS.add(plotSection);

// 6. SEZIONE ESECUZIONE E RESET
var runSection = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'), // Pulsanti affiancati
  style: { margin: '10px 0', padding: '8px' }
});
runSection.add(RunButton);
runSection.add(resetButton);
controlPanelDSS.add(runSection);

// Aggiungi il pannello principale alla mappa
Map.add(controlPanelDSS);

///////////////////////////////// F) FUNZIONE PRINCIPALE (DSS) ////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////// PULSANTE RUN (con minimizzazione automatica, opzionale) ///////////////////////
RunButton.onClick(function() {
    DSS(); // Esegui la funzione principale

    // Opzionale: Minimizza automaticamente dopo aver premuto RUN
    if (!isMinimized) {  // Minimizza solo se non è già minimizzato
        minimizeButton.onClick(); // Simula un click sul pulsante di minimizzazione
    }
});

////////////////////////// PULSANTE RESET (modificato) ////////////////////////////////////
resetButton.onClick(function() {
 // Resetta i campi di input
  dataSTAR.setValue('2024-04-01');
  dataEN.setValue('2024-05-01');
  flower.setValue('Tarassaco');
  plotDataStart.setValue('2019-01-01');
  plotDataEnd.setValue('2024-12-31');

  // Rimuovi eventuali layer aggiunti alla mappa
    Map.layers().reset();
  // Rimuovi la geometria disegnata
  clearGeometry();
    drawingTools.setShape(null); // Assicurati che lo strumento di disegno sia disattivato

  // Rimuovi eventuali pannelli aggiunti (outputPanel, plotPanel, corineLegendPanel)
    Map.remove(Map.widgets().get(1));
    Map.remove(Map.widgets().get(1));
    Map.remove(Map.widgets().get(1));

    // Se è minimizzato, ripristina il pannello principale
    if (isMinimized) {
        minimizeButton.onClick(); // Simula un click
    }
});
//runSection.add(RunButton);
//runSection.add(resetButton);
//controlPanelDSS.add(runSection);

// Aggiungi il pannello principale alla mappa
//Map.add(controlPanelDSS);

///////////////////////////////// F) FUNCTION TO RUN WITH "RUN BOTTON" ////////////////////////////////////////////////////////////////////////////////////////////////////////////

function DSS() {
  
  
    ///////GET VALUE FROM PANEL
    var dataSTART = dataSTAR.getValue();
    var dataEND = dataEN.getValue();
    var flowers = flower.getValue();
    //var dataSTARTGDD = dataSTARGDD.getValue();

    //estrai l'anno
    var endYear = dataEND.slice(0, 4);       // es. "2024"
 
   ////////////////////////////////////////////////////////////
   //get object from drawing tools
   var aoi = drawingTools.layers().get(0).getEeObject();
  
   ////METTERE QUA QUELLO CHE DEVE FARE
  
    // 1) CALCOLO NDVI + NDRE AREA DI INTERESSE
  
   //AREA E PERIMETRO CAMPO DISEGNATO
    var surf = aoi.area();
    
    //PRINT PER PER PANNELLO
    var surf_pr = surf.getInfo();
    var surf_print = surf_pr.toFixed(2);

    var perim = aoi.perimeter();
    //PRINT PER PER PANNELLO
    var perim_pr = perim.getInfo();
    var perim_print = perim_pr.toFixed(2);
    
    ////////////////////////////////////////////////////////////
    //load only image fixed by point
    var spatialFiltered = sentinel2.filterBounds(StudyArea);
    //print ('spatialFiltered', spatialFiltered);

    // Get the least cloudy image in the specified range.
    var image = ee.Image(
      sentinel2.filterBounds(aoi)
        .filterDate(dataSTART, dataEND)
        .sort('CLOUDY_PIXEL_PERCENTAGE')
        .first() //si prende l'immagine del mese con meno nuvole
    );

      print ('image', image);

    /////NDVI
    
    // Compute the Normalized Difference Vegetation Index (NDVI).
    var nir = image.select('B8');
    var red = image.select('B4');
    var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
    
    //NDVI STATISTICS
    // Compute the mean NDVI in the polygon
    var NDVI_mean = ndvi.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: aoi, //poligono
      scale: 10 //pixel resolution
    });
    
    //print ('MEAN NDVI', NDVI_mean);
    //PRINT PER PER PANNELLO
    var NDVI_mean_pr = NDVI_mean.getInfo();
    var NDVI_mean_print = NDVI_mean_pr.NDVI;
    
    
    // Compute the min NDVI in the polygon
    var NDVI_min = ndvi.reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: aoi, //poligono
      scale: 10 //pixel resolution
    });
    
    //PRINT PER PER PANNELLO
    var NDVI_min_pr = NDVI_min.getInfo();
    var NDVI_min_print = NDVI_min_pr.NDVI;
    
    //print ('MIN NDVI', NDVI_min);
    
    // Compute the max NDVI in the polygon
    var NDVI_max = ndvi.reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: aoi, //poligono
      scale: 10 //pixel resolution
    });
    
    //print ('MAX NDVI', NDVI_max);
    
    //PRINT PER PER PANNELLO
    var NDVI_max_pr = NDVI_max.getInfo();
    var NDVI_max_print = NDVI_max_pr.NDVI;
    
    ///////////////////////////////MAPPA CLASSIFICATA NDVI
      // classifica immagine secondo soglie preimpostate
      var band1 = ndvi.select('NDVI');
      var thresholds1 = band1
          .where(band1.lte(0.2), 0)
          .where(band1.gt(0.2).and(band1.lte(0.25)), 1)
          .where(band1.gt(0.25).and(band1.lte(0.3)), 2)
          .where(band1.gt(0.3).and(band1.lte(0.35)), 3)
          .where(band1.gt(0.35).and(band1.lte(0.4)), 4)
          .where(band1.gt(0.4).and(band1.lte(0.45)), 5)
          .where(band1.gt(0.45).and(band1.lte(0.5)), 6)
          .where(band1.gt(0.5).and(band1.lte(0.55)), 7)
          .where(band1.gt(0.55).and(band1.lte(0.6)), 8)
          .where(band1.gt(0.6).and(band1.lte(0.65)), 9)
          .where(band1.gt(0.65).and(band1.lte(0.7)), 10)
          .where(band1.gt(0.75).and(band1.lte(0.8)), 11)
          .where(band1.gt(0.8), 12);
    
      var fin1 = ndvi.addBands(thresholds1.rename('thresh'));
      
      // 3) DISPLAY MAP
      // immagine primo periodo classificata
      Map.addLayer(fin1.select('thresh').clip(aoi), NDVI_palette, 'NDVI');
      
      ///// NDRE
    
    // Compute the Normalized Difference Red Edge Index (NDRE).
    //var nir = image.select('B8');
    var redEdge = image.select('B5');
    var ndre = nir.subtract(redEdge).divide(nir.add(redEdge)).rename('NDRE');
    
    // NDRE STATISTICS
    // Compute the mean NDRE in the polygon
    var NDRE_mean = ndre.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: aoi, // poligono
      scale: 10 // pixel resolution
    });
    
    //PRINT PER PANNELLO
    var NDRE_mean_pr = NDRE_mean.getInfo();
    var NDRE_mean_print = NDRE_mean_pr.NDRE;
    
    // Compute the min NDRE in the polygon
    var NDRE_min = ndre.reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: aoi, // poligono
      scale: 10 // pixel resolution
    });
    
    //PRINT PER PANNELLO
    var NDRE_min_pr = NDRE_min.getInfo();
    var NDRE_min_print = NDRE_min_pr.NDRE;
    
    // Compute the max NDRE in the polygon
    var NDRE_max = ndre.reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: aoi, // poligono
      scale: 10 // pixel resolution
    });
    
    //PRINT PER PANNELLO
    var NDRE_max_pr = NDRE_max.getInfo();
    var NDRE_max_print = NDRE_max_pr.NDRE;
    
    /////////////////////////////// MAPPA CLASSIFICATA NDRE
    // Classifica l'immagine secondo soglie preimpostate
    var band2 = ndre.select('NDRE');
    var thresholds2 = band2
        .where(band2.lte(0.0), 0)
        .where(band2.gt(0.0).and(band2.lte(0.05)), 1)
        .where(band2.gt(0.05).and(band2.lte(0.1)), 2)
        .where(band2.gt(0.1).and(band2.lte(0.15)), 3)
        .where(band2.gt(0.15).and(band2.lte(0.2)), 4)
        .where(band2.gt(0.25).and(band2.lte(0.3)), 5)
        .where(band2.gt(0.3).and(band2.lte(0.35)), 6)
        .where(band2.gt(0.35).and(band2.lte(0.4)), 7)
        .where(band2.gt(0.45).and(band2.lte(0.5)), 8)
        .where(band2.gt(0.55), 9);
    
    var fin2 = ndre.addBands(thresholds2.rename('thresh'));
    
    // 3) DISPLAY MAP
    // Immagine classificata del primo periodo
    Map.addLayer(fin2.select('thresh').clip(aoi), NDRE_palette, 'NDRE');
 
  ////////////////////////////
      
      // 4) ATTRIBUISCI VALORE 1 ALLE AREE ENTRO IL RANGE E ZERO NELLE ALTRE
      // 5) CALCOLO GDD ENTRO IL RANGE TEMPORALE DEFINITO
      // 6) ESTRAI AREE CHE SUPERANO VALORE SOGLIA
      // 7) ATTRIBUISCI VALORE 1 ALLE AREE ENTRO IL RANGE E ZERO NELLE ALTRE
      // 8) CALCOLA USO DEL SUOLO CORINEE
      
      // 8.1) CARICAMENTO E VISUALIZZAZIONE DELL'USO DEL SUOLO CORINE
    
    // Carica l'immagine CORINE Land Cover per il 2018
    var corine = ee.Image('COPERNICUS/CORINE/V20/100m/2018').select('landcover');
    
    // Clip l'immagine all'area di interesse
    var corineClipped = corine.clip(aoi);
    
    // Aggiungi il layer CORINE alla mappa
    //Map.addLayer(corineClipped, {}, 'Uso del suolo CORINE');  
    
    //////////////////////FUNZIONE PER ASSOCIARE I COLORI DELLE CLASSI DATE
    
    //FUNZIONE PER GENERARE L’SLD DATO L’ARRAY corineClasses 
      function buildCorineSLD(classes) {
        // intestazione SLD
        var sld = '<RasterSymbolizer>' +
                  '  <ColorMap type="values" extended="false">';
                  
        // per ogni classe corine, aggiungiamo un ColorMapEntry
        classes.forEach(function(c) {
          sld += '    <ColorMapEntry ' +
            'color="' + c.color + '" ' +
            'quantity="' + c.code + '" ' +  // Earth Engine si aspetta il valore 'quantity'
            'label="' + c.label + '"/>';
        });
      
        // chiusura SLD
        sld += '  </ColorMap>' +
               '</RasterSymbolizer>';
      
        return sld;
      }
    
    // CREIAMO LA STRINGA SLD A PARTIRE DALLA NOSTRA LISTA
      var corineSLD = buildCorineSLD(corineClasses);
    
    // APPLICHIAMO LO STILE SLD ALL’IMMAGINE
      var styledCorine = corineClipped.sldStyle(corineSLD);
    
    // VISUALIZZIAMO IN MAPPA
      Map.addLayer(styledCorine, {}, 'Uso del suolo CORINE (SLD)');
   
    ////////////FUNZIONE PER CREARE LE CLASSI
    
    function makeLegendRow(color, name) {
        var colorBox = ui.Label({
          value: '',
          style: {
            backgroundColor: color,
            // dimensione del quadratino
            padding: '10px',  
            margin: '0 8px 0 0'
          }
        });
        var description = ui.Label({
          value: name,
          style: { margin: '0 0 0 4px' }
        });
        return ui.Panel({
          widgets: [colorBox, description],
          layout: ui.Panel.Layout.Flow('horizontal'),
          style: { margin: '2px 0' }
        });
      }
      
      
    ///////////////////////////////////////////////////////////////////////////////  

      // 13) CALCOLA AREA
      // 14) CALCOLA POTENZIALE MELLIFERO E NETTARIFERO FIORITURA
      // 15) DISPLAY REPORT
      
   
   /////////////////////////// ESTRAI VALORI SOGLIA DALLA LISTA FIORITURE
   // Recupera il valore selezionato dall'utente nella list box "flower"
    var selectedFlower = flower.getValue();
    
    // Definiamo variabili per le soglie
    var ndviThreshold, ndreThreshold, selectedUseCodes, dtmMin, dtmMax, gddLimit, baseTemp, data_startGDD;
    
      // Imposta i valori soglia in base alla fioritura selezionata
      switch (selectedFlower) {
        case 'Tarassaco':
          ndviThreshold   = 0.25;
          ndreThreshold   = 0.08;
          selectedUseCodes= [211, 213];      // Aree agricole e mosaici colturali
          dtmMin          = 0;
          dtmMax          = 500;
          gddLimit        = 250;            // Accumulo GDD richiesto
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
        case 'Acacia':
          ndviThreshold   = 0.32;
          ndreThreshold   = 0.11;
          selectedUseCodes= [211, 212];      // Terreni arabili
          dtmMin          = 50;
          dtmMax          = 550;
          gddLimit        = 330;
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
        case 'Castagno':
          ndviThreshold   = 0.45;
          ndreThreshold   = 0.18;
          selectedUseCodes= [311, 313];      // Foreste (latifoglie/miste)
          dtmMin          = 300;
          dtmMax          = 900;
          gddLimit        = 420;
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
        case 'Rododendro':
          ndviThreshold   = 0.27;
          ndreThreshold   = 0.11;
          selectedUseCodes= [321, 322, 323];  // Praterie, brughiere e sclerofilla
          dtmMin          = 900;
          dtmMax          = 2100;
          gddLimit        = 230;
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
        case 'Tiglio':
          ndviThreshold   = 0.37;
          ndreThreshold   = 0.15;
          selectedUseCodes= [141, 142];      // Aree verdi urbane / impianti sportivi/ricreativi
          dtmMin          = 0;
          dtmMax          = 400;
          gddLimit        = 330;
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
        case 'Barena':
          ndviThreshold   = 0.35;
          ndreThreshold   = 0.13;
          selectedUseCodes= [411, 412];      // Paludi interne e torbiere
          dtmMin          = 0;
          dtmMax          = 250;
          gddLimit        = 260;
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
        default:
          ndviThreshold   = 0.30;
          ndreThreshold   = 0.10;
          selectedUseCodes= [221, 112, 133];
          dtmMin          = 0;
          dtmMax          = 500;
          gddLimit        = 300;
          baseTemp        = 5;
          data_startGDD   = "01-01";        // 1° gennaio
          break;
      }
     
   ////////////////////////// MAPPA ELEVAZIONE DTM
       // Ritaglia la mappa DTM all'area di interesse "aoi"
    var dtmClipped = dtm.clip(aoi);
    
    // Visualizza la mappa DTM non binaria
    // Impostando ad esempio min e max per evidenziare le variazioni di elevazione.
    // La palette scelta qui è esemplificativa; puoi modificarla in base alle tue preferenze.
    Map.addLayer(
      dtmClipped,
      DTM_palette,
      'DTM - Non Binary (Elevazione)',
      false  // Imposta false per non attivare il layer all'avvio oppure true se vuoi visualizzarlo subito
    );
    
   ////////////////////////////MAPPA GDD

      // Combina l'anno ottenuto con il mese-giorno consigliato per ottenere la data completa
      var startGDDStr = endYear + "-" + data_startGDD;  // es. "2024-01-01" o "2024-01-15"
      var startGDD = ee.Date(startGDDStr);

      // Calcola i GDD a partire dalla data specificata in dataSTARGDD fino a dataEN 
      // (in questo esempio si usa dataEN; puoi sostituire con ee.Date.now() se preferisci accumulare fino ad oggi)
      //var startGDD = ee.Date(dataSTARGDD.getValue());
      var endGDD   = ee.Date(dataEN.getValue());
      
      // Filtra la collezione climatica (ERA5_LAND/DAILY_AGGR) per l'aoi e il periodo
      var climateCollection = climate.filterBounds(aoi)
                                     .filterDate(startGDD, endGDD);
      
      // -- Mappa: per ogni immagine calcola la temperatura media e i GDD giornalieri --
      // In questo esempio usiamo le bande "temperature_2m_max" e "temperature_2m_min"
      // e calcoliamo la media poi convertiamo in °C (dati in Kelvin).
      var dailyGDDCollection = climateCollection.map(function(img) {
        // Calcola la temperatura media in Kelvin
        var tMeanK = img.select('temperature_2m_max')
                        .add(img.select('temperature_2m_min'))
                        .divide(2);
        // Converti in °C
        var tMeanC = tMeanK.subtract(273.15);
        // Calcola il GDD giornaliero: max( TmeanC - baseTemp, 0 )
        var gddDaily = tMeanC.subtract(baseTemp).max(0).rename('GDD_daily');
        return gddDaily;
      });
      
      // Somma (accumula) i GDD giornalieri nel periodo
      var accumulatedGDD = dailyGDDCollection.sum().rename('Accumulated_GDD');
      
      // Ritaglia l'immagine dei GDD per l'aoi
      var gddClipped = accumulatedGDD.clip(aoi);
      
      // Visualizza la mappa dei GDD accumulati (non binaria)
      // Imposto il range da 0 a un valore superiore al limite, ad esempio gddLimit * 1.5, e una palette esemplificativa
      Map.addLayer(
        gddClipped,
        GDD_palette,
        'Accumulated GDD'
      );
         
   /////////////////////////// MAPPA BINARIA NDVI
   
    // Creiamo una mappa binaria:
    //   1 se NDVI > 0.3
    //   0 altrimenti
    var ndviBinary = ndvi.gt(ndviThreshold);
    
    // Ritagliamo (clip) la mappa binaria sull'area di interesse:
    var ndviBinaryClipped = ndviBinary.clip(aoi);
  
    // Visualizzazione su mappa, usando una palette semplice: 
    //  0 = bianco, 1 = rosso (ad esempio)
    Map.addLayer(
      ndviBinaryClipped.selfMask(), 
      {palette: ['white', 'red']}, 
      'Mappa binaria NDVI (>= ' + ndviThreshold + ')',
      false  // Imposta false per non attivare il layer all'avvio oppure true se vuoi visualizzarlo subito
    );
    
    /////////////////////////// MAPPA BINARIA NDRE
   
    var ndreBinary = ndre.gt(ndreThreshold);
    
    // Ritagliamo (clip) la mappa binaria sull'area di interesse:
    var ndreBinaryClipped = ndreBinary.clip(aoi);
    
    // Visualizziamo in mappa con due colori (valore 0 e 1).
    Map.addLayer(
      ndreBinaryClipped, 
      {min: 0, max: 1, palette: ['white', 'blue']}, 
      'Mappa binaria NDRE (>= ' + ndreThreshold + ')',
      false  // Imposta false per non attivare il layer all'avvio oppure true se vuoi visualizzarlo subito
    );
      
    /////////////////////////// MAPPA BINARIA USO DEL SUOLO PER CLASSI SELEZIONATE
    
    // Crea la mappa binaria: 
    // Per ogni pixel, se il valore è pari a 221 (Vigneti), 112 (Tessuto urbano discontinuo) o 133 (Cantieri),
    // allora il pixel assume valore 1, altrimenti 0.
      var useBinary = corine.eq(selectedUseCodes[0]);
      for (var i = 1; i < selectedUseCodes.length; i++) {
        useBinary = useBinary.or(corine.eq(selectedUseCodes[i]));
      }
    
    // Ritaglia (clip) la mappa binaria all'area di interesse
    var useBinaryClipped = useBinary.clip(aoi);
    
    // Visualizza in mappa:
    // I pixel con valore 0 saranno colorati di bianco, quelli con valore 1 (le classi di interesse)
    // saranno colorati di rosso.
    Map.addLayer(
      useBinaryClipped, 
      {min: 0, max: 1, palette: ['white', 'red']}, 
      'Uso del suolo binario',
      false  // Imposta false per non attivare il layer all'avvio oppure true se vuoi visualizzarlo subito
    );
    
    /////////////////////////// MAPPA BINARIA DTM
    var dtmBinary = dtm.gte(dtmMin).and(dtm.lte(dtmMax)).rename('dtm_binary');
    var dtmBinaryClipped  = dtmBinary.clip(aoi);
    
    /***** 4. Visualizzazione dei layer singoli *****/
        Map.addLayer(
      dtmBinaryClipped,
      {min: 0, max: 1, palette: ['white', 'brown']},
      'Elevazione (DTM) Binary (' + dtmMin + ' - ' + dtmMax + ' m)',
      false  // Imposta false per non attivare il layer all'avvio oppure true se vuoi visualizzarlo subito
    );
    
    /////////////////////////// MAPPA BINARIA GDD
          // -- Crea la mappa binaria per i GDD: 1 se l'accumulo è >= gddLimit, 0 altrimenti
      var gddBinary = gddClipped.gte(gddLimit).rename('gdd_binary');
      
      // Ritaglia la mappa binaria dei GDD
      var gddBinaryClipped = gddBinary.clip(aoi);
      
      // Visualizza la mappa binaria dei GDD
      Map.addLayer(
        gddBinaryClipped,
        {min: 0, max: 1, palette: ['white', 'magenta']},
        'GDD Binary (>= ' + gddLimit + ')',
      false  // Imposta false per non attivare il layer all'avvio oppure true se vuoi visualizzarlo subito
      );
      
    /////////////////////////// SOMMA MAPPE BINARIE PER INDICE DI PROBABILITA' FIORITURA  
      
    var finalIndexMap = ndviBinaryClipped
                        .add(ndreBinaryClipped)
                        .add(useBinaryClipped)
                        .add(dtmBinaryClipped)
                        .add(gddBinaryClipped)
                        .rename('finalIndexMap');
    
    // Visualizza la mappa indice finale con una palette esplicativa
    // Il punteggio massimo è 5 (tutti i criteri soddisfatti) e il minimo 0 (nessuno soddisfatto)
    // Reclassifica finalIndexMap da {0,1,2,3,4,5} a {0,0,0,0,1,2}
    var reclassMap = finalIndexMap.remap(
      [0, 1, 2, 3, 4, 5],  // valori originali
      [0, 0, 0, 0, 1, 2]   // nuovi valori: 0 per 0-3, 1 per 4, 2 per 5
    );

    // Visualizza la mappa finale con i tre colori
    Map.addLayer(
      reclassMap,
      {min: 0, max: 2, palette: ['red', 'yellow', 'green']},
      'Indice Finale (0-5) con tre classi'
    );
      /////////////////////////////////////////////////////////// CALCOLO STATISTICHE PER DTM, GDD E MAPPA INDICE

      // Calcola statistiche per il DTM (elevazione) sull'area d'interesse
      var dtmStats = dtmClipped.reduceRegion({
        reducer: ee.Reducer.min()
                    .combine({
                      reducer2: ee.Reducer.mean(),
                      sharedInputs: true
                    })
                    .combine({
                      reducer2: ee.Reducer.max(),
                      sharedInputs: true
                    }),
        geometry: aoi,
        scale: 30,  // usa una scala adatta per il DTM, ad esempio 30m
        bestEffort: true
      });
      var dtmMin_val  = ee.Number(dtmStats.get('elevation_min'));
      var dtmMean_val = ee.Number(dtmStats.get('elevation_mean'));
      var dtmMax_val  = ee.Number(dtmStats.get('elevation_max'));

      // Calcola statistiche per i GDD accumulati nell'area (non binari)
      var gddStats = gddClipped.reduceRegion({
        reducer: ee.Reducer.min()
                    .combine({
                      reducer2: ee.Reducer.mean(),
                      sharedInputs: true
                    })
                    .combine({
                      reducer2: ee.Reducer.max(),
                      sharedInputs: true
                    }),
        geometry: aoi,
        scale: 1000,  // ad esempio 1000m, modifica se necessario
        bestEffort: true
      });
      var gddMin_val  = ee.Number(gddStats.get('Accumulated_GDD_min'));
      var gddMean_val = ee.Number(gddStats.get('Accumulated_GDD_mean'));
      var gddMax_val  = ee.Number(gddStats.get('Accumulated_GDD_max'));

      // Calcola l'area (in mq) dove il finalIndexMap raggiunge il valore massimo (cioè 5)
      var areaMaxScore = ee.Image.pixelArea().updateMask(finalIndexMap.eq(5)).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale: 10,  // scala adeguata per il calcolo dell'area, ad esempio 10m
        maxPixels: 1e9
      }).get('area');

      // Converti i valori a client-side (o formattali direttamente per la UI)
      var dtmMin_print  = dtmMin_val.format('%.2f').getInfo();
      var dtmMean_print = dtmMean_val.format('%.2f').getInfo();
      var dtmMax_print  = dtmMax_val.format('%.2f').getInfo();

      var gddMin_print  = gddMin_val.format('%.2f').getInfo();
      var gddMean_print = gddMean_val.format('%.2f').getInfo();
      var gddMax_print  = gddMax_val.format('%.2f').getInfo();

      // Converte l'area da mq a ettari (1 ha = 10000 mq)
      var areaMaxHa = ee.Number(areaMaxScore).divide(10000);
      var areaMax_print = areaMaxHa.format('%.2f').getInfo();

      ///////////////////////////////////////////////////////////
      //////////////////////////////////////////////////////////
    
    
    //PANEL OUTPUT
      //CONTROL PANEL OUTPUT
      var controlPanel2 = ui.Panel({
        style: {width: '320px', height: '650px', position: 'top-right'},
        layout: ui.Panel.Layout.flow('vertical')
      });
      
      // Titolo generale
      controlPanel2.add(ui.Label('ApiPRO MAP OUTPUT', {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}));
      
      // Sezione geometrica
      controlPanel2.add(ui.Label('DATI GEOMETRICI APPEZZAMENTO SELEZIONATO', {fontWeight: 'bold', margin: '8px 0 0 0'}));
      controlPanel2.add(ui.Label('SUPERFICE (ha): ' + ee.Number(surf).divide(10000).format('%.2f').getInfo(), {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('PERIMETRO (m): ' + perim_print, {fontWeight: 'normal'}));
      
      // Sezione impostazioni generali
      controlPanel2.add(ui.Label('DATI IMPOSTATI', {fontWeight: 'bold', margin: '10px 0 0 0'}));
      controlPanel2.add(ui.Label('Data START: ' + dataSTART, {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Data END: ' + dataEND, {fontWeight: 'normal'}));
      
      // Sezione NDVI
      controlPanel2.add(ui.Label('NDVI APPEZZAMENTO', {fontWeight: 'bold', margin: '10px 0 0 0'}));
      controlPanel2.add(ui.Label('Medio: ' + NDVI_mean_print.toFixed(2), {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Minimo: ' + NDVI_min_print.toFixed(2), {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Massimo: ' + NDVI_max_print.toFixed(2), {fontWeight: 'normal'}));
      
      // Sezione NDRE
      controlPanel2.add(ui.Label('NDRE APPEZZAMENTO', {fontWeight: 'bold', margin: '10px 0 0 0'}));
      controlPanel2.add(ui.Label('Medio: ' + NDRE_mean_print.toFixed(2), {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Minimo: ' + NDRE_min_print.toFixed(2), {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Massimo: ' + NDRE_max_print.toFixed(2), {fontWeight: 'normal'}));
      
      // Sezione DTM
      controlPanel2.add(ui.Label('VALORI DTM (Elevazione)', {fontWeight: 'bold', margin: '10px 0 0 0'}));
      controlPanel2.add(ui.Label('Minimo (m): ' + dtmMin_print, {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Medio (m): ' + dtmMean_print, {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Massimo (m): ' + dtmMax_print, {fontWeight: 'normal'}));
      
      // Sezione GDD
      controlPanel2.add(ui.Label('VALORI GDD ACCUMULATI', {fontWeight: 'bold', margin: '10px 0 0 0'}));
      controlPanel2.add(ui.Label('Minimo: ' + gddMin_print, {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Medio: ' + gddMean_print, {fontWeight: 'normal'}));
      controlPanel2.add(ui.Label('Massimo: ' + gddMax_print, {fontWeight: 'normal'}));
      
      // Sezione area con punteggio massimo
      controlPanel2.add(ui.Label('AREA CON INDICE MASSIMO (punteggio = 5)', {fontWeight: 'bold', margin: '10px 0 0 0'}));
      controlPanel2.add(ui.Label(areaMax_print + ' mq', {fontWeight: 'normal'}));
      
     //VISUALIZZA LEGENDA CORINE
     
  
        // 1) Calcolo l'istogramma
      var classStats = corineClipped.reduceRegion({
        reducer: ee.Reducer.frequencyHistogram(),
        geometry: aoi,
        scale: 100,
        maxPixels: 1e13
      });
      var classHistogram = ee.Dictionary(classStats.get('landcover'));
      var classCodes = classHistogram.keys();
      
      // 2) Portiamo la lista di codici in client side
      var classCodesList = classCodes.getInfo(); // es. ["111", "112", "211", "312", ...]
      
      // 3) Filtriamo corineClasses
      var filteredClasses = corineClasses.filter(function(cls) {
        return classCodesList.indexOf(cls.code.toString()) !== -1;
      });
      
      // 4) Creiamo un pannello “legendPanel” con solo le classi presenti
      var legendPanel = ui.Panel();
      legendPanel.add(ui.Label('Legenda CORINE (solo classi nell’AOI)', {fontWeight: 'bold'}));
      
      filteredClasses.forEach(function(cls) {
        legendPanel.add(makeLegendRow(cls.color, cls.label));
      });
      
      // 5) Aggiungiamo la legenda in fondo a controlPanel2
      controlPanel2.add(legendPanel);
      
      // Legenda per l'indice "finalIndexMap" (Probabilità di Fioritura)
      var finalIndexLegend = ui.Panel({
        layout: ui.Panel.Layout.flow('vertical'),
        style: { margin: '10px 0' }
      });
      finalIndexLegend.add(ui.Label('Probabilità di Fioritura', { fontWeight: 'bold' }));
      finalIndexLegend.add(makeLegendRow('red', 'Bassa'));
      finalIndexLegend.add(makeLegendRow('yellow', 'Media'));
      finalIndexLegend.add(makeLegendRow('green', 'Alta'));

// Aggiungi la legenda al pannello di output
controlPanel2.add(finalIndexLegend);
      
  
   // ADD PANNELLO   
     Map.add(controlPanel2);
     
     //////////////////////////GRAFICO EVOLUZIONE INDICI VIGORIA NDVI + NDRE
     //////////////////////////
    
    
    // Funzione per generare il grafico
    function generatePlot() {
      var plotStartDate = plotDataStart.getValue();
      var plotEndDate = plotDataEnd.getValue();
    
      // Controlliamo che le date siano valide
      if (!plotStartDate || !plotEndDate) {
        ui.alert('Per favore, inserisci entrambe le date per il grafico.');
        return;
      }
    
      // Creiamo un intervallo di date
      var dateRange = ee.DateRange(plotStartDate, plotEndDate);
    
      // Filtriamo la collezione Sentinel-2
      var collection = sentinel2.filterBounds(aoi)
                                .filterDate(plotStartDate, plotEndDate)
                                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
    
      // Mappiamo sulla collezione per calcolare NDVI e NDRE
      var withIndices = collection.map(function(image) {
        var nir = image.select('B8');
        var red = image.select('B4');
        var redEdge = image.select('B5');
    
        var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
        var ndre = nir.subtract(redEdge).divide(nir.add(redEdge)).rename('NDRE');
    
        // Riduciamo sull'area di interesse per ottenere media, minimo e massimo
        var ndviStats = ndvi.reduceRegion({
          reducer: ee.Reducer.mean().combine({
            reducer2: ee.Reducer.minMax(),
            sharedInputs: true
          }),
          geometry: aoi,
          scale: 10,
          bestEffort: true
        });
    
        var ndreStats = ndre.reduceRegion({
          reducer: ee.Reducer.mean().combine({
            reducer2: ee.Reducer.minMax(),
            sharedInputs: true
          }),
          geometry: aoi,
          scale: 10,
          bestEffort: true
        });
    
        // Impostiamo le statistiche come proprietà
        return ee.Feature(null, {
          'date': image.date().format('YYYY-MM-dd'),
          'NDVI_mean': ndviStats.get('NDVI_mean'),
          'NDVI_min': ndviStats.get('NDVI_min'),
          'NDVI_max': ndviStats.get('NDVI_max'),
          'NDRE_mean': ndreStats.get('NDRE_mean'),
          'NDRE_min': ndreStats.get('NDRE_min'),
          'NDRE_max': ndreStats.get('NDRE_max')
        });
      });
    
      // Convertiamo in una FeatureCollection per il grafico
      var chartData = ee.FeatureCollection(withIndices);
    
      // Creiamo il grafico per NDVI
      var chartNDVI = ui.Chart.feature.byFeature(chartData, 'date', ['NDVI_mean', 'NDVI_min', 'NDVI_max'])
        .setChartType('LineChart')
        .setOptions({
          title: 'Serie Temporale NDVI',
          hAxis: {title: 'Data', format: 'yyyy-MM-dd', gridlines: {count: 7}},
          vAxis: {title: 'NDVI'},
          lineWidth: 2,
          colors: ['green', 'lightgreen', 'darkgreen'],
          interpolateNulls: true,
          series: {
            0: {lineWidth: 2, color: 'green'},
            1: {lineWidth: 1, color: 'lightgreen', lineDashStyle: [4, 4]},
            2: {lineWidth: 1, color: 'darkgreen', lineDashStyle: [4, 4]}
          }
        });
    
      // Creiamo il grafico per NDRE
      var chartNDRE = ui.Chart.feature.byFeature(chartData, 'date', ['NDRE_mean', 'NDRE_min', 'NDRE_max'])
        .setChartType('LineChart')
        .setOptions({
          title: 'Serie Temporale NDRE',
          hAxis: {title: 'Data', format: 'yyyy-MM-dd', gridlines: {count: 7}},
          vAxis: {title: 'NDRE'},
          lineWidth: 2,
          colors: ['red', 'pink', 'darkred'],
          interpolateNulls: true,
          series: {
            0: {lineWidth: 2, color: 'red'},
            1: {lineWidth: 1, color: 'pink', lineDashStyle: [4, 4]},
            2: {lineWidth: 1, color: 'darkred', lineDashStyle: [4, 4]}
          }
        });
    
      // Visualizziamo i grafici in un pannello
      var chartPanel = ui.Panel({
        layout: ui.Panel.Layout.flow('vertical'),
        style: {width: '600px', position: 'bottom-right'}
      });
    
    ///  chiusura funzione
      
      chartPanel.clear();
      chartPanel.add(chartNDVI);
      chartPanel.add(chartNDRE);
    
      Map.add(chartPanel);
    }
    
    // Colleghiamo il pulsante alla funzione
    plotButton.onClick(generatePlot);
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////END GRAFICO
    /////////////////////////
    
     // Clear geometry
      var layers = drawingTools.layers();
      layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
           
    } //end metamodel function
       
    //active function on cluc button
    RunButton.onClick(DSS);
    //RunButton.onClick(clearGeometry());
    
    ///////////////////////////////// G) RESTET TOOL ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    //Function reset
    function resetALL (){
      Map.clear();
      Map.add(controlPanelDSS);
      var drawingTools = Map.drawingTools();
      drawingTools.setShown(false);
      Map.setOptions('SATELLITE');
      //Map.setCenter(12.4319, 45.7278, 10);
      //Map.addLayer(img, {min: 0, max: 4, palette: palette},  'Soil Zone');
}

//botton
resetButton.onClick(resetALL);
//resetButton.onClick(clearGeometry);