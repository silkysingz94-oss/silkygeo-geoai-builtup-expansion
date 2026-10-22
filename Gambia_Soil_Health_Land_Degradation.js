/***************************************************************
================================================================
🇬🇲 GBoS GEOAI
GAMBIA SOIL HEALTH & LAND DEGRADATION INTELLIGENCE
================================================================

INTERACTIVE EARTH OBSERVATION WEB GIS
THE GAMBIA

================================================================
PURPOSE
================================================================

This dashboard provides a satellite-based screening framework
for:

• Soil / land condition
• Vegetation stress
• Surface moisture
• Bare-soil exposure
• Salinity-related spectral response
• Erosion susceptibility
• Land degradation screening
• Soil-health proxy index
• Spatial hotspot identification

================================================================
DATASETS
================================================================

Sentinel-2 SR Harmonized
COPERNICUS/S2_SR_HARMONIZED

Sentinel-1 GRD
COPERNICUS/S1_GRD

CHIRPS Daily Rainfall
UCSB-CHG/CHIRPS/DAILY

SRTM DEM
USGS/SRTMGL1_003

GBoS Enumeration Areas
projects/ee-aishaansu80/assets/GambiaEA_Final1

================================================================
ADMINISTRATIVE HIERARCHY
================================================================

THE GAMBIA
    ↓
REGION
    ↓
DISTRICT
    ↓
WARD
    ↓
ENUMERATION AREA

================================================================
IMPORTANT INTERPRETATION NOTE
================================================================

The indicators in this application are REMOTE-SENSING
PROXIES.

They do NOT directly measure:

• laboratory soil chemistry
• soil nutrient concentration
• soil organic carbon
• electrical conductivity
• true soil moisture profile
• confirmed erosion
• confirmed desertification

The composite indices are intended for spatial screening,
monitoring and prioritisation.

================================================================
***************************************************************/


/***************************************************************
1. APPLICATION CONFIGURATION
***************************************************************/

var APP_NAME =
  'GBoS GEOAI';

var APP_SUBTITLE =
  'GAMBIA SOIL HEALTH & LAND DEGRADATION INTELLIGENCE';

var EA_ASSET =
  'projects/ee-aishaansu80/assets/GambiaEA_Final1';

var START_YEAR = 2016;
var END_YEAR = 2026;
var DEFAULT_YEAR = 2026;

var DEFAULT_START_MONTH = 1;
var DEFAULT_END_MONTH = 12;


/***************************************************************
2. GBoS COLOUR SYSTEM
***************************************************************/

var C = {

  navy: '#062B45',
  navy2: '#0B4668',

  blue: '#087EBA',
  blue2: '#1565C0',

  cyan: '#00B8D9',
  aqua: '#36CFC9',

  green: '#168C45',
  green2: '#35B86B',

  yellow: '#F4C542',

  orange: '#F28C28',
  orange2: '#EF6C00',

  red: '#D64545',
  darkRed: '#A61B1B',

  purple: '#7357C7',
  pink: '#D94F9D',

  lightBlue: '#E8F6FC',
  sky: '#D9F2FF',

  lightGreen: '#E8F7EE',
  lightOrange: '#FFF3E0',

  gray: '#F4F7F9',
  gray2: '#E7EDF2',

  border: '#D4DEE6',

  white: '#FFFFFF',

  text: '#17324D',
  muted: '#617587'

};


/***************************************************************
3. LOAD GBoS EA DATA
***************************************************************/

var EA_RAW =
  ee.FeatureCollection(EA_ASSET);


/*
Normalise important fields to strings.
*/

var EA = EA_RAW.map(function(f) {

  return f.set({

    '_RCO':
      ee.String(
        ee.Algorithms.If(
          f.get('RCO'),
          f.get('RCO'),
          ''
        )
      ),

    '_LGA':
      ee.String(
        ee.Algorithms.If(
          f.get('lganame'),
          f.get('lganame'),
          ''
        )
      ),

    '_WARD':
      ee.String(
        ee.Algorithms.If(
          f.get('wardname'),
          f.get('wardname'),
          ''
        )
      ),

    '_FEA':
      ee.String(
        ee.Algorithms.If(
          f.get('feacode'),
          f.get('feacode'),
          ''
        )
      ),

    '_EANAME':
      ee.String(
        ee.Algorithms.If(
          f.get('eaname'),
          f.get('eaname'),
          ''
        )
      )

  });

});


/***************************************************************
4. GAMBIA GEOMETRY
***************************************************************/

var GAMBIA =
  EA.geometry();


/***************************************************************
5. DATASETS
***************************************************************/

var S2 =
  ee.ImageCollection(
    'COPERNICUS/S2_SR_HARMONIZED'
  );

var S1 =
  ee.ImageCollection(
    'COPERNICUS/S1_GRD'
  );

var CHIRPS =
  ee.ImageCollection(
    'UCSB-CHG/CHIRPS/DAILY'
  );

var DEM =
  ee.Image(
    'USGS/SRTMGL1_003'
  );


/***************************************************************
6. SENTINEL-2 CLOUD MASK
***************************************************************/

function maskS2(image) {

  var scl =
    image.select('SCL');

  var mask =
    scl.neq(3)
      .and(scl.neq(8))
      .and(scl.neq(9))
      .and(scl.neq(10))
      .and(scl.neq(11));

  return image
    .updateMask(mask)
    .divide(10000)
    .copyProperties(
      image,
      ['system:time_start']
    );

}


/***************************************************************
7. GET SENTINEL-2 COMPOSITE
***************************************************************/

function getS2Composite(
  year,
  startMonth,
  endMonth,
  aoi
) {

  var start =
    ee.Date.fromYMD(
      year,
      startMonth,
      1
    );

  var end =
    ee.Date.fromYMD(
      year,
      endMonth,
      1
    ).advance(
      1,
      'month'
    );


  var collection =
    S2
      .filterBounds(aoi)
      .filterDate(
        start,
        end
      )
      .filter(
        ee.Filter.lte(
          'CLOUDY_PIXEL_PERCENTAGE',
          60
        )
      )
      .map(maskS2);


  var count =
    collection.size();


  var safeImage =
    ee.Image(
      ee.Algorithms.If(

        count.gt(0),

        collection
          .median()
          .clip(aoi),

        ee.Image.constant([
          0,0,0,0,0,0,0,0,0,0,0,0
        ])
        .rename([
          'B1','B2','B3','B4',
          'B5','B6','B7','B8',
          'B8A','B9','B11','B12'
        ])
        .clip(aoi)

      )
    );


  return {
    image: safeImage,
    count: count
  };

}


/***************************************************************
8. SENTINEL-1 COMPOSITE
***************************************************************/

