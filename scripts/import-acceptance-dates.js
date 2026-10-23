#!/usr/bin/env node

/**
 * Import Acceptance Dates Script
 *
 * Sets each site's `publishedDate` in the `sites` collection to the date
 * Natural England accepted it onto the BGS Register, taken from a CSV
 * supplied in response to an FOI/EIR request (e.g. "Appendix A.csv").
 *
 * The CSV must have a "Biodiversity Gain Site Registration" column (the BGS
 * reference, sometimes followed by a " - dd/mm/yyyy hh:mm" suffix, which is
 * ignored) and an "Acceptance Date" column in dd/mm/yyyy format.
 *
 * Runs as a dry run by default, listing the changes it would make.
 *
 * Usage: node scripts/import-acceptance-dates.js <path-to-csv> [--apply]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const REF_COLUMN = 'Biodiversity Gain Site Registration';
const DATE_COLUMN = 'Acceptance Date';
const SOURCE = 'NE acceptance date (FOI)';

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

function readAcceptanceDates(csvPath) {
  const text = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (data.length === 0 || !(REF_COLUMN in data[0]) || !(DATE_COLUMN in data[0])) {
    throw new Error(`CSV must have "${REF_COLUMN}" and "${DATE_COLUMN}" columns.`);
  }

  const dates = new Map();
  const problems = [];
  for (const row of data) {
    const ref = /BGS-\d{9}/.exec(row[REF_COLUMN] || '')?.[0];
    const date = parseUkDate(row[DATE_COLUMN]);
    if (!ref || !date) {
      problems.push(`${row[REF_COLUMN]} | ${row[DATE_COLUMN]}`);
      continue;
    }
    if (dates.has(ref) && dates.get(ref).getTime() !== date.getTime()) {
      problems.push(`${ref} appears more than once with different dates`);
      continue;
    }
    dates.set(ref, date);
  }

  return { rowCount: data.length, dates, problems };
}

async function importAcceptanceDates() {
  const csvPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');

  if (!csvPath) {
    console.error('Usage: node scripts/import-acceptance-dates.js <path-to-csv> [--apply]');
    process.exit(1);
  }

  const { rowCount, dates, problems } = readAcceptanceDates(csvPath);
  console.log(`CSV rows: ${rowCount}; sites with a valid acceptance date: ${dates.size}`);
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

    const sitesCollection = db.collection('sites');
    const existing = await sitesCollection.find(
      { id: { $in: [...dates.keys()] } },
      { projection: { id: 1, publishedDate: 1 } }
    ).toArray();
    const existingById = new Map(existing.map(site => [site.id, site]));

    const changes = [];
    for (const [ref, date] of [...dates.entries()].sort()) {
      const current = existingById.get(ref);
      const currentTime = current?.publishedDate ? new Date(current.publishedDate).getTime() : null;
      if (currentTime === date.getTime()) continue;
      changes.push({ ref, date, current });
    }

    const notInDb = changes.filter(c => !c.current).length;
    console.log(`Sites already correct: ${dates.size - changes.length}`);
    console.log(`Sites to update: ${changes.length} (of which ${notInDb} not yet in the sites collection)\n`);
    changes.forEach(({ ref, date, current }) => {
      console.log(`  ${ref}: ${current ? formatDate(current.publishedDate) : 'not in db'} -> ${formatDate(date)}`);
    });

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to write these changes.');
      return;
    }

    let updated = 0;
    for (const { ref, date } of changes) {
      await sitesCollection.updateOne(
        { id: ref },
        { $set: { publishedDate: date, publishedDateSource: SOURCE } },
        { upsert: true }
      );
      updated++;
    }
    console.log(`\nUpdated ${updated} site records with their acceptance date.`);

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

importAcceptanceDates();
