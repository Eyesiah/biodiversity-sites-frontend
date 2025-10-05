// pages/api/umami.js
export default async function handler(req, res) {
  const umamiScriptUrl = 'http://bgs-umami.eu-west-2.elasticbeanstalk.com/script.js';

  try {
    const scriptResponse = await fetch(umamiScriptUrl, { next: { revalidate: 86400 } });
    if (!scriptResponse.ok) {
      throw new Error(`Failed to fetch script: ${scriptResponse.statusText}`);
    }
    const scriptText = await scriptResponse.text();

    res.setHeader('Content-Type', 'application/javascript');
    res.status(200).send(scriptText);
  } catch (error) {
    console.error('Error proxying umami script:', error);
    res.status(500).json({ error: 'Failed to proxy umami script' });
  }
}