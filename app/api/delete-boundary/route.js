import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import clientPromise from '@/lib/mongodb';
import { MONGODB_DATABASE_NAME } from '@/config';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { apiKey, referenceNumber } = await request.json();

    // Validate API key
    const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || [];
    if (!adminKeys.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key. Access denied.' }, { status: 401 });
    }

    // Validate reference number
    if (!referenceNumber) {
      return NextResponse.json({ error: 'Reference number is required.' }, { status: 400 });
    }

    // Look up the current boundaryMapUrl from MongoDB
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const collection = db.collection('siteName');

    const record = await collection.findOne({ _id: referenceNumber });

    if (!record || !record.boundaryMapUrl) {
      return NextResponse.json({ error: 'No boundary map found for this site.' }, { status: 404 });
    }

    // Delete the blob from Vercel Blob
    await del(record.boundaryMapUrl);

    // Set boundaryMapUrl to null in MongoDB
    await collection.updateOne(
      { _id: referenceNumber },
      {
        $set: {
          boundaryMapUrl: null,
          updatedAt: new Date()
        }
      }
    );

    revalidatePath(`/sites/${referenceNumber}`);
    revalidatePath('/admin');

    return NextResponse.json({
      message: `Boundary map deleted successfully for site ${referenceNumber}`
    });
  } catch (error) {
    console.error('Error deleting boundary map:', error);
    return NextResponse.json({ error: 'Failed to delete boundary map.' }, { status: 500 });
  }
}