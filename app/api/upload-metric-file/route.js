import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import clientPromise from '@/lib/mongodb';
import { MONGODB_DATABASE_NAME } from '@/config';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function saveMetricFile(referenceNumber, url, fileName) {
  const client = await clientPromise;
  const db = client.db(MONGODB_DATABASE_NAME);
  await db.collection('siteName').updateOne(
    { _id: referenceNumber },
    { $set: { metricFileUrl: url, metricFileName: fileName, updatedAt: new Date() } },
    { upsert: true }
  );
  revalidatePath(`/sites/${referenceNumber}`);
  revalidatePath('/admin');
}

export async function POST(request) {
  const body = await request.json();

  // Explicit save call from client after upload() completes
  if (body.action === 'save') {
    const { apiKey, referenceNumber, url, fileName } = body;

    const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || [];
    if (!adminKeys.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key. Access denied.' }, { status: 401 });
    }
    if (!referenceNumber || !/^BGS-\d{9}$/.test(referenceNumber)) {
      return NextResponse.json({ error: 'Invalid reference number format.' }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }

    try {
      await saveMetricFile(referenceNumber, url, fileName || null);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error saving metric file metadata:', error);
      return NextResponse.json({ error: 'Failed to save metric file metadata.' }, { status: 500 });
    }
  }

  // handleUpload protocol: token generation + completion webhook from Vercel Blob CDN
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { apiKey, referenceNumber } = JSON.parse(clientPayload);

        const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || [];
        if (!adminKeys.includes(apiKey)) {
          throw new Error('Invalid API key. Access denied.');
        }
        if (!referenceNumber || !/^BGS-\d{9}$/.test(referenceNumber)) {
          throw new Error('Invalid reference number format.');
        }
        const ext = pathname.toLowerCase().split('.').pop();
        if (!['xlsm', 'xlsx'].includes(ext)) {
          throw new Error('Only .xlsm or .xlsx files are allowed.');
        }

        return {
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ referenceNumber }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { referenceNumber } = JSON.parse(tokenPayload);
        const fileName = blob.pathname.split('/').pop();
        try {
          await saveMetricFile(referenceNumber, blob.url, fileName);
        } catch (error) {
          console.error('onUploadCompleted: failed to save metric file metadata:', error);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error in metric file upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload metric file.' },
      { status: 400 }
    );
  }
}