function getS1Composite(
  year,
  startMonth,
  endMonth,
  aoi
) {

  var start =
    ee.Date.fromYMD(
      year,
      startMonth,
      1
    );

  var end =
    ee.Date.fromYMD(
      year,
      endMonth,
      1
    ).advance(
      1,
      'month'
    );


  var collection =
    S1
      .filterBounds(aoi)
      .filterDate(
        start,
        end
      )
      .filter(
        ee.Filter.eq(
          'instrumentMode',
          'IW'
        )
      )
      .filter(
        ee.Filter.listContains(
          'transmitterReceiverPolarisation',
          'VV'
        )
      )
      .filter(
        ee.Filter.listContains(
          'transmitterReceiverPolarisation',
          'VH'
        )
      )
      .select([
        'VV',
        'VH'
      ]);


  var count =
    collection.size();


  var empty =
    ee.Image.constant([
      0,
      0
    ])
    .rename([
      'VV',
      'VH'
    ])
    .updateMask(
      ee.Image.constant(0)
    )
    .clip(aoi);


  var image =
    ee.Image(
      ee.Algorithms.If(

        count.gt(0),

        collection
          .median()
          .clip(aoi),

        empty

      )
    );


  return {
    image: image,
    count: count
  };

}


/***************************************************************
9. CHIRPS RAINFALL
***************************************************************/

function getRainfall(
  year,
  startMonth,
  endMonth,
  aoi
) {

  var start =
    ee.Date.fromYMD(
      year,
      startMonth,
      1
    );

  var end =
    ee.Date.fromYMD(
      year,
      endMonth,
      1
    ).advance(
      1,
      'month'
    );


  var collection =
    CHIRPS
      .filterBounds(aoi)
      .filterDate(
        start,
        end
      )
      .select(
        'precipitation'
      );


  var count =
    collection.size();


  var rainfall =
    ee.Image(
      ee.Algorithms.If(

        count.gt(0),

        collection
          .sum()
          .rename(
            'rainfall_mm'
          ),

        ee.Image.constant(0)
          .rename(
            'rainfall_mm'
          )

      )
    );


  return {
    image:
      rainfall.clip(aoi),

    count:
      count
  };

}


/***************************************************************
10. VEGETATION INDEX
***************************************************************/

function calculateNDVI(s2) {

  return s2
    .normalizedDifference([
      'B8',
      'B4'
    ])
    .rename(
      'NDVI'
    );

}


/***************************************************************
11. NORMALISED DIFFERENCE MOISTURE INDEX
***************************************************************/

function calculateNDMI(s2) {

  return s2
    .normalizedDifference([
      'B8',
      'B11'
    ])
    .rename(
      'NDMI'
    );

}


/***************************************************************
12. NORMALISED BURN / SOIL / VEGETATION INDEX
***************************************************************/

function calculateNBR(s2) {

  return s2
    .normalizedDifference([
      'B8',
      'B12'
    ])
    .rename(
      'NBR'
    );

}


/***************************************************************
13. BARE SOIL INDEX
***************************************************************/

function calculateBSI(s2) {

  /*
  BSI =
  ((SWIR + RED) - (NIR + BLUE))
  /
  ((SWIR + RED) + (NIR + BLUE))
  */

  var numerator =
    s2.select('B11')
      .add(
        s2.select('B4')
      )
      .subtract(
        s2.select('B8')
          .add(
            s2.select('B2')
          )
      );


  var denominator =
    s2.select('B11')
      .add(
        s2.select('B4')
      )
      .add(
        s2.select('B8')
          .add(
            s2.select('B2')
          )
      );


  return numerator
    .divide(
      denominator
    )
    .rename(
      'BSI'
    );

}


/***************************************************************
14. SALINITY SPECTRAL PROXY
***************************************************************/

function calculateSalinityProxy(s2) {

  /*
  This is a spectral screening proxy.

  It is NOT laboratory electrical conductivity.

  A simple NDSI-style SWIR contrast is used:

  (SWIR1 - SWIR2)
  /
  (SWIR1 + SWIR2)
  */

  return s2
    .normalizedDifference([
      'B11',
      'B12'
    ])
    .rename(
      'SALINITY_PROXY'
    );

}


/***************************************************************
15. SWIR SOIL RESPONSE
***************************************************************/

function calculateSoilReflectance(s2) {

  return s2
    .select('B11')
    .rename(
      'SOIL_REFLECTANCE'
    );

}


/***************************************************************
16. S1 RADAR MOISTURE PROXY
***************************************************************/

function calculateRadarMoisture(s1) {

  /*
  VV/VH relationship is used only as a
  relative radar-response indicator.

  It should not be interpreted as absolute
  volumetric soil moisture.
  */

  return s1
    .select('VV')
    .subtract(
      s1.select('VH')
    )
    .rename(
      'RADAR_MOISTURE_PROXY'
    );

}


/***************************************************************
17. TERRAIN
***************************************************************/

var SLOPE =
  ee.Terrain
    .slope(
      DEM
    )
    .rename(
      'SLOPE'
    );


/***************************************************************
18. GENERIC NORMALISATION
***************************************************************/

function normalize(
  image,
  minValue,
  maxValue
) {

  return image
    .subtract(minValue)
    .divide(
      maxValue - minValue
    )
    .clamp(
      0,
      1
    );

}


/***************************************************************
19. BUILD ALL INDICATORS
***************************************************************/

