import {API_URL} from '@/config';
import fs from 'fs';
import path from 'path';
import { processSiteHabitatData } from '@/lib/habitat';
import OsGridRef from 'geodesy/osgridref.js';
import { fetchSiteSpatialData } from "@/lib/geo"

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

async function queryBGSAPI(endpoint, verb='POST', body = {}) {
  
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
  const params = {
    method: verb,
    headers: {
      'Content-Type': 'application/json',
    },
    
    next: { revalidate: 3600 } 
  }
  if (verb == 'POST' && body) {
    params.body = JSON.stringify(body);
  }

  const response = await fetch(url, params);

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

async function fetchAllSites(withSpatialData=false) {
  let allSites = [];
  const batchSize = 20;

  const siteList = await queryBGSAPI(`search`);
  if (siteList == null)
  {
    throw new Error(`API returned null when fetching sites`);
  }

  for (let i = 0; i < siteList.length; i += batchSize) {
    const batch = siteList.slice(i, i + batchSize);
    const batchPromises = batch.map(site => fetchSite(site.referenceNumber, withSpatialData));
    const results = await Promise.allSettled(batchPromises);
    const successfulSites = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);
    allSites.push(...successfulSites);
  }

  return allSites;
}

async function fetchSite(referenceNumber, withSpatialData=false) {

  const site = await queryBGSAPI(`search/${referenceNumber}`, 'GET');

  if (!site) {
    return null;
  }

  var gridref = OsGridRef.parse(site.gridReference);
  const latLong = gridref.toLatLon();
  site.latitude = latLong._lat;
  site.longitude = latLong._lon;

  processSiteHabitatData(site);

  if (withSpatialData)
  {
    await fetchSiteSpatialData(site);
  }

  return site;
}

export { fetchAllSites, queryBGSAPI, fetchSite };