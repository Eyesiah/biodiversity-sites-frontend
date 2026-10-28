#!/usr/bin/env node

/**
 * Import Allocation Acceptance Dates Script
 *
 * Sets `firstSeen` in the `allocations` collection to the date Natural England
 * accepted each allocation, taken from a CSV supplied in response to an FOI
 * request (e.g. "Completed Allocation Cases 20-10-2026 15-49-25.csv").
 *
 * The CSV must have "Acceptance Date" (dd/mm/yyyy), "Case Type" and
 * "Reference Number (Development) (Development)" (the DEVREG developer
 * reference) columns.
 *
 * Only "Allocation" and "Combined" cases are used; amendments and site
 * registrations are ignored. Allocation records are keyed by developer
 * reference, which can span several sites, so each record gets the earliest
 * acceptance date for its developer reference.
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
const CASE_TYPE_COLUMN = 'Case Type';
const DEV_REF_COLUMN = 'Reference Number (Development) (Development)';
const ALLOCATION_CASE_TYPES = ['Allocation', 'Combined'];

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

// Returns a map of developer reference -> earliest acceptance date
function readAcceptanceDates(csvPath) {
  const text = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

  const columns = [DATE_COLUMN, CASE_TYPE_COLUMN, DEV_REF_COLUMN];
  if (data.length === 0 || columns.some(col => !(col in data[0]))) {
    throw new Error(`CSV must have these columns: ${columns.map(c => `"${c}"`).join(', ')}.`);
  }

  const dates = new Map();
  const problems = [];
  let allocationRows = 0;
  for (const row of data) {
    if (!ALLOCATION_CASE_TYPES.includes(row[CASE_TYPE_COLUMN])) continue;
    allocationRows++;
    const devRef = (row[DEV_REF_COLUMN] || '').trim();
    const date = parseUkDate(row[DATE_COLUMN]);
    if (!devRef || !date) {
      problems.push(`${row[CASE_TYPE_COLUMN]} | ${row[DATE_COLUMN]} | ${row[DEV_REF_COLUMN]}`);
      continue;
    }
    if (!dates.has(devRef) || date < dates.get(devRef)) {
      dates.set(devRef, date);
    }
  }

  return { rowCount: data.length, allocationRows, dates, problems };
}

async function importAllocationAcceptanceDates() {
  const csvPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');

  if (!csvPath) {
    console.error('Usage: node scripts/import-allocation-acceptance-dates.js <path-to-csv> [--apply]');
    process.exit(1);
  }

  const { rowCount, allocationRows, dates, problems } = readAcceptanceDates(csvPath);
  console.log(`CSV rows: ${rowCount}; allocation rows: ${allocationRows}; developer references: ${dates.size}`);
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

    const fills = [];
    const corrections = [];
    const stillUndated = [];
    let alreadyCorrect = 0;
    let notInCsv = 0;
    for (const record of records) {
      const date = dates.get(record.dr);
      if (!date) {
        notInCsv++;
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

    console.log(`Allocation records: ${records.length} (${notInCsv} not in the CSV)`);
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
