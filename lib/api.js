import API_URL from '../config.js';
import fs from 'fs';
import path from 'path';
import { processSiteHabitatData } from './habitat';
import { getLSOAInfo } from './LSOA'

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

const fetchSpatialData = async (site) => {
  if (!site.latitude || !site.longitude) {
    return { ...site, lsoaName: 'N/A', lnrsName: 'N/A' };
  }

  const lsoaUrl = `https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_Dec_2011_Boundaries_Full_Clipped_BFC_EW_V3_2022/FeatureServer/0/query?geometry=${site.longitude},${site.latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=LSOA11NM&returnGeometry=false&f=json`;
  const lnrsUrl = `https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/LNRS_Area/FeatureServer/0/query?geometry=${site.longitude},${site.latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=Name&returnGeometry=false&f=json`;

  try {
    const [lsoaRes, lnrsRes] = await Promise.all([fetch(lsoaUrl), fetch(lnrsUrl)]);
    const [lsoaData, lnrsData] = await Promise.all([lsoaRes.json(), lnrsRes.json()]);

    const lsoaName = lsoaData.features?.[0]?.attributes?.LSOA11NM.trim() || 'N/A';
    site.lnrsName = lnrsData.features?.[0]?.attributes?.Name.trim() || 'N/A';

    const lsoaInfo = getLSOAInfo(lsoaName);
    site.lsoa = {
      name: lsoaName,
      ...lsoaInfo
    }

  } catch (error) {
    console.error(`Failed to fetch spatial data for site ${site.referenceNumber}`, error);
  }
};

async function fetchAllSites(maxResults=0, withSpatialData=false) {
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

  if (withSpatialData) {
    const batchSize = 20;
    for (let i = 0; i < allSites.length; i += batchSize) {
      const batch = allSites.slice(i, i + batchSize);
      const batchPromises = batch.map(fetchSpatialData);
      await Promise.all(batchPromises);
    }
  }

  return allSites;
}

async function fetchSite(referenceNumber, withSpatialData=false) {

  const site = await queryBGSAPI(`BiodiversityGainSites/${referenceNumber}`);

  if (!site) {
    return null;
  }

  processSiteHabitatData(site);

  if (withSpatialData)
  {
    await fetchSpatialData(site);
  }

  return site;
}

export { fetchAllSites, queryBGSAPI, fetchSite };