#!/usr/bin/env node

/**
 * Manual Database Index Setup Script
 * 
 * This script sets up optimized MongoDB indexes for all collections used in the application.
 * It should be run manually after deployment to improve database performance.
 * 
 * Usage: node scripts/setup-database-indexes.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

async function setupDatabaseIndexes() {
  console.log('Setting up database indexes...\n');
  let client;

  try {
    // Import MongoDB connection and config
    const clientPromise = (await import('../lib/mongodb.js')).default;
    const { MONGODB_DATABASE_NAME } = await import('../config.js');

    client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);

    console.log(`Connected to database: ${MONGODB_DATABASE_NAME}\n`);

    // Define index configurations for all collections
    // Note: Only adding performance indexes, NOT modifying existing behavior
    const collections = [
      {
        name: 'geoCache',
        description: 'Geocoding cache for addresses',
        indexes: [
          {
            key: { address: 1 },
            options: { name: 'address_idx' }
          }
        ]
      },
      {
        name: 'siteGeoCache',
        description: 'Site spatial data cache',
        indexes: [
          {
            key: { id: 1, loc: 1 },
            options: { unique: true, name: 'id_loc_idx' }
          }
        ]
      },
      {
        name: 'allocGeoCache',
        description: 'Allocation spatial data cache',
        indexes: [
          {
            key: { allocID: 1 },
            options: { name: 'allocID_idx' }
          }
        ]
      },
      {
        name: 'siteName',
        description: 'Site name storage for admin functionality',
        indexes: [
          {
            key: { _id: 1 },
            options: { unique: true, name: 'siteName_id_idx' }
          }
        ]
      },
      {
        name: 'sites',
        description: 'Known sites tracking for statistics',
        indexes: [
          {
            key: { id: 1 },
            options: { name: 'sites_id_idx' }
          }
        ]
      },
      {
        name: 'statistics',
        description: 'Statistics collection for cron job',
        indexes: [
          {
            key: { timestamp: 1 },
            options: { name: 'timestamp_idx' }
          }
        ]
      },
      {
        name: 'allocMatchCache',
        description: 'Allocation matching cache with 24h TTL',
        indexes: [
          {
            key: { lpa: 1, planningRef: 1 },
            options: { unique: true, name: 'lpa_planning_ref_idx' }
          },
          {
            key: { expiresAt: 1 },
            options: { expireAfterSeconds: 0, name: 'expiresAt_ttl_24h' }
          }
        ]
      },
      {
        name: 'slugMapping',
        description: 'Slug mapping cache for metadata generation',
        indexes: [
          {
            key: { _id: 1 },
            options: { unique: true, name: 'slugMapping_id_idx' }
          }
        ]
      }
    ];

    // Process each collection
    for (const collectionConfig of collections) {
      console.log(`Setting up indexes for: ${collectionConfig.name}`);
      console.log(`  Description: ${collectionConfig.description}`);

      const collection = db.collection(collectionConfig.name);

      for (const indexConfig of collectionConfig.indexes) {
        try {
          // Check if index already exists
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some(index => {
            return JSON.stringify(index.key) === JSON.stringify(indexConfig.key);
          });

          if (indexExists) {
            console.log(`   Index already exists: ${indexConfig.options.name}`);
          } else {
            await collection.createIndex(indexConfig.key, indexConfig.options);
            console.log(`   Created index: ${indexConfig.options.name}`);
          }
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`   Index already exists: ${indexConfig.options.name}`);
          } else {
            console.log(`   Failed to create index ${indexConfig.options.name}: ${error.message}`);
          }
        }
      }
      console.log('');
    }

    // Verify all indexes were created successfully
    console.log('Verifying index creation...\n');
    for (const collectionConfig of collections) {
      const collection = db.collection(collectionConfig.name);
      const indexes = await collection.indexes();
      console.log(`${collectionConfig.name}:`);
      indexes.forEach(index => {
        if (index.name !== '_id_') { // Skip default _id index
          console.log(`   • ${index.name} on ${JSON.stringify(index.key)}`);
        }
      });
      console.log('');
    }

    console.log('Database indexes setup complete!');

  } catch (error) {
    console.error('Failed to setup database indexes:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   • Ensure MONGODB_URI environment variable is set');
    console.error('   • Verify MongoDB connection is working');
    console.error('   • Check that database name is correct');
    process.exit(1);
  }
  finally {
    // Close the MongoDB connection
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the script
setupDatabaseIndexes();