function buildIndicators(
  year,
  startMonth,
  endMonth,
  aoi
) {

  var s2Result =
    getS2Composite(
      year,
      startMonth,
      endMonth,
      aoi
    );


  var s1Result =
    getS1Composite(
      year,
      startMonth,
      endMonth,
      aoi
    );


  var rainfallResult =
    getRainfall(
      year,
      startMonth,
      endMonth,
      aoi
    );


  var s2 =
    s2Result.image;


  var s1 =
    s1Result.image;


  var ndvi =
    calculateNDVI(
      s2
    );


  var ndmi =
    calculateNDMI(
      s2
    );


  var nbr =
    calculateNBR(
      s2
    );


  var bsi =
    calculateBSI(
      s2
    );


  var salinity =
    calculateSalinityProxy(
      s2
    );


  var soilReflectance =
    calculateSoilReflectance(
      s2
    );


  var radarMoisture =
    calculateRadarMoisture(
      s1
    );


  var rainfall =
    rainfallResult.image;


  /*
  Terrain erosion factor.

  Higher slope = higher erosion susceptibility.
  */

  var slopeFactor =
    normalize(
      SLOPE,
      0,
      15
    );


  /*
  Vegetation stress.

  Lower NDVI = higher stress.
  */

  var vegetationStress =
    ee.Image(1)
      .subtract(
        normalize(
          ndvi,
          0.05,
          0.80
        )
      )
      .rename(
        'VEGETATION_STRESS'
      );


  /*
  Bare-soil pressure.

  Higher BSI = greater exposed/bare surface.
  */

  var bareSoil =
    normalize(
      bsi,
      -0.30,
      0.50
    )
    .rename(
      'BARE_SOIL_PRESSURE'
    );


  /*
  Moisture stress.

  Lower NDMI = greater moisture stress.
  */

  var moistureStress =
    ee.Image(1)
      .subtract(
        normalize(
          ndmi,
          -0.40,
          0.60
        )
      )
      .rename(
        'MOISTURE_STRESS'
      );


  /*
  Rainfall erosivity proxy.

  Higher rainfall combined with bare soil
  can increase erosion potential.

  This is NOT RUSLE rainfall erosivity.
  */

  var rainfallFactor =
    normalize(
      rainfall,
      0,
      1200
    );


  var erosionRisk =
    slopeFactor
      .multiply(0.35)
      .add(
        bareSoil.multiply(0.30)
      )
      .add(
        rainfallFactor.multiply(0.20)
      )
      .add(
        vegetationStress.multiply(0.15)
      )
      .rename(
        'EROSION_RISK'
      );


  /*
  Salinity-related spectral pressure.

  This is deliberately labelled a proxy.
  */

  var salinityPressure =
    normalize(
      salinity,
      -0.20,
      0.30
    )
    .rename(
      'SALINITY_PRESSURE'
    );


  /*
  Soil / land condition pressure.

  Higher value = greater apparent degradation pressure.
  */

  var degradation =
    vegetationStress
      .multiply(0.25)

      .add(
        moistureStress.multiply(0.20)
      )

      .add(
        bareSoil.multiply(0.25)
      )

      .add(
        salinityPressure.multiply(0.10)
      )

      .add(
        erosionRisk.multiply(0.20)
      )

      .rename(
        'LAND_DEGRADATION'
      );


  /*
  Soil health proxy.

  Higher = relatively healthier observed surface condition.

  Lower = greater environmental stress.

  IMPORTANT:
  This is a composite remote-sensing proxy.
  */

  var soilHealth =
    ee.Image(1)
      .subtract(
        degradation
      )
      .rename(
        'SOIL_HEALTH'
      );


  return {

    s2:
      s2,

    s1:
      s1,

    ndvi:
      ndvi,

    ndmi:
      ndmi,

    nbr:
      nbr,

    bsi:
      bsi,

    salinity:
      salinity,

    soilReflectance:
      soilReflectance,

    radarMoisture:
      radarMoisture,

    rainfall:
      rainfall,

    slope:
      SLOPE,

    vegetationStress:
      vegetationStress,

    moistureStress:
      moistureStress,

    bareSoil:
      bareSoil,

    erosionRisk:
      erosionRisk,

    salinityPressure:
      salinityPressure,

    degradation:
      degradation,

    soilHealth:
      soilHealth,

    s2Count:
      s2Result.count,

    s1Count:
      s1Result.count,

    rainfallCount:
      rainfallResult.count

  };

}


/***************************************************************
20. UI ROOT
***************************************************************/

ui.root.clear();


/***************************************************************
21. HEADER
***************************************************************/

var header =
  ui.Panel({

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      stretch:
        'horizontal',

      backgroundColor:
        C.navy,

      padding:
        '12px 18px',

      margin:
        '0'

    }

  });


header.add(

  ui.Label(

    '🌍  GBoS GEOAI',

    {

      fontSize:
        '22px',

      fontWeight:
        'bold',

      color:
        C.white,

      margin:
        '0 0 2px 0'

    }

  )

);


header.add(

  ui.Label(

    '🇬🇲 THE GAMBIA | SOIL HEALTH & LAND DEGRADATION INTELLIGENCE',

    {

      fontSize:
        '12px',

      color:
        '#D9F2FF',

      margin:
        '0'

    }

  )

);


/***************************************************************
22. CONTROL PANEL
***************************************************************/

var controlPanel =
  ui.Panel({

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      width:
        '315px',

      padding:
        '12px',

      backgroundColor:
        C.white

    }

  });


/***************************************************************
23. SECTION HEADER FUNCTION
***************************************************************/

function sectionHeader(
  textValue
) {

  return ui.Label(

    textValue,

    {

      fontSize:
        '13px',

      fontWeight:
        'bold',

      color:
        C.navy,

      backgroundColor:
        C.lightBlue,

      padding:
        '8px',

      margin:
        '8px 0 6px 0'

    }

  );

}


/***************************************************************
24. SMALL LABEL
***************************************************************/

function smallLabel(
  textValue
) {

  return ui.Label(

    textValue,

    {

      fontSize:
        '11px',

      color:
        C.muted,

      margin:
        '3px 0'

    }

  );

}


/***************************************************************
25. ADMINISTRATION
***************************************************************/

controlPanel.add(
  sectionHeader(
    '🇬🇲 ADMINISTRATIVE SELECTION'
  )
);


controlPanel.add(
  smallLabel(
    'Country'
  )
);


var countrySelect =
  ui.Select({

    items:
      ['The Gambia'],

    value:
      'The Gambia',

    style: {
      stretch:
        'horizontal'
    }

  });


countrySelect.setDisabled(
  true
);


controlPanel.add(
  countrySelect
);


/***************************************************************
26. REGION
***************************************************************/

controlPanel.add(
  smallLabel(
    'Region'
  )
);


