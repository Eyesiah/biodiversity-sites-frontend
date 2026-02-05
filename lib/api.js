import { API_URL, MONGODB_DATABASE_NAME } from '@/config';
import fs from 'fs';
import path from 'path';
import { preProcessSiteHabitatData, processSiteHabitatData, calcSpatialRiskCategory } from '@/lib/habitat';
import OsGridRef from 'geodesy/osgridref.js';
import { fetchSiteSpatialData, fetchAllocSpatialData } from "@/lib/geo"
import clientPromise from '@/lib/mongodb.js';
import PQueue from 'p-queue';
import { convertSankeySourceDataToGraph, getHabitatAssignmentData } from "@/lib/sites"
import { HABITAT_UNIT_TYPES } from '@/config'

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const cacheDir = path.join(process.cwd(), 'dev-api-cache');

if ((isDevelopment || isBuild) && !fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

if (global.requestQueue == null) {
  global.requestQueue = new PQueue({ concurrency: 1, interval: 100, intervalCap: 1 });
}

function getDevCachePath(endpoint) {
  // Sanitize endpoint to create a valid filename
  const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(cacheDir, `${sanitizedEndpoint}.json`);
}

async function getSiteName(referenceNumber) {

  if (clientPromise) {
    try {
      const client = await clientPromise;
      const db = client.db(MONGODB_DATABASE_NAME);
      const cache = db.collection('siteName');
      const cacheKey = { _id: referenceNumber };
      const nameRecord = await cache.findOne(cacheKey);
      if (nameRecord) {
        return nameRecord.name;
      }
    } catch (e) {
      console.error('Error reading from site name db', e);
      return null;
    }
  } else {
    return null;
  }
}

async function getAllSiteNames(referenceNumbers) {
  if (!clientPromise) return {};

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const cache = db.collection('siteName');
    const records = await cache.find({
      _id: { $in: referenceNumbers },
      name: { $exists: true, $ne: null }
    }).toArray();
    const namesMap = {};
    records.forEach(record => {
      namesMap[record._id] = record.name;
    });
    return namesMap;
  } catch (e) {
    console.error('Error reading from site name db', e);
    return {};
  }
}

function checkDevCache(endpoint) {
  if (isDevelopment || isBuild) {
    const apiCachePath = getDevCachePath(endpoint);
    if (fs.existsSync(apiCachePath)) {
      const jsonData = fs.readFileSync(apiCachePath, 'utf-8');
      return JSON.parse(jsonData);
    }
  }

  return null;
}

async function queryBGSAPI(endpoint, verb = 'POST', body = {}) {

  // Check cache first
  const cacheResult = checkDevCache(endpoint);
  if (cacheResult) return cacheResult;

  // Add to p-queue for rate limiting
  return global.requestQueue.add(async () => {
    // Check cache first
    const cacheResult = checkDevCache(endpoint);
    if (cacheResult) return cacheResult;

    // Make the actual request
    const url = `${API_URL}/${endpoint}`
    const params = {
      method: verb,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BristolTrees BGS Register/1.0 (https://bgs.bristoltrees.space/)',
      },
      next: { revalidate: 21600 }
    }
    if (verb == 'POST' && body) {
      params.body = JSON.stringify(body);
    }

    let response;
    let attempts = 0;
    const maxAttempts = 6;
    let retryDelay = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      response = await fetch(url, params);

      if (response.ok) break;

      if ((response.status === 502 || response.status === 403) && attempts < maxAttempts) {
        const delay = retryDelay * Math.pow(2, attempts - 1);
        console.warn(`${url}: Attempt ${attempts} failed with status ${response.status}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!response.ok) {
        throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} after ${maxAttempts} attempts, last status: ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    if (isDevelopment || isBuild) {
      const apiCachePath = getDevCachePath(endpoint);
      fs.writeFileSync(apiCachePath, JSON.stringify(data), 'utf-8');
    }

    return data;
  });
}

async function fetchAllRefNos() {

  const siteList = await queryBGSAPI(`search`);
  if (siteList == null) {
    throw new Error(`API returned null when fetching sites`);
  }

  return siteList.filter(site => !site.referenceNumber.includes(' ')).map(site => site.referenceNumber);
}

async function fetchAllSites(withSiteSpatialData = false, withAllocSpatialData = false, withNames = false) {
  let allSites = [];
  const batchSize = 10;

  const referenceNumbers = await fetchAllRefNos();
  if (referenceNumbers == null) {
    throw new Error(`API returned null when fetching sites`);
  }

  for (let i = 0; i < referenceNumbers.length; i += batchSize) {
    const batch = referenceNumbers.slice(i, i + batchSize);
    // don't pass withNames as we process that in a single batch below
    const batchPromises = batch.map(referenceNumber => fetchSite(referenceNumber, withSiteSpatialData, withAllocSpatialData, false));
    const results = await Promise.allSettled(batchPromises);
    const failedResults = results.filter(result => result.status === 'rejected');
    if (failedResults.length > 0) {
      const errorMessages = failedResults.map((result, index) => {
        const siteRef = batch[index].referenceNumber;
        return `Failed to fetch site ${siteRef}: ${result.reason}`;
      });
      throw new Error(`Some site fetches failed:\n${errorMessages.join('\n')}`);
    }
    const successfulSites = results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);
    allSites.push(...successfulSites);
  }

  if (withNames) {
    const namesMap = await getAllSiteNames(referenceNumbers);
    allSites.forEach(site => {
      site.name = namesMap[site.referenceNumber];
    });
  }

  return allSites;
}

async function fetchSite(referenceNumber, withSiteSpatialData = false, withAllocSpatialData = false, withNames = false, withSankey = false) {

  const site = await queryBGSAPI(`search/${referenceNumber}`, 'GET');

  if (!site) {
    return null;
  }

  var gridref = OsGridRef.parse(site.gridReference);
  const latLong = gridref.toLatLon();
  site.latitude = latLong._lat;
  site.longitude = latLong._lon;

  if (withNames) {
    site.name = await getSiteName(referenceNumber);
  }

  preProcessSiteHabitatData(site);
  const habData = {}
  for (const unit of HABITAT_UNIT_TYPES) {
    habData[unit] = getHabitatAssignmentData(site, unit);
  }
  processSiteHabitatData(site, habData);

  if (withSiteSpatialData) {
    await fetchSiteSpatialData(site);
  }

  if (withAllocSpatialData) {
    await Promise.all(site.allocations.map(async (alloc) => {
      await fetchAllocSpatialData(alloc, site);
      alloc.sr = calcSpatialRiskCategory(alloc, site);
    }));
  }

  if (withSankey) {
    site.sankey = {}
    for (const unit of HABITAT_UNIT_TYPES) {
      if (habData[unit]) {
        site.sankey[unit] = convertSankeySourceDataToGraph(unit, habData[unit]);
      }
    }
  }

  return site;
}

export { fetchAllSites, queryBGSAPI, fetchSite, fetchAllRefNos };
