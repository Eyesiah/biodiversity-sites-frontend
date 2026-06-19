#!/usr/bin/env node

/**
 * Backfill Published Dates Script
 *
 * For each site in the `sites` collection that lacks a `publishedDate`,
 * finds the earliest statistics record that lists it in `newSites` and
 * uses that record's `timestamp` as the published date.
 *
 * Sites that pre-date statistics tracking (not found in any newSites array)
 * are left without a publishedDate.
 *
 * Usage: node scripts/backfill-published-dates.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

async function backfillPublishedDates() {
  let client;

  try {
    const clientPromise = (await import('../lib/mongodb.js')).default;
    const { MONGODB_DATABASE_NAME } = await import('../config.js');

    client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);

    console.log(`Connected to database: ${MONGODB_DATABASE_NAME}\n`);

    const sitesCollection = db.collection('sites');
    const statsCollection = db.collection('statistics');

    // Find all sites that don't already have a publishedDate
    const sitesWithoutDate = await sitesCollection.find({ publishedDate: { $exists: false } }).toArray();
    console.log(`Sites without a publishedDate: ${sitesWithoutDate.length}`);

    if (sitesWithoutDate.length === 0) {
      console.log('Nothing to backfill.');
      return;
    }

    const siteIds = new Set(sitesWithoutDate.map(s => s.id));

    // Walk statistics records oldest-first, building a map of id → earliest timestamp
    const firstSeenMap = {};
    const statsCursor = statsCollection.find(
      { newSites: { $exists: true, $ne: [] } },
      { projection: { timestamp: 1, newSites: 1 } }
    ).sort({ timestamp: 1 });

    for await (const stat of statsCursor) {
      if (!stat.newSites || !stat.timestamp) continue;
      for (const refNo of stat.newSites) {
        if (siteIds.has(refNo) && !firstSeenMap[refNo]) {
          firstSeenMap[refNo] = stat.timestamp;
        }
      }
    }

    const matched = Object.keys(firstSeenMap).length;
    const unmatched = sitesWithoutDate.length - matched;
    console.log(`Found timestamps for ${matched} sites; ${unmatched} site(s) pre-date statistics tracking and will remain without a date.\n`);

    // Apply the updates
    let updated = 0;
    for (const [refNo, publishedDate] of Object.entries(firstSeenMap)) {
      await sitesCollection.updateOne(
        { id: refNo },
        { $set: { publishedDate } }
      );
      updated++;
    }

    console.log(`Updated ${updated} site records with publishedDate.`);
    console.log('Backfill complete.');

  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

backfillPublishedDates();
