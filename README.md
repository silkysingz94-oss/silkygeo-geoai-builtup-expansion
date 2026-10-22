# SILKYGEO GEOAI — Geospatial Research Projects

This repository contains interactive geospatial research prototypes, source code and documentation.

## Projects

### 1. Built-up Expansion & SDG 11
Existing root dashboard: [`index.html`](index.html)  
The existing dashboard has been preserved.

### 2. GBoS GEOAI — Gambia Soil Health & Land Degradation
- **Earth Engine source:** [`gee/Gambia_Soil_Health_Land_Degradation.js`](gee/Gambia_Soil_Health_Land_Degradation.js)
- **GitHub Pages landing page:** [`soil-health/index.html`](soil-health/index.html)
- **Setup and publication guide:** [`soil-health/README.md`](soil-health/README.md)
- **Live app URL configuration:** [`soil-health/app-config.js`](soil-health/app-config.js)

The GEE script is retained as the source of truth for Earth Engine analysis. GitHub Pages cannot execute the Code Editor's `ee.*` and `ui.*` APIs. To provide live public analysis, publish the script as an Earth Engine App, confirm that all referenced assets can be read by the app, and add the generated URL to `soil-health/app-config.js`. See the setup guide for details.

**Important:** The referenced EA asset `projects/ee-aishaansu80/assets/GambiaEA_Final1` must be accessible to the published app, subject to data-owner approval and GBoS data-sharing rules. Remote-sensing indicators are screening proxies and require validation before operational use.

## Running the GEE source
1. Open <https://code.earthengine.google.com/>.
2. Open/import `gee/Gambia_Soil_Health_Land_Degradation.js`.
3. Run it in the Code Editor, where `ee` and `ui` are available.
4. Follow [the publication guide](soil-health/README.md) to publish a public Earth Engine App and connect it to the landing page.

## Credits
Produced by Ansu Singhateh  
GIS Analyst | GIS / Cartography Unit | Gambia Bureau of Statistics (GBoS)  
GBoS GEOAI • Research and educational use
