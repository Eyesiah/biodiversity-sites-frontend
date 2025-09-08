import clientPromise from '../../lib/mongodb';
import { fetchAllSites } from '../../lib/api';
import { processSiteDataForIndex } from '../../lib/sites';

async function handler(req, res) {
  // Protect the endpoint with a secret
  const { authorization } = req.headers;
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Fetch the data from the external API
    const allSites = await fetchAllSites();

    // 2. Process the data to get the summary
    const { summary } = processSiteDataForIndex(allSites);

    // 3. Save the statistics to the database
    const client = await clientPromise;
    const db = client.db();
    const statsCollection = db.collection('statistics');

    const timestamp = new Date();
    await statsCollection.insertOne({
      timestamp,
      ...summary,
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
