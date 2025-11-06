"use server"

import clientPromise from '@/lib/mongodb.js';
import { MONGODB_DATABASE_NAME } from '@/config';

export async function addSiteName(prevState, formData) {
  const apiKey = formData.get("apiKey");
  let referenceNumber = formData.get("referenceNumber");
  const siteName = formData.get("siteName");
  const action = formData.get("action"); // 'add' or 'markNotFound'

  // Extract reference number from dropdown option (format: "REF123 - Site Name" or "REF123")
  if (referenceNumber && referenceNumber.includes(' - ')) {
    referenceNumber = referenceNumber.split(' - ')[0];
  }

  // Validate API key
  const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || [];
  if (!adminKeys.includes(apiKey)) {
    return {
      apiKey: apiKey,
      referenceNumber: referenceNumber,
      siteName: siteName,
      message: null,
      error: 'Invalid API key. Access denied.'
    };
  }

  // Validate reference number
  if (!referenceNumber) {
    return {
      apiKey: apiKey,
      referenceNumber: referenceNumber,
      siteName: siteName,
      message: null,
      error: 'Reference number is required.'
    };
  }

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const collection = db.collection('siteName');

    if (action === 'markNotFound') {
      // Mark site as not found - set flag and clear any existing name
      await collection.updateOne(
        { _id: referenceNumber },
        {
          $set: {
            nameNotFound: true,
            name: null,
            updatedAt: new Date()
          },
          $unset: { name: "" } // Ensure name field is removed
        },
        { upsert: true }
      );

      return {
        apiKey: apiKey, // Keep API key
        referenceNumber: '',
        siteName: '',
        message: `Marked site ${referenceNumber} as "name not found"`,
        error: null
      };
    } else {
      // Add/update site name
      if (!siteName) {
        return {
          apiKey: apiKey,
          referenceNumber: referenceNumber,
          siteName: siteName,
          message: null,
          error: 'Site name is required.'
        };
      }

      await collection.updateOne(
        { _id: referenceNumber },
        {
          $set: {
            name: siteName,
            nameNotFound: false,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return {
        apiKey: apiKey, // Keep API key
        referenceNumber: '',
        siteName: '',
        message: `Successfully added/updated name for site ${referenceNumber}: "${siteName}"`,
        error: null
      };
    }
  } catch (error) {
    console.error('Error updating site name:', error);
    return {
      apiKey: apiKey,
      referenceNumber: referenceNumber,
      siteName: siteName,
      message: null,
      error: 'Failed to save changes. Please try again.'
    };
  }
}
