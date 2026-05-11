import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import clientPromise from '@/lib/mongodb';
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import { MONGODB_DATABASE_NAME } from '@/config';

export async function GET(request) {
  // Protect the endpoint with a secret
  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // init the db connection
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);

    // Fetch the data from the external API
    const allSites = await fetchAllSites();

    // Process the data to get the summary
    const { processedSites, summary } = processSiteDataForIndex(allSites);

    // get the set of sites that were already known
    const sitesCollection = db.collection('sites');
    const knownSites = await sitesCollection.find({}).toArray();
    const knownSiteIDs = knownSites.map((site) => site.id);
    let newSites = [];
    for (const site of processedSites) {
      if (!knownSiteIDs.includes(site.referenceNumber)) {
        newSites.push(site.referenceNumber)
        await sitesCollection.insertOne({id: site.referenceNumber});
      }
    }


    // Save the statistics to the database
    const statsCollection = db.collection('statistics');

    const timestamp = new Date();
    const version = process.env.APP_VERSION;
    await statsCollection.insertOne({
      timestamp,
      version,
      ...summary,
      newSites
    });

    revalidatePath('/statistics');

    return NextResponse.json({
      message: 'Statistics updated successfully.',
      summary,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    // Pass the error message from the fetchAllSites call if it exists
    const errorMessage = error.message || 'Internal Server Error';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