var regionSelect =
  ui.Select({

    items:
      ['All Regions'],

    value:
      'All Regions',

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  regionSelect
);


/***************************************************************
27. DISTRICT
***************************************************************/

controlPanel.add(
  smallLabel(
    'District'
  )
);


var districtSelect =
  ui.Select({

    items:
      ['All Districts'],

    value:
      'All Districts',

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  districtSelect
);


/***************************************************************
28. WARD
***************************************************************/

controlPanel.add(
  smallLabel(
    'Ward'
  )
);


var wardSelect =
  ui.Select({

    items:
      ['All Wards'],

    value:
      'All Wards',

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  wardSelect
);


/***************************************************************
29. EA
***************************************************************/

controlPanel.add(
  smallLabel(
    'Enumeration Area'
  )
);


var eaSelect =
  ui.Select({

    items:
      ['All Enumeration Areas'],

    value:
      'All Enumeration Areas',

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  eaSelect
);


/***************************************************************
30. YEAR
***************************************************************/

controlPanel.add(
  sectionHeader(
    '📅 ANALYSIS PERIOD'
  )
);


controlPanel.add(
  smallLabel(
    'Year'
  )
);


var years = [];


for (
  var y = START_YEAR;
  y <= END_YEAR;
  y++
) {

  years.push(
    String(y)
  );

}


var yearSelect =
  ui.Select({

    items:
      years,

    value:
      String(DEFAULT_YEAR),

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  yearSelect
);


/***************************************************************
31. START MONTH
***************************************************************/

controlPanel.add(
  smallLabel(
    'Start month'
  )
);


var monthNames = [

  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'

];


var startMonthSelect =
  ui.Select({

    items:
      monthNames,

    value:
      monthNames[
        DEFAULT_START_MONTH - 1
      ],

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  startMonthSelect
);


/***************************************************************
32. END MONTH
***************************************************************/

controlPanel.add(
  smallLabel(
    'End month'
  )
);


var endMonthSelect =
  ui.Select({

    items:
      monthNames,

    value:
      monthNames[
        DEFAULT_END_MONTH - 1
      ],

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  endMonthSelect
);


/***************************************************************
33. ANALYSIS LAYER
***************************************************************/

controlPanel.add(
  sectionHeader(
    '🧭 ANALYTICAL LAYER'
  )
);


var layerSelect =
  ui.Select({

    items: [

      'Soil Health Proxy',

      'Land Degradation',

      'Erosion Risk',

      'Vegetation Stress',

      'Moisture Stress',

      'Bare Soil Pressure',

      'Salinity Spectral Proxy',

      'NDVI',

      'NDMI',

      'Sentinel-1 Radar Response',

      'Rainfall',

      'Slope'

    ],

    value:
      'Soil Health Proxy',

    style: {
      stretch:
        'horizontal'
    }

  });


controlPanel.add(
  layerSelect
);


/***************************************************************
34. HOTSPOT MODE
***************************************************************/

var hotspotCheck =
  ui.Checkbox({

    label:
      'Show high-risk hotspots',

    value:
      true

  });


controlPanel.add(
  hotspotCheck
);


/***************************************************************
35. AOI OUTLINE
***************************************************************/

var outlineCheck =
  ui.Checkbox({

    label:
      'Show selected AOI',

    value:
      true

  });


controlPanel.add(
  outlineCheck
);


/***************************************************************
36. RUN BUTTON
***************************************************************/

controlPanel.add(
  sectionHeader(
    '⚙ ANALYSIS CONTROL'
  )
);


var runButton =
  ui.Button({

    label:
      '▶  RUN ANALYSIS',

    style: {

      stretch:
        'horizontal',

      backgroundColor:
        C.blue,

      color:
        C.white,

      fontWeight:
        'bold',

      margin:
        '5px 0'

    }

  });


var resetButton =
  ui.Button({

    label:
      '↺  RESET',

    style: {

      stretch:
        'horizontal',

      backgroundColor:
        C.gray2,

      color:
        C.navy,

      fontWeight:
        'bold',

      margin:
        '3px 0'

    }

  });


var exportButton =
  ui.Button({

    label:
      '⬇  EXPORT CURRENT LAYER',

    style: {

      stretch:
        'horizontal',

      backgroundColor:
        C.green,

      color:
        C.white,

      fontWeight:
        'bold',

      margin:
        '3px 0'

    }

  });


controlPanel.add(
  runButton
);

controlPanel.add(
  resetButton
);

controlPanel.add(
  exportButton
);


/***************************************************************
37. STATUS
***************************************************************/

var statusBox =
  ui.Label(

    'READY — Select an area and click RUN.',

    {

      fontSize:
        '11px',

      color:
        C.muted,

      backgroundColor:
        C.gray,

      padding:
        '8px',

      margin:
        '8px 0',

      stretch:
        'horizontal'

    }

  );


controlPanel.add(
  statusBox
);


/***************************************************************
38. MAP
***************************************************************/

var mapPanel =
  ui.Map();


mapPanel.setOptions(
  'SATELLITE'
);


mapPanel.setControlVisibility({

  all:
    false,

  zoomControl:
    true,

  mapTypeControl:
    true,

  fullscreenControl:
    true

});


mapPanel.style().set({
  stretch:
    'both'
});


mapPanel.centerObject(
  GAMBIA,
  8
);


/***************************************************************
39. ANALYTICS PANEL
***************************************************************/

var analyticsPanel =
  ui.Panel({

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      width:
        '375px',

      padding:
        '12px',

      backgroundColor:
        C.white

    }

  });


analyticsPanel.add(

  ui.Label(

    '📊 SOIL & LAND ANALYTICS',

    {

      fontSize:
        '16px',

      fontWeight:
        'bold',

      color:
        C.navy,

      margin:
        '0 0 4px 0'

    }

  )

);


analyticsPanel.add(

  ui.Label(

    'Satellite-derived environmental indicators for the selected area.',

    {

      fontSize:
        '11px',

      color:
        C.muted,

      margin:
        '0 0 8px 0'

    }

  )

);


/***************************************************************
40. KPI CARD
***************************************************************/

function createKPI(
  titleText,
  initialValue
) {

  var valueLabel =
    ui.Label(

      initialValue,

      {

        fontSize:
          '18px',

        fontWeight:
          'bold',

        color:
          C.navy,

        margin:
          '2px 0 0 0'

      }

    );


  var titleLabel =
    ui.Label(

      titleText,

      {

        fontSize:
          '9px',

        color:
          C.muted,

        margin:
          '0'

      }

    );


  var card =
    ui.Panel({

      widgets: [

        valueLabel,
        titleLabel

      ],

      layout:
        ui.Panel.Layout.flow(
          'vertical'
        ),

      style: {

        width:
          '160px',

        padding:
          '8px',

        margin:
          '3px',

        backgroundColor:
          C.gray,

        border:
          '1px solid ' +
          C.border

      }

    });


  return {

    panel:
      card,

    value:
      valueLabel

  };

}


/***************************************************************
41. KPIs
***************************************************************/

var kpiHealth =
  createKPI(
    'SOIL HEALTH PROXY',
    '--'
  );


var kpiDegradation =
  createKPI(
    'LAND DEGRADATION',
    '--'
  );


var kpiErosion =
  createKPI(
    'EROSION RISK',
    '--'
  );


var kpiNDVI =
  createKPI(
    'MEAN NDVI',
    '--'
  );


var kpiNDMI =
  createKPI(
    'MEAN NDMI',
    '--'
  );


var kpiRainfall =
  createKPI(
    'RAINFALL',
    '-- mm'
  );


var row1 =
  ui.Panel({

    widgets: [

      kpiHealth.panel,
      kpiDegradation.panel

    ],

    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      )

  });


var row2 =
  ui.Panel({

    widgets: [

      kpiErosion.panel,
      kpiNDVI.panel

    ],

    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      )

  });


var row3 =
  ui.Panel({

    widgets: [

      kpiNDMI.panel,
      kpiRainfall.panel

    ],

    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      )

  });


analyticsPanel.add(row1);
analyticsPanel.add(row2);
analyticsPanel.add(row3);


/***************************************************************
42. SELECTED AREA
***************************************************************/

analyticsPanel.add(
  sectionHeader(
    '📍 SELECTED AREA'
  )
);


var selectedAreaLabel =
  ui.Label(

    'The Gambia',

    {

      fontSize:
        '12px',

      fontWeight:
        'bold',

      color:
        C.text,

      backgroundColor:
        C.lightBlue,

      padding:
        '7px',

      stretch:
        'horizontal'

    }

  );


analyticsPanel.add(
  selectedAreaLabel
);


/***************************************************************
43. MAIN CHART
***************************************************************/

analyticsPanel.add(
  sectionHeader(
    '📈 INDICATOR DISTRIBUTION'
  )
);


var chartPanel =
  ui.Panel({

    style: {

      height:
        '240px',

      stretch:
        'horizontal'

    }

  });


analyticsPanel.add(
  chartPanel
);


/***************************************************************
44. RISK LEGEND
***************************************************************/

analyticsPanel.add(
  sectionHeader(
    '🚨 INTERPRETATION'
  )
);


function legendRow(
  color,
  text
) {

  var box =
    ui.Label(
      '',
      {

        backgroundColor:
          color,

        padding:
          '7px',

        margin:
          '0 6px 0 0'

      }
    );


  var label =
    ui.Label(
      text,
      {

        fontSize:
          '10px',

        color:
          C.text

      }
    );


  return ui.Panel({

    widgets: [
      box,
      label
    ],

    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      ),

    style: {
      margin:
        '2px 0'
    }

  });

}


var legendPanel =
  ui.Panel({

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      )

  });


legendPanel.add(
  legendRow(
    '#1A9850',
    'Low environmental stress'
  )
);


legendPanel.add(
  legendRow(
    '#91CF60',
    'Moderate environmental stress'
  )
);


legendPanel.add(
  legendRow(
    '#FEE08B',
    'Elevated environmental stress'
  )
);


legendPanel.add(
  legendRow(
    '#FC8D59',
    'High environmental stress'
  )
);


legendPanel.add(
  legendRow(
    '#D73027',
    'Very high environmental stress'
  )
);


analyticsPanel.add(
  legendPanel
);


/***************************************************************
45. METHODOLOGY
***************************************************************/

analyticsPanel.add(
  sectionHeader(
    'ℹ METHODOLOGY'
  )
);


analyticsPanel.add(

  ui.Label(

    'The dashboard integrates Sentinel-2 optical indices, Sentinel-1 radar response, CHIRPS rainfall and SRTM terrain information. The composite indicators provide relative spatial screening of surface environmental conditions. Higher degradation or erosion values indicate greater apparent environmental pressure, while higher Soil Health Proxy values indicate relatively more favourable observed surface conditions.',

    {

      fontSize:
        '10px',

      color:
        C.muted,

      whiteSpace:
        'pre-wrap',

      margin:
        '3px 0'

    }

  )

);


/***************************************************************
46. DISCLAIMER
***************************************************************/

analyticsPanel.add(

  ui.Label(

    'IMPORTANT: Soil Health Proxy, Salinity Spectral Proxy and Erosion Risk are remote-sensing indicators, not direct laboratory measurements. Field sampling and laboratory analysis are required for validation and quantitative soil assessment.',

    {

      fontSize:
        '9px',

      color:
        C.muted,

      backgroundColor:
        C.gray,

      padding:
        '8px',

      margin:
        '6px 0'

    }

  )

);


/***************************************************************
47. MAP STATE
***************************************************************/

var currentAOI =
  GAMBIA;

var currentIndicators =
  null;

var currentLayer =
  null;

var currentOutline =
  null;

var currentHotspot =
  null;


/***************************************************************
48. CLEAR MAP
***************************************************************/

function clearMap() {

  while (
    mapPanel.layers().length() > 0
  ) {

    mapPanel.layers().remove(
      mapPanel.layers().get(0)
    );

  }

}


/***************************************************************
49. LOAD REGIONS
***************************************************************/

function loadRegions() {

  statusBox.setValue(
    'Loading regions...'
  );


  EA
    .aggregate_array('_RCO')
    .distinct()
    .sort()
    .evaluate(

      function(values) {

        var items =
          ['All Regions'];


        if (values) {

          values.forEach(
            function(v) {

              if (
                v !== null &&
                v !== undefined &&
                String(v).trim() !== ''
              ) {

                items.push(
                  String(v)
                );

              }

            }
          );

        }


        regionSelect
          .items()
          .reset(
            items
          );


        regionSelect.setValue(
          'All Regions'
        );


        statusBox.setValue(
          'READY — Select an area and click RUN.'
        );

      }

    );

}


/***************************************************************
50. LOAD DISTRICTS
***************************************************************/

function loadDistricts(
  region
) {

  var fc =
    EA;


  if (
    region !==
    'All Regions'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_RCO',
          region
        )
      );

  }


  fc
    .aggregate_array('_LGA')
    .distinct()
    .sort()
    .evaluate(

      function(values) {

        var items =
          ['All Districts'];


        if (values) {

          values.forEach(
            function(v) {

              if (
                v !== null &&
                v !== undefined &&
                String(v).trim() !== ''
              ) {

                items.push(
                  String(v)
                );

              }

            }
          );

        }


        districtSelect
          .items()
          .reset(
            items
          );


        districtSelect.setValue(
          'All Districts'
        );


        wardSelect
          .items()
          .reset(
            ['All Wards']
          );


        wardSelect.setValue(
          'All Wards'
        );


        eaSelect
          .items()
          .reset(
            ['All Enumeration Areas']
          );


        eaSelect.setValue(
          'All Enumeration Areas'
        );

      }

    );

}


