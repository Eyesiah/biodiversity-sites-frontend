#!/usr/bin/env node

/**
 * Remove Duplicate Sites Script
 *
 * Some sites have more than one document in the `sites` collection: one
 * holding the published date and a leftover with only an `id`. This deletes
 * the leftovers that have no `publishedDate`, but only where another document
 * for the same site does have one, so no site loses its record.
 *
 * Runs as a dry run by default, listing the documents it would delete.
 *
 * Usage: node scripts/remove-duplicate-sites.js [--apply]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

async function removeDuplicateSites() {
  const apply = process.argv.includes('--apply');
  let client;

  try {
    const clientPromise = (await import('../lib/mongodb.js')).default;
    const { MONGODB_DATABASE_NAME } = await import('../config.js');

    client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    console.log(`Connected to database: ${MONGODB_DATABASE_NAME}`);

    const sitesCollection = db.collection('sites');
    const duplicates = await sitesCollection.aggregate([
      { $group: { _id: '$id', docs: { $push: { _id: '$_id', publishedDate: '$publishedDate' } } } },
      { $match: { 'docs.1': { $exists: true } } },
    ]).toArray();

    const toDelete = [];
    const unresolved = [];
    for (const { _id: id, docs } of duplicates) {
      const dated = docs.filter(doc => doc.publishedDate);
      const undated = docs.filter(doc => !doc.publishedDate);
      if (dated.length === 1) {
        toDelete.push(...undated.map(doc => ({ id, _id: doc._id })));
      } else {
        unresolved.push(`${id}: ${dated.length} dated, ${undated.length} undated`);
      }
    }

    console.log(`Total site documents: ${await sitesCollection.countDocuments()}`);
    console.log(`Sites with more than one document: ${duplicates.length}`);
    console.log(`\nUndated documents to delete (${toDelete.length}):`);
    toDelete.forEach(({ id, _id }) => console.log(`  ${id} (${_id})`));
    if (unresolved.length > 0) {
      console.log(`\nDuplicates left alone, need checking by hand (${unresolved.length}):`);
      unresolved.forEach(line => console.log(`  ${line}`));
    }

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to delete these documents.');
      return;
    }

    const result = await sitesCollection.deleteMany({
      _id: { $in: toDelete.map(doc => doc._id) },
      publishedDate: { $exists: false },
    });
    console.log(`\nDeleted ${result.deletedCount} duplicate site documents.`);

  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

removeDuplicateSites();
