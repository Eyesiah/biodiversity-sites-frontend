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
      return NextResponse.json({ error: 'PDF file is required.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blobPath = `boundary-maps/${referenceNumber}.pdf`;
    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Save boundaryMapUrl to MongoDB siteName collection
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const collection = db.collection('siteName');

    await collection.updateOne(
      { _id: referenceNumber },
      {
        $set: {
          boundaryMapUrl: blob.url,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      message: `Boundary map uploaded successfully for site ${referenceNumber}`,
      url: blob.url
    });
  } catch (error) {
    console.error('Error uploading boundary map:', error);
    return NextResponse.json({ error: 'Failed to upload boundary map.' }, { status: 500 });
  }
}