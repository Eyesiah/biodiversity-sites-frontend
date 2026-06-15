import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import clientPromise from '@/lib/mongodb';
import { MONGODB_DATABASE_NAME } from '@/config';

export const maxDuration = 60; // 1 minute timeout for uploads
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey');
    const referenceNumber = formData.get('referenceNumber');
    const file = formData.get('file');

    // Validate API key
    const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || [];
    if (!adminKeys.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key. Access denied.' }, { status: 401 });
    }

    // Validate reference number
    if (!referenceNumber) {
      return NextResponse.json({ error: 'Reference number is required.' }, { status: 400 });
    }

    // Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Metric file is required.' }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsm', 'xlsx'].includes(ext)) {
      return NextResponse.json({ error: 'Only .xlsm or .xlsx files are allowed.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blobPath = `metric-files/${referenceNumber}.${ext}`;
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Save metricFileUrl to MongoDB siteName collection
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const collection = db.collection('siteName');

    await collection.updateOne(
      { _id: referenceNumber },
      {
        $set: {
          metricFileUrl: blob.url,
          metricFileName: file.name,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      message: `Metric file uploaded successfully for site ${referenceNumber}`,
      url: blob.url
    });
  } catch (error) {
    console.error('Error uploading metric file:', error);
    return NextResponse.json({ error: 'Failed to upload metric file.' }, { status: 500 });
  }
}
