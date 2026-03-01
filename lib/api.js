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

function transformAllocation(alloc, site) {
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
    }
}

/**
 * Transform site allocations into the format used by AllocationsList.
 * @param {Array} allSites - Array of site objects with allocations
 * @returns {Array} - Array of transformed allocation objects
 */
function transformAllocations(allSites) {
  return allSites.flatMap(site => {
    if (!site.allocations) return [];
    return site.allocations.map(alloc => transformAllocation(alloc, site));
  });
}

/**
 * Fetch allocation data by Local Planning Authority and planning reference.
 * Returns an array of allocations matching the criteria.
 * Optimized to only fetch spatial data for the specific site(s) with matching allocations.
 */
async function fetchAllocationByLPAAndRef(lpa, planningRef, withSpatialData = true) {
  const slugifiedLpa = slugify(lpa);
  const slugifiedRef = slugify(planningRef);

  // First, fetch all sites WITHOUT spatial data to find matches
  const allSites = await fetchAllSites(false, false, false);
  
  // Find matching allocations and track which sites need spatial data
  const matchingAllocations = [];
  const sitesNeedingSpatialData = new Set();
  
  for (const site of allSites) {
    if (!site.allocations) continue;
    
    for (const alloc of site.allocations) {
      const allocLpaSlug = slugify(alloc.localPlanningAuthority);
      const allocRefSlug = slugify(alloc.planningReference);
      
      if (allocLpaSlug === slugifiedLpa && allocRefSlug === slugifiedRef) {
        matchingAllocations.push({
          ...transformAllocation(alloc, site),
          srn: site.referenceNumber,
          siteName: site.name,
          simd: site.lsoa?.IMDDecile || 'N/A',
          simdS: site.lsoa?.IMDScore || 'N/A'
        });
        sitesNeedingSpatialData.add(site.referenceNumber);
      }
    }
  }

  // If no spatial data needed or no matches, return what we have
  if (!withSpatialData || matchingAllocations.length === 0) {
    return matchingAllocations;
  }

  // Only fetch spatial data for the specific site(s) with matching allocations
  const sitesWithSpatialData = await Promise.all(
    Array.from(sitesNeedingSpatialData).map(refNo => 
      fetchSite(refNo, false, true, false)
    )
  );

  // Update the matching allocations with spatial data
  const sitesMap = new Map(sitesWithSpatialData.map(s => [s.referenceNumber, s]));
  
  for (const alloc of matchingAllocations) {
    const site = sitesMap.get(alloc.srn);
    if (site && site.allocations) {
      const matchingAlloc = site.allocations.find(
        a => slugify(a.planningReference) === slugifiedRef
      );
      if (matchingAlloc) {
        alloc.sr = matchingAlloc.sr;
        alloc.imd = matchingAlloc.lsoa?.IMDDecile || 'N/A';
        alloc.imdS = matchingAlloc.lsoa?.IMDScore || 'N/A';
      }
    }
  }
  
  return matchingAllocations;
}

/**
 * Fetch all unique LPA/planning reference combinations for static params.
 * Used for ISR page generation.
 */
async function fetchAllAllocationsForStaticParams() {
  const allSites = await fetchAllSites(false, false, false);
  
  const allocationPaths = [];
  const seen = new Set();
  
  for (const site of allSites) {
    if (!site.allocations) continue;
    
    for (const alloc of site.allocations) {
      const lpaSlug = slugify(alloc.localPlanningAuthority);
      const refSlug = slugify(alloc.planningReference);
      const key = `${lpaSlug}/${refSlug}`;
      
      // Avoid duplicates
      if (!seen.has(key)) {
        seen.add(key);
        allocationPaths.push({
          lpa: lpaSlug,
          planningRef: refSlug
        });
      }
    }
  }
  
  return allocationPaths;
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
  const slugifiedLpa = slugify(lpa);
  const slugifiedRef = slugify(planningRef);

  // First, fetch all sites WITHOUT spatial data to find matches
  const allSites = await fetchAllSites(false, false, false);
  
  // Find matching allocations and track which sites need spatial data
  const matchingAllocations = [];
  const siteRefNumbers = new Set();
  
  for (const site of allSites) {
    if (!site.allocations) continue;
    
    for (const alloc of site.allocations) {
      const allocLpaSlug = slugify(alloc.localPlanningAuthority);
      const allocRefSlug = slugify(alloc.planningReference);
      
      if (allocLpaSlug === slugifiedLpa && allocRefSlug === slugifiedRef) {
        matchingAllocations.push(transformAllocation(alloc, site));
        siteRefNumbers.add(site.referenceNumber);
      }
    }
  }

  if (matchingAllocations.length === 0) {
    return { allocations: [], sites: [], selectedSite: null };
  }

  // Fetch full site data with spatial data AND names for the matching sites
  const sitesWithSpatialData = await Promise.all(
    Array.from(siteRefNumbers).map(refNo => 
      fetchSite(refNo, false, true, true)  // withNames=true
    )
  );

  // Filter out any failed fetches
  const validSites = sitesWithSpatialData.filter(s => s !== null);

  // Create a map for quick lookup
  const sitesMap = new Map(validSites.map(s => [s.referenceNumber, s]));

  // Build raw allocations for map display (with coords, distance, etc.)
  const rawAllocationsForMap = [];

  // Update allocations with spatial data
  for (const alloc of matchingAllocations) {
    const site = sitesMap.get(alloc.srn);
    if (site && site.allocations) {
      const matchingAlloc = site.allocations.find(
        a => slugify(a.planningReference) === slugifiedRef
      );
      if (matchingAlloc) {
        alloc.sr = matchingAlloc.sr;
        alloc.imd = matchingAlloc.lsoa?.IMDDecile || 'N/A';
        alloc.imdS = matchingAlloc.lsoa?.IMDScore || 'N/A';
        
        // Add raw allocation for map
        rawAllocationsForMap.push({
          ...matchingAlloc,
          // Include site reference for mapping
          siteReferenceNumber: site.referenceNumber,
          siteName: site.name,
          sitePosition: site.position
        });
      }
    }
  }

  // Process sites for list view (reduced payload for map markers), now with names
  const processedSites = validSites.map(s => processSiteForListView(s));
  
  // Get the first site with allocations as selectedSite (full data for map markers)
  const selectedSite = validSites[0] || null;

  return { 
    allocations: matchingAllocations, 
    sites: processedSites,
    selectedSite,
    allocationsForMap: rawAllocationsForMap
  };
}

export { fetchAllSites, queryBGSAPI, fetchSite, fetchAllRefNos, fetchAllocationByLPAAndRef, fetchAllAllocationsForStaticParams, transformAllocations, fetchAllocationWithSiteData };