/***************************************************************
51. LOAD WARDS
***************************************************************/

function loadWards(
  region,
  district
) {

  var fc =
    EA;


  if (
    region !==
    'All Regions'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_RCO',
          region
        )
      );

  }


  if (
    district !==
    'All Districts'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_LGA',
          district
        )
      );

  }


  fc
    .aggregate_array('_WARD')
    .distinct()
    .sort()
    .evaluate(

      function(values) {

        var items =
          ['All Wards'];


        if (values) {

          values.forEach(
            function(v) {

              if (
                v !== null &&
                v !== undefined &&
                String(v).trim() !== ''
              ) {

                items.push(
                  String(v)
                );

              }

            }
          );

        }


        wardSelect
          .items()
          .reset(
            items
          );


        wardSelect.setValue(
          'All Wards'
        );


        eaSelect
          .items()
          .reset(
            ['All Enumeration Areas']
          );


        eaSelect.setValue(
          'All Enumeration Areas'
        );

      }

    );

}


/***************************************************************
52. LOAD EAs
***************************************************************/

function loadEAs(
  region,
  district,
  ward
) {

  var fc =
    EA;


  if (
    region !==
    'All Regions'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_RCO',
          region
        )
      );

  }


  if (
    district !==
    'All Districts'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_LGA',
          district
        )
      );

  }


  if (
    ward !==
    'All Wards'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_WARD',
          ward
        )
      );

  }


  fc
    .aggregate_array('_FEA')
    .distinct()
    .sort()
    .evaluate(

      function(values) {

        var items =
          ['All Enumeration Areas'];


        if (values) {

          values.forEach(
            function(v) {

              if (
                v !== null &&
                v !== undefined &&
                String(v).trim() !== ''
              ) {

                items.push(
                  String(v)
                );

              }

            }
          );

        }


        eaSelect
          .items()
          .reset(
            items
          );


        eaSelect.setValue(
          'All Enumeration Areas'
        );

      }

    );

}


/***************************************************************
53. REGION EVENT
***************************************************************/

regionSelect.onChange(
  function(value) {

    loadDistricts(
      value
    );

  }
);


/***************************************************************
54. DISTRICT EVENT
***************************************************************/

