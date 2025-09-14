import clientPromise from 'lib/mongodb';
import { fetchAllSites } from 'lib/api';
import { processSiteDataForIndex } from 'lib/sites';

async function handler(req, res) {
  // Protect the endpoint with a secret
  const { authorization } = req.headers;
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // init the db connection
    const client = await clientPromise;
    const db = client.db();

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
    await statsCollection.insertOne({
      timestamp,
      ...summary,
      newSites
    });

    res.status(200).json({
      message: 'Statistics updated successfully.',
      summary,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    // Pass the error message from the fetchAllSites call if it exists
    const errorMessage = error.message || 'Internal Server Error';
    res.status(500).json({ message: errorMessage });
  }
}

export default handler;
