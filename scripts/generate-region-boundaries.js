#!/usr/bin/env node

/**
 * Region Boundary Generation Script
 *
 * Fetches LNRS, LPA, and NCA boundary GeoJSON from their ArcGIS services and writes a
 * simplified, static snapshot to public/region-boundaries/. The live ArcGIS responses are too
 * large (LNRS is ~25-30MB, NCA ~4MB) to fetch on every request, and serving them as public
 * static assets means components fetch them client-side without bloating any server-rendered
 * page's payload (a previous version read these server-side in page.js and passed them down as
 * props, which pushed the BGS Bodies page's pre-rendered ISR response over Vercel's 19.07MB
 * limit and broke the production deployment - FALLBACK_BODY_TOO_LARGE).
 *
 * Re-run this manually if Natural England/ONS revise these boundaries.
 *
 * Usage: node scripts/generate-region-boundaries.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import simplify from '@turf/simplify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCGIS_LNRS_URL = 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Local_Nature_Recovery_Strategy_Areas_England/FeatureServer/0/query';
const ARCGIS_NCA_URL = 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query';
const ARCGIS_LPA_URL = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LPA_APR_2023_UK_BUC_V2/FeatureServer/0/query';

const MAX_TARGET_BYTES = 1.5 * 1024 * 1024; // stay comfortably under Next's 2MB fetch-cache limit

const DATASETS = [
  {
    name: 'LNRS',
    outputFile: 'lnrs.json',
    url: `${ARCGIS_LNRS_URL}?where=1%3D1&outFields=Name&returnGeometry=true&geometryPrecision=6&f=geojson`,
  },
  {
    name: 'LPA',
    outputFile: 'lpa.json',
    // LPA23CD is prefixed by country (E/S/W/N) - English LPAs only, since that's the only
    // place BGS allocations can land.
    url: `${ARCGIS_LPA_URL}?where=LPA23CD+LIKE+'E%25'&outFields=LPA23NM&returnGeometry=true&geometryPrecision=6&f=geojson`,
  },
  {
    name: 'NCA',
    outputFile: 'nca.json',
    url: `${ARCGIS_NCA_URL}?where=1%3D1&outFields=NCA_Name&returnGeometry=true&geometryPrecision=6&f=geojson`,
  },
];

// Progressively increases the simplification tolerance until the output is comfortably
// under MAX_TARGET_BYTES, so each dataset gets only as much simplification as it needs.
function simplifyToTarget(geojson, name) {
  const tolerances = [0, 0.0005, 0.001, 0.002, 0.004, 0.008];

  for (const tolerance of tolerances) {
    const candidate = tolerance === 0 ? geojson : simplify(geojson, { tolerance, highQuality: true });
    const size = Buffer.byteLength(JSON.stringify(candidate));

    console.log(`  ${name}: tolerance=${tolerance} -> ${(size / 1024 / 1024).toFixed(2)}MB`);

    if (size <= MAX_TARGET_BYTES) {
      return candidate;
    }
  }

  console.warn(`  ${name}: could not get under target size even at the highest tolerance tried - using it anyway.`);
  return simplify(geojson, { tolerance: tolerances[tolerances.length - 1], highQuality: true });
}

async function generateBoundaries() {
  for (const dataset of DATASETS) {
    console.log(`Fetching ${dataset.name} boundaries...`);
    const res = await fetch(dataset.url);
    const geojson = await res.json();

    if (!geojson.features || geojson.features.length === 0) {
      console.error(`  ${dataset.name}: no features returned, aborting for this dataset.`);
      continue;
    }
    console.log(`  ${dataset.name}: fetched ${geojson.features.length} features.`);

    const simplified = simplifyToTarget(geojson, dataset.name);

    const outputPath = path.join(__dirname, '..', 'public', 'region-boundaries', dataset.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(simplified));
    const finalSize = fs.statSync(outputPath).size;
    console.log(`  ${dataset.name}: wrote ${outputPath} (${(finalSize / 1024 / 1024).toFixed(2)}MB)\n`);
  }

  console.log('Done.');
}

generateBoundaries().catch(e => {
  console.error('Failed to generate region boundaries:', e);
  process.exit(1);
});
