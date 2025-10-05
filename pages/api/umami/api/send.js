// pages/api/api/send.js
export default async function handler(req, res) {
  const umamiCollectUrl = 'http://bgs-umami.eu-west-2.elasticbeanstalk.com/api/send';

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch(umamiCollectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to forward to umami: ${response.statusText}, ${errorText}`);
    }

    const data = await response.text();
    res.status(response.status).send(data);

  } catch (error) {
    console.error('Error proxying umami collect request:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
}
