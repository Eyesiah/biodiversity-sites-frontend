import { API_URL, MONGODB_DATABASE_NAME } from '@/config';
import fs from 'fs';
import path from 'path';
import { preProcessSiteHabitatData, processSiteHabitatData, calcSpatialRiskCategory } from '@/lib/habitat';
import OsGridRef from 'geodesy/osgridref.js';
import { fetchSiteSpatialData, fetchAllocSpatialData } from "@/lib/geo"
import clientPromise from '@/lib/mongodb.js';
import PQueue from 'p-queue';
import { convertSankeySourceDataToGraph, getHabitatAssignmentData, processSiteForListView } from "@/lib/sites"
import { HABITAT_UNIT_TYPES } from '@/config'
import { slugify } from '@/lib/format';

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

async function getSiteName(site) {

  if (clientPromise) {
    try {
      const client = await clientPromise;
      const db = client.db(MONGODB_DATABASE_NAME);
      const cache = db.collection('siteName');
      const cacheKey = { _id: site.referenceNumber };
      const nameRecord = await cache.findOne(cacheKey);
      if (nameRecord) {
        site.name = nameRecord.name;
      }
    } catch (e) {
      console.error('Error reading from site name db', e);
    }
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
        const siteRef = batch[index];
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


  preProcessSiteHabitatData(site);
  const habData = {}
  for (const unit of HABITAT_UNIT_TYPES) {
    habData[unit] = getHabitatAssignmentData(site, unit);
  }
  processSiteHabitatData(site, habData);

  const allPromises = [];

  if (withNames) {
    allPromises.push(getSiteName(site));
  }

  if (withSiteSpatialData) {
    allPromises.push(fetchSiteSpatialData(site));
  }

  if (withAllocSpatialData) {
    allPromises.push(...site.allocations.map(async (alloc) => {
      await fetchAllocSpatialData(alloc, site);
      alloc.sr = calcSpatialRiskCategory(alloc, site);
    }));
  }

  await Promise.all(allPromises);

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

/**
 * Transform site allocations into the format used by AllocationsList.
 * @param {Array} allSites - Array of site objects with allocations
 * @returns {Array} - Array of transformed allocation objects
 */
function transformAllocations(allSites) {
  return allSites.flatMap(site => {
    if (!site.allocations) return [];
    return site.allocations.map(alloc => {
      return {
        pr: alloc.planningReference,
        dr: alloc.developerReference,
        lpa: alloc.localPlanningAuthority,
        nca: alloc.nca,
        pn: alloc.projectName,
        au: alloc.areaUnits,
        hu: alloc.hedgerowUnits,
        wu: alloc.watercoursesUnits,
        srn: site.referenceNumber,
        siteName: site.name,
        d: alloc.distance,
        sr: alloc.sr,
        imd: alloc.lsoa?.IMDDecile || 'N/A',
        simd: site.lsoa?.IMDDecile || 'N/A',
        imdS: alloc.lsoa?.IMDScore || 'N/A',
        simdS: site.lsoa?.IMDScore || 'N/A',
        habitats: alloc.habitats
      };
    });
  });
}

/**
 * Fetch all unique LPA/planning reference combinations for static params.
 * Used for ISR page generation.
 */
async function fetchAllAllocationsForStaticParams() {
  const allSites = await fetchAllSites(false, false, false);

  const allocationPaths = [];
  const seen = new Set();
  const slugMappings = new Map(); // Collect unique mappings for bulk insert

  for (const site of allSites) {
    if (!site.allocations) continue;

    for (const alloc of site.allocations) {
      const lpaSlug = slugify(alloc.localPlanningAuthority);
      const refSlug = slugify(alloc.planningReference);
      const key = `${lpaSlug}/${refSlug}`;
      const cacheKey = `${lpaSlug}_${refSlug}`;

      // Collect unique slug mappings (avoid duplicates)
      if (!slugMappings.has(cacheKey)) {
        slugMappings.set(cacheKey, {
          _id: cacheKey,
          lpa: alloc.localPlanningAuthority,
          planningRef: alloc.planningReference,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Avoid duplicates for static params
      if (!seen.has(key)) {
        seen.add(key);
        allocationPaths.push({
          lpa: lpaSlug,
          planningRef: refSlug
        });
      }
    }
  }

  // Bulk insert all slug mappings in a single operation
  await cacheSlugMappingsBulk(Array.from(slugMappings.values()));

  return allocationPaths;
}

/**
 * Cache helper function to get allocation match results from MongoDB
 * @param {string} lpa - The Local Planning Authority name
 * @param {string} planningRef - The planning reference
 * @returns {Promise<string[] | null>} Cached site reference numbers or null if not cached or expired
 */
async function getAllocMatchCache(lpa, planningRef) {
  if (!clientPromise) return null;

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const cache = db.collection('allocMatchCache');

    const cacheKey = { lpa: lpa, planningRef: planningRef };
    const cachedResult = await cache.findOne(cacheKey);

    if (cachedResult) {
      // Check if cache is still valid (not expired)
      if (cachedResult.expiresAt && new Date() < cachedResult.expiresAt) {
        return cachedResult.siteRefNumbers;
      } else {
        // Cache expired, remove it
        await cache.deleteOne(cacheKey);
      }
    }
  } catch (e) {
    console.error('Error reading from allocMatchCache:', e);
    // If cache read fails, proceed without cache
  }

  return null;
}

/**
 * Cache helper function to set allocation match results in MongoDB
 * @param {string} lpa - The Local Planning Authority name
 * @param {string} planningRef - The planning reference
 * @param {string[]} siteRefNumbers - Array of matching site reference numbers
 */
async function setAllocMatchCache(lpa, planningRef, siteRefNumbers) {
  if (!clientPromise) return;

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const cache = db.collection('allocMatchCache');

    const cacheKey = { lpa: lpa, planningRef: planningRef };
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await cache.updateOne(
      cacheKey,
      {
        $set: {
          siteRefNumbers: siteRefNumbers,
          createdAt: new Date(),
          expiresAt: expiresAt
        }
      },
      { upsert: true }
    );
  } catch (e) {
    console.error('Error writing to allocMatchCache:', e);
    // Don't fail the request if caching fails
  }
}

async function fetchSitesWithMatchingAllocs(lpa, planningRef) {
  const slugifiedLpa = slugify(lpa);
  const slugifiedRef = slugify(planningRef);

  // Check cache first
  const cachedResult = await getAllocMatchCache(slugifiedLpa, slugifiedRef);
  if (cachedResult) {
    return cachedResult;
  }

  // First, fetch all sites WITHOUT spatial data to find matches
  const allSites = await fetchAllSites();

  // Find matching allocations and track which sites need spatial data
  const siteRefNumbers = [];

  for (const site of allSites) {
    if (!site.allocations) continue;

    for (const alloc of site.allocations) {
      const allocLpaSlug = slugify(alloc.localPlanningAuthority);
      const allocRefSlug = slugify(alloc.planningReference);

      if (allocLpaSlug === slugifiedLpa && allocRefSlug === slugifiedRef) {
        siteRefNumbers.push(site.referenceNumber);
        break;
      }
    }
  }

  // Cache the results for 24 hours
  await setAllocMatchCache(slugifiedLpa, slugifiedRef, siteRefNumbers);

  return siteRefNumbers;
}

/**
 * Fetch allocation data with site information for map display.
 * Returns allocations plus site data for rendering on a map.
 * Uses processSiteForListView to reduce payload size.
 * @param {string} lpa - The Local Planning Authority name
 * @param {string} planningRef - The planning reference
 * @returns {Object} - { allocations, sites, selectedSite }
 */
async function fetchAllocationWithSiteData(lpa, planningRef) {

  const siteRefNumbers = await fetchSitesWithMatchingAllocs(lpa, planningRef);

  if (siteRefNumbers.length === 0) {
    return { allocations: [], sites: [], summary: {} };
  }

  // Fetch full site data with spatial data AND names for the matching sites
  const sitesWithSpatialData = await Promise.all(
    siteRefNumbers.map(refNo =>
      fetchSite(refNo, true, false, true)
    )
  );

  // Filter out any failed fetches
  const validSites = sitesWithSpatialData.filter(s => s !== null);

  const slugifiedLpa = slugify(lpa);
  const slugifiedRef = slugify(planningRef);

  // Flatten the nested structure into a single list of valid allocations
  const matchingAllocations = validSites.flatMap(site =>
    (site.allocations || [])
      .filter(alloc => {
        const allocLpaSlug = slugify(alloc.localPlanningAuthority);
        const allocRefSlug = slugify(alloc.planningReference);
        return allocLpaSlug === slugifiedLpa && allocRefSlug === slugifiedRef;
      })
      .map(alloc => ({ alloc, site })) // Keep track of the parent site
  );

  // run the fetchAllocSpatialDatas in parallel for only the matching allocs
  const transformedAllocations = await Promise.all(
    matchingAllocations.map(async ({ alloc, site }) => {
      await fetchAllocSpatialData(alloc, site);
      alloc.sr = calcSpatialRiskCategory(alloc, site);
      return {
        lpa: site.lpaName,
        nca: site.ncaName,
        au: alloc.areaUnits,
        hu: alloc.hedgerowUnits,
        wu: alloc.watercoursesUnits,
        srn: site.referenceNumber,
        siteName: site.name,
        sitePosition: [site.latitude, site.longitude],
        d: alloc.distance,
        sr: alloc.sr,
        imd: alloc.lsoa?.IMDDecile || 'N/A',
        simd: site.lsoa?.IMDDecile || 'N/A',
        imdS: alloc.lsoa?.IMDScore || 'N/A',
        simdS: site.lsoa?.IMDScore || 'N/A',
        habitats: alloc.habitats,
        coords: alloc.coords
      };
    })
  );

  // Process sites for list view (reduced payload for map markers), now with names
  const processedSites = validSites.map(s => processSiteForListView(s));

  const firstAlloc = matchingAllocations[0].alloc;
  const summary = {
    ref: firstAlloc.planningReference,
    address: firstAlloc.projectName,
    lpaName: firstAlloc.localPlanningAuthority,
    ncaName: firstAlloc.nca,
    lsoa: firstAlloc.lsoa,
    latitude: firstAlloc.coords.latitude,
    longitude: firstAlloc.coords.longitude,
  };

  return {
    summary: summary,
    allocations: transformedAllocations,
    sites: processedSites,
  };
}

/**
 * Bulk cache helper function to set multiple slug mappings in a single database operation
 * @param {Array} mappings - Array of slug mapping objects
 */
async function cacheSlugMappingsBulk(mappings) {
  if (!clientPromise || mappings.length === 0) return;

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const cache = db.collection('slugMapping');

    // Use bulk operations for maximum efficiency
    const bulkOps = mappings.map(mapping => ({
      updateOne: {
        filter: { _id: mapping._id },
        update: {
          $set: {
            lpa: mapping.lpa,
            planningRef: mapping.planningRef,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    await cache.bulkWrite(bulkOps);
    console.log(`Cached ${mappings.length} slug mappings in single bulk operation`);
  } catch (e) {
    console.error('Error caching slug mappings:', e);
  }
}

/**
 * Get unslugified LPA and planning reference values from cache
 * Falls back to slugified values if cache miss or error occurs
 * @param {string} slugifiedLpa - The slugified LPA
 * @param {string} slugifiedRef - The slugified planning reference
 * @returns {Promise<{lpa: string, planningRef: string}>} Unslugified values or fallbacks
 */
async function getUnslugifiedValues(slugifiedLpa, slugifiedRef) {
  if (!clientPromise) return { lpa: slugifiedLpa, planningRef: slugifiedRef };

  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const cache = db.collection('slugMapping');

    const cacheKey = `${slugifiedLpa}_${slugifiedRef}`;
    const cachedResult = await cache.findOne({ _id: cacheKey });

    if (cachedResult) {
      return {
        lpa: cachedResult.lpa,
        planningRef: cachedResult.planningRef
      };
    }

    // Cache miss - fallback to slugified values
    console.log(`Slug mapping cache miss for ${cacheKey}, using slugified values`);
    return { lpa: slugifiedLpa, planningRef: slugifiedRef };
  } catch (e) {
    console.error('Error reading slug mapping:', e);
    // Fallback to slugified values on error
    return { lpa: slugifiedLpa, planningRef: slugifiedRef };
  }
}

export { fetchAllSites, queryBGSAPI, fetchSite, fetchAllRefNos, fetchAllAllocationsForStaticParams, transformAllocations, fetchAllocationWithSiteData, cacheSlugMappingsBulk, getUnslugifiedValues };
