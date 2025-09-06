import API_URL from '../config.js';
import fs from 'fs';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const cacheDir = path.join(process.cwd(), 'dev-api-cache');

if (isDevelopment && !fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

function getDevCachePath(endpoint)
{
  // Sanitize endpoint to create a valid filename
  const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(cacheDir, `${sanitizedEndpoint}.json`);
}

async function queryBGSAPI(endpoint) {

    if (isDevelopment)
    {
      // see if its in the local dev cache
      const apiCachePath = getDevCachePath(endpoint);
      if (fs.existsSync(apiCachePath))
      {
          const jsonData = fs.readFileSync(apiCachePath, 'utf-8');
          return JSON.parse(jsonData);
      }
    }
  
    const response = await fetch(
      `${API_URL}/${endpoint}`,      
      { next: { revalidate: 3600 } } // Revalidate the data at most once per hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}, status: ${response.status}`);
    }
    const data = await response.json();

    if (isDevelopment)
    {
      // write to the dev cache
      const apiCachePath = getDevCachePath(endpoint);
      fs.writeFileSync(apiCachePath, JSON.stringify(data), 'utf-8');
    }

    return data;
}

async function fetchAllSites(maxResults=0) {
  let allSites = [];
  let page = 0;
  const resultsPerPage = 50;
  let hasMore = true;

  while (hasMore) {
    const data = await queryBGSAPI(`BiodiversityGainSites?page=${page}&resultsPerPage=${resultsPerPage}`);
    if (data == null)
    {
      throw new Error(`API returned null when fetching sites`);
    }

    const sites = data.sites;

    if (sites && sites.length > 0) {
      allSites.push(...sites);
      page++;
    } else {
      hasMore = false;
    }

    if (maxResults > 0 && allSites.length >= maxResults)
    {
      hasMore = false;
    }
  }

  return allSites;
}

export { fetchAllSites, queryBGSAPI };