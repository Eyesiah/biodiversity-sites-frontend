import clientPromise from '../../lib/mongodb';
import { createHash } from 'crypto';

// Function to hash the IP address
function hashIp(ip) {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!clientPromise) {
    return res.status(503).json({ message: 'Service Unavailable. Analytics is disabled.' });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.NODE_ENV === 'development' ? 'analytics-dev' : 'analytics';
    const db = client.db(dbName);
    const collection = db.collection('events');

    const body = req.body;

    // Basic validation
    if (!body || !body.pathname) {
        return res.status(400).json({ message: 'Bad Request. Event data is missing.' });
    }

    const event = {
        pathname: body.pathname,
        search: body.search,
        timestamp: body.timestamp,
        userAgent: body.userAgent,
        ip_hash: hashIp(body.ip),
        geo: body.geo,
    };

    await collection.insertOne(event);

    return res.status(201).json({ message: 'Event created' });
  } catch (e) {
    console.error('API Error:', e);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}