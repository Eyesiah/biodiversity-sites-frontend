#!/usr/bin/env node

/**
 * Import Allocation Acceptance Dates Script
 *
 * Sets `firstSeen` in the `allocations` collection to the date Natural England
 * accepted each allocation, taken from a CSV supplied in response to an
 * FOI/EIR request (e.g. EIR2026-11704 saved as CSV).
 *
 * The CSV must have "Acceptance Date" (dd/mm/yyyy),
 * "Planning Reference (Development) (Development)" and
 * "Biodiversity Gain Site Registration" columns.
 *
 * Rows are matched to allocation records by BGS site and planning reference
 * (ignoring case, spaces and punctuation). Allocation records are keyed by
 * developer reference, which can span several sites, so each record gets the
 * earliest acceptance date of all the rows that match it.
 *
 * Runs as a dry run by default, listing the changes it would make.
 *
 * Usage: node scripts/import-allocation-acceptance-dates.js <path-to-csv> [--apply]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const DATE_COLUMN = 'Acceptance Date';
const PLANNING_REF_COLUMN = 'Planning Reference (Development) (Development)';
const SITE_COLUMN = 'Biodiversity Gain Site Registration';

const normaliseRef = (ref) => (ref || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function parseUkDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value || '').trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return isNaN(date) ? null : date;
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'none';
}

// Returns a map of "site|normalised planning ref" -> earliest acceptance date
function readAcceptanceDates(csvPath) {
  const text = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

  const columns = [DATE_COLUMN, PLANNING_REF_COLUMN, SITE_COLUMN];
  if (data.length === 0 || columns.some(col => !(col in data[0]))) {
    throw new Error(`CSV must have these columns: ${columns.map(c => `"${c}"`).join(', ')}.`);
  }

  const dates = new Map();
  const problems = [];
  for (const row of data) {
    const site = /BGS-\d{9}/.exec(row[SITE_COLUMN] || '')?.[0];
    const planningRef = normaliseRef(row[PLANNING_REF_COLUMN]);
    const date = parseUkDate(row[DATE_COLUMN]);
    if (!site || !planningRef || !date) {
      problems.push(`${row[DATE_COLUMN]} | ${row[PLANNING_REF_COLUMN]} | ${row[SITE_COLUMN]}`);
      continue;
    }
    const key = `${site}|${planningRef}`;
    if (!dates.has(key) || date < dates.get(key)) {
      dates.set(key, date);
    }
  }

  return { rowCount: data.length, dates, problems };
}

async function importAllocationAcceptanceDates() {
  const csvPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');

  if (!csvPath) {
    console.error('Usage: node scripts/import-allocation-acceptance-dates.js <path-to-csv> [--apply]');
    process.exit(1);
  }

  const { rowCount, dates, problems } = readAcceptanceDates(csvPath);
  console.log(`CSV rows: ${rowCount}; distinct site + planning reference pairs: ${dates.size}`);
  if (problems.length > 0) {
    console.log(`Rows skipped (${problems.length}):`);
    problems.forEach(p => console.log(`  ${p}`));
  }

  let client;

  try {
    const clientPromise = (await import('../lib/mongodb.js')).default;
    const { MONGODB_DATABASE_NAME } = await import('../config.js');

    client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    console.log(`\nConnected to database: ${MONGODB_DATABASE_NAME}`);

    const allocationsCollection = db.collection('allocations');
    const records = await allocationsCollection.find({}, { projection: { dr: 1, srn: 1, pr: 1, firstSeen: 1 } }).toArray();

    // An allocation record stores only one site, but a developer reference can be
    // allocated against several. Collect every site + planning reference pair for
    // each developer reference from the cached register data.
    const keysByDr = new Map();
    const addKey = (dr, site, planningRef) => {
      if (!dr || !site || !planningRef) return;
      if (!keysByDr.has(dr)) keysByDr.set(dr, new Set());
      keysByDr.get(dr).add(`${site}|${normaliseRef(planningRef)}`);
    };
    const cachedSites = await db.collection('bgs-register-cache')
      .find({ endpoint: { $regex: '^search/BGS-' } }, { projection: { data: 1 } })
      .toArray();
    for (const { data: site } of cachedSites) {
      for (const alloc of site?.allocations || []) {
        addKey(alloc.developerReference, site.referenceNumber, alloc.planningReference);
      }
    }
    for (const record of records) {
      addKey(record.dr, record.srn, record.pr);
    }
    console.log(`Register sites read from cache: ${cachedSites.length}`);

    // Earliest acceptance date per developer reference, across all its sites
    const earliestByDr = new Map();
    for (const [dr, keys] of keysByDr) {
      for (const key of keys) {
        const date = dates.get(key);
        if (date && (!earliestByDr.has(dr) || date < earliestByDr.get(dr))) {
          earliestByDr.set(dr, date);
        }
      }
    }

    const fills = [];
    const corrections = [];
    const stillUndated = [];
    let alreadyCorrect = 0;
    for (const record of records) {
      const date = earliestByDr.get(record.dr);
      if (!date) {
        if (!record.firstSeen) stillUndated.push(record);
        continue;
      }
      if (!record.firstSeen) {
        fills.push({ record, date });
      } else if (new Date(record.firstSeen).getTime() !== date.getTime()) {
        corrections.push({ record, date });
      } else {
        alreadyCorrect++;
      }
    }

    const describe = ({ record, date }) =>
      `  ${record.dr} (${record.srn}, ${record.pr}): ${formatDate(record.firstSeen)} -> ${formatDate(date)}`;

    console.log(`Allocation records: ${records.length}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`\nDates to fill in (${fills.length}):`);
    fills.forEach(change => console.log(describe(change)));
    console.log(`\nDates to correct (${corrections.length}):`);
    corrections.forEach(change => console.log(describe(change)));
    console.log(`\nStill without a date, not in the CSV (${stillUndated.length}):`);
    stillUndated.forEach(record => console.log(`  ${record.dr} (${record.srn}, ${record.pr})`));

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to write these changes.');
      return;
    }

    let updated = 0;
    for (const { record, date } of [...fills, ...corrections]) {
      await allocationsCollection.updateOne(
        { _id: record._id },
        { $set: { firstSeen: date } }
      );
      updated++;
    }
    console.log(`\nUpdated ${updated} allocation records with their acceptance date.`);

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

importAllocationAcceptanceDates();
