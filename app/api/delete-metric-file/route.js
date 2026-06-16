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

    // Look up the current metricFileUrl from MongoDB
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const collection = db.collection('siteName');

    const record = await collection.findOne({ _id: referenceNumber });

    if (!record || !record.metricFileUrl) {
      return NextResponse.json({ error: 'No metric file found for this site.' }, { status: 404 });
    }

    // Delete the blob from Vercel Blob
    await del(record.metricFileUrl);

    // Remove metricFileUrl/metricFileName from MongoDB
    await collection.updateOne(
      { _id: referenceNumber },
      {
        $unset: {
          metricFileUrl: '',
          metricFileName: ''
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    revalidatePath(`/sites/${referenceNumber}`);
    revalidatePath('/admin');

    return NextResponse.json({
      message: `Metric file deleted successfully for site ${referenceNumber}`
    });
  } catch (error) {
    console.error('Error deleting metric file:', error);
    return NextResponse.json({ error: 'Failed to delete metric file.' }, { status: 500 });
  }
}
