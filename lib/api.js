import API_URL from '../config.js';
import fs from 'fs';
import path from 'path';
import { getHabitatDistinctiveness, processSiteHabitatData } from './habitat';

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const cacheDir = path.join(process.cwd(), 'dev-api-cache');

if ((isDevelopment || isBuild) && !fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

function getDevCachePath(endpoint)
{
  // Sanitize endpoint to create a valid filename
  const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(cacheDir, `${sanitizedEndpoint}.json`);
}

async function queryBGSAPI(endpoint) {
  
  if (isDevelopment || isBuild)
  {
    // see if its in the local dev cache
    const apiCachePath = getDevCachePath(endpoint);
    if (fs.existsSync(apiCachePath))
    {
        const jsonData = fs.readFileSync(apiCachePath, 'utf-8');
        return JSON.parse(jsonData);
    }
  }

  const url = `${API_URL}/${endpoint}`
  const response = await fetch(
    url,
    { cache: 'force-cache', next: { revalidate: 3600 } } // Revalidate is still here for runtime
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
  }
  const data = await response.json();

  if (isDevelopment || isBuild)
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

  for (const site of allSites)
  {
    processSiteHabitatData(site);
  }

  return allSites;
}

async function fetchSite(referenceNumber) {

  const site = await queryBGSAPI(`BiodiversityGainSites/${referenceNumber}`);

  if (!site) {
    return null;
  }

  processSiteHabitatData(site);
  return site;
}

export { fetchAllSites, queryBGSAPI, fetchSite };