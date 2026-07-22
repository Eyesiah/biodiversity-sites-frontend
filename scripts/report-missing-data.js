#!/usr/bin/env node

/**
 * Report: BGS sites missing a Boundary Map or Statutory Metric file
 *
 * A site is considered to have a boundary map if either:
 *   - The BGS Register API returned a landBoundary URL (stored in bgs-register-cache), OR
 *   - A boundary map PDF has been manually uploaded via the admin panel (boundaryMapUrl in siteName).
 *
 * A site is considered to have a statutory metric if:
 *   - A metric file has been manually uploaded via the admin panel (metricFileUrl in siteName).
 *
 * Outputs a summary to the console and writes a CSV to scripts/report-missing-data.csv.
 *
 * Usage: node scripts/report-missing-data.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

async function reportMissingData() {
  let client;

  try {
    const clientPromise = (await import('../lib/mongodb.js')).default;
    const { MONGODB_DATABASE_NAME } = await import('../config.js');

    client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);

    console.log(`Connected to database: ${MONGODB_DATABASE_NAME}\n`);

    // 1. Get all reference numbers from the cached search response
    const registerCache = db.collection('bgs-register-cache');
    const searchRecord = await registerCache.findOne({ endpoint: 'search', verb: 'POST' });
    if (!searchRecord?.data) {
      console.error('No cached search results found in bgs-register-cache. Run the cache population workflow first.');
      process.exit(1);
    }
    const allRefNos = searchRecord.data
      .map(s => s.referenceNumber)
      .filter(r => r && !r.includes(' '));
    console.log(`Total sites in register: ${allRefNos.length}`);

    // 2. Get landBoundary status for each site from the per-site cache entries
    const siteCacheCursor = registerCache.find(
      { endpoint: { $regex: '^search/BGS-' }, verb: 'GET' },
      { projection: { endpoint: 1, 'data.landBoundary': 1 } }
    );
    const registerBoundaryMap = new Map();
    for await (const doc of siteCacheCursor) {
      const refNo = doc.endpoint.replace('search/', '');
      registerBoundaryMap.set(refNo, !!doc.data?.landBoundary);
    }
    console.log(`Per-site cache entries found: ${registerBoundaryMap.size}`);

    // 3. Get admin overrides from the siteName collection
    const siteNameRecords = await db.collection('siteName')
      .find({}, { projection: { _id: 1, name: 1, boundaryMapUrl: 1, metricFileUrl: 1 } })
      .toArray();
    const siteNameMap = new Map(siteNameRecords.map(r => [r._id, r]));
    console.log(`siteName records found: ${siteNameMap.size}\n`);

    // 4. Cross-reference
    const missingRows = [];
    let missingBoundaryOnly = 0;
    let missingMetricOnly = 0;
    let missingBoth = 0;

    for (const refNo of allRefNos) {
      const nameRecord = siteNameMap.get(refNo);
      const hasBoundary = !!(registerBoundaryMap.get(refNo) || nameRecord?.boundaryMapUrl);
      const hasMetric = !!(nameRecord?.metricFileUrl);

      if (!hasBoundary || !hasMetric) {
        const name = nameRecord?.name || '';
        missingRows.push({ refNo, name, hasBoundary, hasMetric });
        if (!hasBoundary && !hasMetric) missingBoth++;
        else if (!hasBoundary) missingBoundaryOnly++;
        else missingMetricOnly++;
      }
    }

    // 5. Console summary
    console.log('=== Missing Data Summary ===');
    console.log(`Missing boundary map only:  ${missingBoundaryOnly}`);
    console.log(`Missing metric file only:   ${missingMetricOnly}`);
    console.log(`Missing both:               ${missingBoth}`);
    console.log(`Total sites with gaps:      ${missingRows.length} of ${allRefNos.length}\n`);

    // 6. Write CSVs — one per gap type
    const escape = str => `"${(str || '').replace(/"/g, '""')}"`;

    const missingBoundaryRows = missingRows.filter(r => !r.hasBoundary);
    const boundaryPath = join(__dirname, 'report-missing-boundary-maps.csv');
    writeFileSync(boundaryPath, [
      'Reference Number,Site Name',
      ...missingBoundaryRows.map(({ refNo, name }) => `${refNo},${escape(name)}`)
    ].join('\n'), 'utf8');
    console.log(`Boundary map CSV written to: ${boundaryPath} (${missingBoundaryRows.length} sites)`);

    const missingMetricRows = missingRows.filter(r => !r.hasMetric);
    const metricPath = join(__dirname, 'report-missing-smc.csv');
    writeFileSync(metricPath, [
      'Reference Number,Site Name',
      ...missingMetricRows.map(({ refNo, name }) => `${refNo},${escape(name)}`)
    ].join('\n'), 'utf8');
    console.log(`SMC CSV written to: ${metricPath} (${missingMetricRows.length} sites)`);

  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

reportMissingData();
