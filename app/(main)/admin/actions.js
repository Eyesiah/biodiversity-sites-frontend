"use server"

import clientPromise from '@/lib/mongodb.js';
import { MONGODB_DATABASE_NAME } from '@/config';

export async function addSiteName(prevState, formData) {
  const apiKey = formData.get("apiKey");
  let referenceNumber = formData.get("referenceNumber");
  const siteName = formData.get("siteName");
  const bgsReference = formData.get("bgsReference");
  const bgsReferenceUrl = formData.get("bgsReferenceUrl");
  const bgsWebsite = formData.get("bgsWebsite");
  const action = formData.get("action"); // 'add', 'clearSiteName' or 'markNotFound'

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
      bgsReference: bgsReference,
      bgsReferenceUrl: bgsReferenceUrl,
      bgsWebsite: bgsWebsite,
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
      bgsReference: bgsReference,
      bgsReferenceUrl: bgsReferenceUrl,
      bgsWebsite: bgsWebsite,
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
        },
        { upsert: true }
      );

      return {
        apiKey: apiKey, // Keep API key
        referenceNumber: '',
        siteName: '',
        bgsReference: '',
        bgsReferenceUrl: '',
        bgsWebsite: '',
        message: `Marked site ${referenceNumber} as "name not found"`,
        error: null
      };
    } else if (action === 'clearSiteName') {
      // Clear the BGS data fields, preserving the site name and nameNotFound flag
      await collection.updateOne(
        { _id: referenceNumber },
        {
          $set: {
            bgsReference: null,
            bgsReferenceUrl: null,
            bgsWebsite: null,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return {
        apiKey: apiKey, // Keep API key
        referenceNumber: '',
        siteName: '',
        bgsReference: '',
        bgsReferenceUrl: '',
        bgsWebsite: '',
        message: `Cleared BGS data fields for site ${referenceNumber}`,
        error: null
      };
     
    } else {
      // Add/update site data
      await collection.updateOne(
        { _id: referenceNumber },
        {
          $set: {
            name: siteName || null,
            nameNotFound: false,
            bgsReference: bgsReference || null,
            bgsReferenceUrl: bgsReferenceUrl || null,
            bgsWebsite: bgsWebsite || null,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return {
        apiKey: apiKey, // Keep API key
        referenceNumber: '',
        siteName: '',
        bgsReference: '',
        bgsReferenceUrl: '',
        bgsWebsite: '',
        message: `Successfully updated data for site ${referenceNumber}`,
        error: null
      };
    }
  } catch (error) {
    console.error('Error updating site data:', error);
    return {
      apiKey: apiKey,
      referenceNumber: referenceNumber,
      siteName: siteName,
      bgsReference: bgsReference,
      bgsReferenceUrl: bgsReferenceUrl,
      bgsWebsite: bgsWebsite,
      message: null,
      error: 'Failed to save changes. Please try again.'
    };
  }
}
