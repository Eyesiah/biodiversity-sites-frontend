import { API_URL, MONGODB_DATABASE_NAME } from '@/config';
import fs from 'fs';
import path from 'path';
import { processSiteHabitatData, calcSpatialRiskCategory } from '@/lib/habitat';
import OsGridRef from 'geodesy/osgridref.js';
import { fetchSiteSpatialData, fetchAllocSpatialData } from "@/lib/geo"
import clientPromise from '@/lib/mongodb.js';

const isDevelopment = process.env.NODE_ENV === 'development';
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const cacheDir = path.join(process.cwd(), 'dev-api-cache');

if ((isDevelopment || isBuild) && !fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

// Use global object to share queue state across module instances
if (!global.apiRequestQueue) {
  global.apiRequestQueue = [];
  global.apiIsProcessingQueue = false;
  global.apiMinDelayBetweenRequests = 250;
  global.apiLastRequestTime = 0;
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

async function processRequestQueue() {
  if (global.apiIsProcessingQueue || global.apiRequestQueue.length === 0) return;

  global.apiIsProcessingQueue = true;

  while (global.apiRequestQueue.length > 0) {
    // Ensure minimum delay since last request
    const timeSinceLastRequest = Date.now() - global.apiLastRequestTime;
    if (timeSinceLastRequest < global.apiMinDelayBetweenRequests) {
      const delayNeeded = global.apiMinDelayBetweenRequests - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }

    const { resolve, reject, endpoint, verb, body } = global.apiRequestQueue.shift();

    try {
        // Check cache first before fetching
      if (isDevelopment || isBuild) {
        const apiCachePath = getDevCachePath(endpoint);
        if (fs.existsSync(apiCachePath)) {
          console.log(`cache hit: ${endpoint}`);
          const jsonData = fs.readFileSync(apiCachePath, 'utf-8');
          return JSON.parse(jsonData);
        }
      }

      

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
        console.log(`fetching: ${url}`);
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

      global.apiLastRequestTime = Date.now(); // Update completion time
      resolve(data);

    } catch (error) {
      reject(error);
    }

    // Add delay between requests if there are more in queue
    if (global.apiRequestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, global.apiMinDelayBetweenRequests));
    }
  }

  global.apiIsProcessingQueue = false;
}

async function queryBGSAPI(endpoint, verb = 'POST', body = {}) {
  // Check cache first before queuing
  if (isDevelopment || isBuild) {
    const apiCachePath = getDevCachePath(endpoint);
    if (fs.existsSync(apiCachePath)) {
      
      console.log(`cache hit: ${endpoint}`);
      const jsonData = fs.readFileSync(apiCachePath, 'utf-8');
      return JSON.parse(jsonData);
    }
  }

  return new Promise((resolve, reject) => {
    global.apiRequestQueue.push({ resolve, reject, endpoint, verb, body });
    processRequestQueue();
  });
}

async function fetchAllSites(withSiteSpatialData = false, withAllocSpatialData = false, withNames = false) {
  console.log('fetchAllSites');
  let allSites = [];
  const batchSize = 10;

  const siteList = await queryBGSAPI(`search`);
  if (siteList == null) {
    throw new Error(`API returned null when fetching sites`);
  }

  for (let i = 0; i < siteList.length; i += batchSize) {
    console.log(`fetchAllSites: ${i} / ${siteList.length}`)
    const batch = siteList.slice(i, i + batchSize);
    // don't pass withNames as we process that in a single batch below
    const batchPromises = batch.map(site => fetchSite(site.referenceNumber, withSiteSpatialData, withAllocSpatialData, false));
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
    const referenceNumbers = siteList.map(site => site.referenceNumber);
    const namesMap = await getAllSiteNames(referenceNumbers);
    allSites.forEach(site => {
      site.name = namesMap[site.referenceNumber];
    });
  }

  return allSites;
}

async function fetchSite(referenceNumber, withSiteSpatialData = false, withAllocSpatialData = false, withNames = false) {

  console.log(`fetchSite: ${referenceNumber}`);
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

  processSiteHabitatData(site);

  if (withSiteSpatialData) {
    await fetchSiteSpatialData(site);
  }

  if (withAllocSpatialData) {
    await Promise.all(site.allocations.map(async (alloc) => {
      await fetchAllocSpatialData(alloc, site);
      alloc.sr = calcSpatialRiskCategory(alloc, site);
    }));
  }

  return site;
}

export { fetchAllSites, queryBGSAPI, fetchSite };
