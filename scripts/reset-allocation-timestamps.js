#!/usr/bin/env node
/**
 * One-time reset: clears misleading firstSeen dates written on the initial cron run
 * and replaces them with silent baseline records (no firstSeen field).
 *
 * After this runs, the cron job will only stamp *genuinely new* allocations —
 * i.e. developer references that did not exist in the register at the time this
 * script was executed.
 *
 * Usage: node scripts/reset-allocation-timestamps.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env.local') });

const clientPromise = (await import('../lib/mongodb.js')).default;
const { MONGODB_DATABASE_NAME } = await import('../config.js');

if (!clientPromise) {
  console.error('MONGODB_URI not set — cannot connect.');
  process.exit(1);
}

const client = await clientPromise;
const db = client.db(MONGODB_DATABASE_NAME);

// Build the baseline from the BGS API cache already in MongoDB
const siteDocs = await db.collection('bgs-register-cache')
  .find({ endpoint: { $regex: '^search/BGS-' } })
  .toArray();
console.log(`Found ${siteDocs.length} cached site records`);

const baseline = [];
const seen = new Set();
for (const doc of siteDocs) {
  const site = doc.data;
  if (!site?.referenceNumber || !Array.isArray(site.allocations)) continue;
  for (const alloc of site.allocations) {
    const dr = alloc.developerReference;
    if (!dr || seen.has(dr)) continue;
    seen.add(dr);
    baseline.push({ dr, srn: site.referenceNumber, pr: alloc.planningReference || null });
  }
}
console.log(`Found ${baseline.length} unique allocation developer references`);

// Replace the collection — baseline records carry no firstSeen field
const col = db.collection('allocations');
const deleted = await col.deleteMany({});
console.log(`Deleted ${deleted.deletedCount} existing records`);

if (baseline.length > 0) {
  await col.insertMany(baseline, { ordered: false });
}
console.log(`Inserted ${baseline.length} baseline records (no firstSeen date)`);
console.log('\nDone. Future cron runs will only stamp allocations added after this point.');

await client.close();