districtSelect.onChange(
  function(value) {

    loadWards(

      regionSelect.getValue(),

      value

    );

  }
);


/***************************************************************
55. WARD EVENT
***************************************************************/

wardSelect.onChange(
  function(value) {

    loadEAs(

      regionSelect.getValue(),

      districtSelect.getValue(),

      value

    );

  }
);


/***************************************************************
56. BUILD AOI
***************************************************************/

function buildAOI() {

  var region =
    regionSelect.getValue();

  var district =
    districtSelect.getValue();

  var ward =
    wardSelect.getValue();

  var ea =
    eaSelect.getValue();


  var fc =
    EA;


  if (
    region !==
    'All Regions'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_RCO',
          region
        )
      );

  }


  if (
    district !==
    'All Districts'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_LGA',
          district
        )
      );

  }


  if (
    ward !==
    'All Wards'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_WARD',
          ward
        )
      );

  }


  if (
    ea !==
    'All Enumeration Areas'
  ) {

    fc =
      fc.filter(
        ee.Filter.eq(
          '_FEA',
          ea
        )
      );

  }


  return fc.geometry();

}


/***************************************************************
57. AREA NAME
***************************************************************/

function getAreaName() {

  var parts = [];


  var region =
    regionSelect.getValue();

  var district =
    districtSelect.getValue();

  var ward =
    wardSelect.getValue();

  var ea =
    eaSelect.getValue();


  if (
    region !==
    'All Regions'
  ) {

    parts.push(
      region
    );

  }


  if (
    district !==
    'All Districts'
  ) {

    parts.push(
      district
    );

  }


  if (
    ward !==
    'All Wards'
  ) {

    parts.push(
      ward
    );

  }


  if (
    ea !==
    'All Enumeration Areas'
  ) {

    parts.push(
      'EA ' + ea
    );

  }


  if (
    parts.length === 0
  ) {

    return 'The Gambia';

  }


  return parts.join(
    ' / '
  );

}


/***************************************************************
58. SELECT LAYER
***************************************************************/

function getSelectedLayer(
  indicators
) {

  var selected =
    layerSelect.getValue();


  if (
    selected ===
    'Soil Health Proxy'
  ) {

    return {

      image:
        indicators.soilHealth,

      name:
        'Soil Health Proxy',

      min:
        0,

      max:
        1,

      palette: [

        '#D73027',
        '#FC8D59',
        '#FEE08B',
        '#D9EF8B',
        '#91CF60',
        '#1A9850'

      ]

    };

  }


  if (
    selected ===
    'Land Degradation'
  ) {

    return {

      image:
        indicators.degradation,

      name:
        'Land Degradation',

      min:
        0,

      max:
        1,

      palette: [

        '#1A9850',
        '#91CF60',
        '#FEE08B',
        '#FC8D59',
        '#D73027'

      ]

    };

  }


  if (
    selected ===
    'Erosion Risk'
  ) {

    return {

      image:
        indicators.erosionRisk,

      name:
        'Erosion Risk',

      min:
        0,

      max:
        1,

      palette: [

        '#1A9850',
        '#91CF60',
        '#FEE08B',
        '#FC8D59',
        '#D73027'

      ]

    };

  }


  if (
    selected ===
    'Vegetation Stress'
  ) {

    return {

      image:
        indicators.vegetationStress,

      name:
        'Vegetation Stress',

      min:
        0,

      max:
        1,

      palette: [

        '#1A9850',
        '#91CF60',
        '#FEE08B',
        '#FC8D59',
        '#D73027'

      ]

    };

  }


  if (
    selected ===
    'Moisture Stress'
  ) {

    return {

      image:
        indicators.moistureStress,

      name:
        'Moisture Stress',

      min:
        0,

      max:
        1,

      palette: [

        '#2166AC',
        '#67A9CF',
        '#D1E5F0',
        '#FDDBC7',
        '#EF8A62',
        '#B2182B'

      ]

    };

  }


  if (
    selected ===
    'Bare Soil Pressure'
  ) {

    return {

      image:
        indicators.bareSoil,

      name:
        'Bare Soil Pressure',

      min:
        0,

      max:
        1,

      palette: [

        '#1A9850',
        '#91CF60',
        '#FEE08B',
        '#FC8D59',
        '#D73027'

      ]

    };

  }


  if (
    selected ===
    'Salinity Spectral Proxy'
  ) {

    return {

      image:
        indicators.salinity,

      name:
        'Salinity Spectral Proxy',

      min:
        -0.20,

      max:
        0.30,

      palette: [

        '#313695',
        '#74ADD1',
        '#ABDDA4',
        '#FEE08B',
        '#FDAE61',
        '#D73027'

      ]

    };

  }


  if (
    selected ===
    'NDVI'
  ) {

    return {

      image:
        indicators.ndvi,

      name:
        'NDVI',

      min:
        -0.20,

      max:
        0.90,

      palette: [

        '#8C510A',
        '#D8B365',
        '#F6E8C3',
        '#C7EAE5',
        '#5AB4AC',
        '#01665E'

      ]

    };

  }


  if (
    selected ===
    'NDMI'
  ) {

    return {

      image:
        indicators.ndmi,

      name:
        'NDMI',

      min:
        -0.50,

      max:
        0.70,

      palette: [

        '#A50026',
        '#F46D43',
        '#FEE08B',
        '#ABDDA4',
        '#74ADD1',
        '#313695'

      ]

    };

  }


  if (
    selected ===
    'Sentinel-1 Radar Response'
  ) {

    return {

      image:
        indicators.radarMoisture,

      name:
        'Sentinel-1 Radar Response',

      min:
        -10,

      max:
        10,

      palette: [

        '#313695',
        '#74ADD1',
        '#ABDDA4',
        '#FEE08B',
        '#F46D43',
        '#A50026'

      ]

    };

  }


  if (
    selected ===
    'Rainfall'
  ) {

    return {

      image:
        indicators.rainfall,

      name:
        'Rainfall',

      min:
        0,

      max:
        1200,

      palette: [

        '#FFFFFF',
        '#C7E9B4',
        '#7FCDBB',
        '#41B6C4',
        '#2C7FB8',
        '#253494'

      ]

    };

  }


  return {

    image:
      indicators.slope,

    name:
      'Slope',

    min:
      0,

    max:
      15,

    palette: [

      '#FFFFFF',
      '#FFFFCC',
      '#C2E699',
      '#78C679',
      '#31A354',
      '#006837'

    ]

  };

}


/***************************************************************
59. GENERIC STATISTICS
***************************************************************/

function getStats(
  image,
  aoi
) {

  return image.reduceRegion({

    reducer:
      ee.Reducer.mean()
        .combine({

          reducer2:
            ee.Reducer.min(),

          sharedInputs:
            true

        })
        .combine({

          reducer2:
            ee.Reducer.max(),

          sharedInputs:
            true

        }),

    geometry:
      aoi,

    scale:
      10,

    maxPixels:
      1e8,

    bestEffort:
      true,

    tileScale:
      4

  });

}


