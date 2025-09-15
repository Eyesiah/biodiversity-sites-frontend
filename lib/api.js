import {API_URL} from '@/config';
import fs from 'fs';
import path from 'path';
import { processSiteHabitatData } from '@/lib/habitat';
import { getLSOAInfo } from '@/lib/LSOA'
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL } from '@/config'
import OsGridRef from 'mt-osgridref'

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
    cache: 'force-cache',
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

const fetchSpatialData = async (site) => {
  if (!site.latitude || !site.longitude) {
    return { ...site, lsoaName: 'N/A', lnrsName: 'N/A', ncaName: 'N/A', lpaName: 'N/A' };
  }

  const point = `geometry=${site.longitude},${site.latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;

  const lsoaUrl = `${ARCGIS_LSOA_URL}?${point}&outFields=LSOA11NM`;
  const lnrsUrl = `${ARCGIS_LNRS_URL}?${point}&outFields=Name`;
  const ncaUrl = `${ARCGIS_NCA_URL}?${point}&outFields=NCA_Name`;
  const lpaUrl = `${ARCGIS_LPA_URL}?${point}&outFields=LPA23NM`;

  try {
    const [lsoaRes, lnrsRes, ncaRes, lpaRes] = await Promise.all([
      fetch(lsoaUrl),
      fetch(lnrsUrl),
      fetch(ncaUrl),
      fetch(lpaUrl),
    ]);

    const [lsoaData, lnrsData, ncaData, lpaData] = await Promise.all([
      lsoaRes.json(),
      lnrsRes.json(),
      ncaRes.json(),
      lpaRes.json(),
    ]);

    const lsoaName = lsoaData.features?.[0]?.attributes?.LSOA11NM.trim() || 'N/A';
    site.lnrsName = lnrsData.features?.[0]?.attributes?.Name.trim() || 'N/A';
    site.ncaName = ncaData.features?.[0]?.attributes?.NCA_Name.trim() || 'N/A';
    site.lpaName = lpaData.features?.[0]?.attributes?.LPA23NM.trim() || 'N/A';

    const lsoaInfo = getLSOAInfo(lsoaName);
    site.lsoa = {
      name: lsoaName,
      ...lsoaInfo
    }

  } catch (error) {
    console.error(`Failed to fetch spatial data for site ${site.referenceNumber}`, error);
  }
};

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
  const latLong = OsGridRef.osGridToLatLong(gridref);
  site.latitude = latLong._lat;
  site.longitude = latLong._lon;

  processSiteHabitatData(site);

  if (withSpatialData)
  {
    await fetchSpatialData(site);
  }

  return site;
}

export { fetchAllSites, queryBGSAPI, fetchSite };