/***************************************************************
60. AREA
***************************************************************/

function getArea(
  aoi
) {

  return ee.Image.pixelArea()
    .divide(1000000)
    .reduceRegion({

      reducer:
        ee.Reducer.sum(),

      geometry:
        aoi,

      scale:
        30,

      maxPixels:
        1e8,

      bestEffort:
        true,

      tileScale:
        4

    })
    .get('area');

}


/***************************************************************
61. RUN ANALYSIS
***************************************************************/

function runAnalysis() {

  statusBox.setValue(
    'PROCESSING — Building satellite indicators...'
  );


  var year =
    Number(
      yearSelect.getValue()
    );


  var startMonth =
    monthNames.indexOf(
      startMonthSelect.getValue()
    ) + 1;


  var endMonth =
    monthNames.indexOf(
      endMonthSelect.getValue()
    ) + 1;


  if (
    startMonth >
    endMonth
  ) {

    statusBox.setValue(
      'ERROR — Start month must be before or equal to end month.'
    );

    return;

  }


  currentAOI =
    buildAOI();


  currentIndicators =
    buildIndicators(

      year,

      startMonth,

      endMonth,

      currentAOI

    );


  clearMap();


  var areaName =
    getAreaName();


  selectedAreaLabel.setValue(
    areaName
  );


  mapPanel.centerObject(
    currentAOI,
    11
  );


  /*************************************************************
  SELECTED LAYER
  *************************************************************/

  var selected =
    getSelectedLayer(
      currentIndicators
    );


  currentLayer =
    mapPanel.addLayer(

      selected.image,

      {

        min:
          selected.min,

        max:
          selected.max,

        palette:
          selected.palette

      },

      selected.name,

      true

    );


  /*************************************************************
  HOTSPOTS
  *************************************************************/

  var hotspot =
    currentIndicators
      .degradation
      .gte(0.70)
      .selfMask();


  currentHotspot =
    mapPanel.addLayer(

      hotspot,

      {

        palette:
          [C.darkRed]

      },

      'High Degradation Hotspots',

      hotspotCheck.getValue()

    );


  /*************************************************************
  AOI OUTLINE
  *************************************************************/

  var outline =
    ee.Image()
      .byte()
      .paint(

        ee.FeatureCollection([
          ee.Feature(
            currentAOI
          )
        ]),

        1,

        2

      );


  currentOutline =
    mapPanel.addLayer(

      outline,

      {

        palette:
          [C.cyan]

      },

      'Selected AOI',

      outlineCheck.getValue()

    );


  /*************************************************************
  STATISTICS
  *************************************************************/

  var healthStats =
    getStats(
      currentIndicators.soilHealth,
      currentAOI
    );


  var degradationStats =
    getStats(
      currentIndicators.degradation,
      currentAOI
    );


  var erosionStats =
    getStats(
      currentIndicators.erosionRisk,
      currentAOI
    );


  var ndviStats =
    getStats(
      currentIndicators.ndvi,
      currentAOI
    );


  var ndmiStats =
    getStats(
      currentIndicators.ndmi,
      currentAOI
    );


  var rainfallStats =
    getStats(
      currentIndicators.rainfall,
      currentAOI
    );


  healthStats.evaluate(
    function(r) {

      if (r) {

        kpiHealth.value.setValue(
          r.SOIL_HEALTH_mean !== null
            ?
            Number(
              r.SOIL_HEALTH_mean
            ).toFixed(2)
            :
            '--'
        );

      }

    }
  );


  degradationStats.evaluate(
    function(r) {

      if (r) {

        kpiDegradation.value.setValue(
          r.LAND_DEGRADATION_mean !== null
            ?
            Number(
              r.LAND_DEGRADATION_mean
            ).toFixed(2)
            :
            '--'
        );

      }

    }
  );


  erosionStats.evaluate(
    function(r) {

      if (r) {

        kpiErosion.value.setValue(
          r.EROSION_RISK_mean !== null
            ?
            Number(
              r.EROSION_RISK_mean
            ).toFixed(2)
            :
            '--'
        );

      }

    }
  );


  ndviStats.evaluate(
    function(r) {

      if (r) {

        kpiNDVI.value.setValue(
          r.NDVI_mean !== null
            ?
            Number(
              r.NDVI_mean
            ).toFixed(2)
            :
            '--'
        );

      }

    }
  );


  ndmiStats.evaluate(
    function(r) {

      if (r) {

        kpiNDMI.value.setValue(
          r.NDMI_mean !== null
            ?
            Number(
              r.NDMI_mean
            ).toFixed(2)
            :
            '--'
        );

      }

    }
  );


  rainfallStats.evaluate(
    function(r) {

      if (r) {

        kpiRainfall.value.setValue(
          r.rainfall_mm_mean !== null
            ?
            Number(
              r.rainfall_mm_mean
            ).toFixed(1) +
            ' mm'
            :
            '-- mm'
        );

      }

    }
  );


  /*************************************************************
  CHART
  *************************************************************/

  chartPanel.clear();


  var selectedChart =
    ui.Chart.image.histogram({

      image:
        selected.image,

      region:
        currentAOI,

      scale:
        30,

      maxPixels:
        1e7,

      maxBuckets:
        35

    });


  selectedChart.setOptions({

    title:
      selected.name +
      ' Distribution',

    titleTextStyle: {

      fontSize:
        12,

      bold:
        true

    },

    hAxis: {

      title:
        selected.name

    },

    vAxis: {

      title:
        'Pixel Count'

    },

    legend: {

      position:
        'none'

    },

    height:
      225

  });


  chartPanel.add(
    selectedChart
  );


  /*************************************************************
  DATA DIAGNOSTICS
  *************************************************************/

  var diagnostics =
    ui.Label(

      'Sentinel-2 scenes: calculating...\n' +
      'Sentinel-1 scenes: calculating...\n' +
      'CHIRPS observations: calculating...',

      {

        fontSize:
          '9px',

        color:
          C.muted,

        backgroundColor:
          C.gray,

        padding:
          '7px',

        margin:
          '6px 0'

      }

    );


  analyticsPanel.add(
    diagnostics
  );


  ee.Dictionary({

    s2:
      currentIndicators.s2Count,

    s1:
      currentIndicators.s1Count,

    rainfall:
      currentIndicators.rainfallCount

  }).evaluate(

    function(d) {

      diagnostics.setValue(

        'Sentinel-2 scenes: ' +
        d.s2 +
        '\n' +

        'Sentinel-1 scenes: ' +
        d.s1 +
        '\n' +

        'CHIRPS observations: ' +
        d.rainfall

      );

    }

  );


  statusBox.setValue(

    'ANALYSIS COMPLETE — ' +
    areaName +
    ' | ' +
    year

  );

}


/***************************************************************
62. HOTSPOT VISIBILITY
***************************************************************/

hotspotCheck.onChange(
  function(value) {

    if (
      currentHotspot
    ) {

      currentHotspot.setShown(
        value
      );

    }

  }
);


/***************************************************************
63. AOI VISIBILITY
***************************************************************/

outlineCheck.onChange(
  function(value) {

    if (
      currentOutline
    ) {

      currentOutline.setShown(
        value
      );

    }

  }
);


/***************************************************************
64. LAYER CHANGE
***************************************************************/

layerSelect.onChange(
  function() {

    if (
      currentIndicators
    ) {

      var selected =
        getSelectedLayer(
          currentIndicators
        );


      if (
        currentLayer
      ) {

        mapPanel.layers()
          .remove(
            currentLayer
          );

      }


      currentLayer =
        mapPanel.addLayer(

          selected.image,

          {

            min:
              selected.min,

            max:
              selected.max,

            palette:
              selected.palette

          },

          selected.name,

          true

        );


      chartPanel.clear();


      var chart =
        ui.Chart.image.histogram({

          image:
            selected.image,

          region:
            currentAOI,

          scale:
            30,

          maxPixels:
            1e7,

          maxBuckets:
            35

        });


      chart.setOptions({

        title:
          selected.name +
          ' Distribution',

        hAxis: {

          title:
            selected.name

        },

        vAxis: {

          title:
            'Pixel Count'

        },

        legend: {

          position:
            'none'

        },

        height:
          225

      });


      chartPanel.add(
        chart
      );

    }

  }
);


/***************************************************************
65. RUN
***************************************************************/

runButton.onClick(
  runAnalysis
);


/***************************************************************
66. RESET
***************************************************************/

resetButton.onClick(

  function() {

    clearMap();


    regionSelect.items()
      .reset([
        'All Regions'
      ]);


    regionSelect.setValue(
      'All Regions'
    );


    districtSelect.items()
      .reset([
        'All Districts'
      ]);


    districtSelect.setValue(
      'All Districts'
    );


    wardSelect.items()
      .reset([
        'All Wards'
      ]);


    wardSelect.setValue(
      'All Wards'
    );


    eaSelect.items()
      .reset([
        'All Enumeration Areas'
      ]);


    eaSelect.setValue(
      'All Enumeration Areas'
    );


    yearSelect.setValue(
      String(
        DEFAULT_YEAR
      )
    );


    startMonthSelect.setValue(
      'January'
    );


    endMonthSelect.setValue(
      'December'
    );


    layerSelect.setValue(
      'Soil Health Proxy'
    );


    hotspotCheck.setValue(
      true
    );


    outlineCheck.setValue(
      true
    );


    currentAOI =
      GAMBIA;


    currentIndicators =
      null;


    currentLayer =
      null;


    currentHotspot =
      null;


    currentOutline =
      null;


    mapPanel.centerObject(
      GAMBIA,
      8
    );


    selectedAreaLabel.setValue(
      'The Gambia'
    );


    kpiHealth.value.setValue(
      '--'
    );

    kpiDegradation.value.setValue(
      '--'
    );

    kpiErosion.value.setValue(
      '--'
    );

    kpiNDVI.value.setValue(
      '--'
    );

    kpiNDMI.value.setValue(
      '--'
    );

    kpiRainfall.value.setValue(
      '-- mm'
    );


    chartPanel.clear();


    statusBox.setValue(
      'READY — Select an area and click RUN.'
    );

  }

);


/***************************************************************
67. EXPORT
***************************************************************/

exportButton.onClick(

  function() {

    if (
      !currentIndicators
    ) {

      statusBox.setValue(
        'RUN THE ANALYSIS FIRST.'
      );

      return;

    }


    var selected =
      getSelectedLayer(
        currentIndicators
      );


    var areaName =
      getAreaName();


    var year =
      yearSelect.getValue();


    var safeName =
      areaName
        .replace(
          /[^a-zA-Z0-9_]/g,
          '_'
        );


    Export.image.toDrive({

      image:
        selected.image,

      description:
        'GBoS_GEOAI_' +
        selected.name
          .replace(
            /[^a-zA-Z0-9]/g,
            '_'
          ) +
        '_' +
        safeName +
        '_' +
        year,

      folder:
        'GBoS_GEOAI_SOIL_LAND',

      fileNamePrefix:
        selected.name
          .replace(
            /[^a-zA-Z0-9]/g,
            '_'
          ) +
        '_' +
        safeName +
        '_' +
        year,

      region:
        currentAOI,

      scale:
        10,

      maxPixels:
        1e10,

      fileFormat:
        'GeoTIFF'

    });


    statusBox.setValue(
      'EXPORT TASK CREATED — Check the Tasks tab.'
    );

  }

);


/***************************************************************
68. THREE-COLUMN APPLICATION
***************************************************************/

var leftColumn =
  ui.Panel({

    widgets: [
      controlPanel
    ],

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      width:
        '315px',

      backgroundColor:
        C.white

    }

  });


var centerColumn =
  ui.Panel({

    widgets: [
      mapPanel
    ],

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      stretch:
        'both',

      backgroundColor:
        '#E9EEF2'

    }

  });


var rightColumn =
  ui.Panel({

    widgets: [
      analyticsPanel
    ],

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      width:
        '375px',

      backgroundColor:
        C.white

    }

  });


/***************************************************************
69. APPLICATION BODY
***************************************************************/

var body =
  ui.Panel({

    widgets: [

      leftColumn,

      centerColumn,

      rightColumn

    ],

    layout:
      ui.Panel.Layout.flow(
        'horizontal'
      ),

    style: {

      stretch:
        'both',

      backgroundColor:
        C.white

    }

  });


/***************************************************************
70. ROOT
***************************************************************/

var root =
  ui.Panel({

    widgets: [

      header,

      body

    ],

    layout:
      ui.Panel.Layout.flow(
        'vertical'
      ),

    style: {

      stretch:
        'both',

      backgroundColor:
        C.white

    }

  });


ui.root.add(
  root
);


/***************************************************************
71. INITIALISE ADMINISTRATION
***************************************************************/

loadRegions();


/***************************************************************
72. INITIAL MAP
***************************************************************/

mapPanel.centerObject(
  GAMBIA,
  8
);


/***************************************************************
73. CONSOLE INFORMATION
***************************************************************/

print(
  '========================================================'
);

print(
  '🇬🇲 GBoS GEOAI'
);

print(
  'GAMBIA SOIL HEALTH & LAND DEGRADATION INTELLIGENCE'
);

print(
  '========================================================'
);

print(
  'GBoS EA Asset:',
  EA_RAW
);

print(
  'EA feature count:',
  EA_RAW.size()
);

print(
  'Available fields:',
  EA_RAW.first().propertyNames()
);

print(
  'Sentinel-2:',
  S2
);

print(
  'Sentinel-1:',
  S1
);

print(
  'CHIRPS:',
  CHIRPS
);

print(
  'SRTM:',
  DEM
);

print(
  '========================================================'
);


/***************************************************************
74. END
***************************************************************/