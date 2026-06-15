import { unstable_cache } from 'next/cache';
import Papa from 'papaparse';
import clientPromise from '@/lib/mongodb.js';
import { MONGODB_DATABASE_NAME } from '@/config';

const NSIP_GEOJSON_URL = 'https://files.planning.data.gov.uk/dataset/infrastructure-project.geojson';
const NSIP_REGISTER_CSV_URL = 'https://national-infrastructure-consenting.planninginspectorate.gov.uk/api/applications-download';
const NSIP_DEVELOPERS_URLS = [
  'https://services6.arcgis.com/LBG1Lnci7jBl9O0t/arcgis/rest/services/SENP_NRN_NSIPs/FeatureServer/0/query?where=1=1&outFields=prjref,Developer&returnGeometry=false&f=json',
  'https://services6.arcgis.com/LBG1Lnci7jBl9O0t/arcgis/rest/services/SENP_NRN_NSIPs/FeatureServer/1/query?where=1=1&outFields=prjref,Developer&returnGeometry=false&f=json',
];

export * from '@/lib/nsip-data';

// Fetches a resource from source and writes it into the nsip-cache collection, regardless of
// any existing cached value (used both for cache misses and forced refreshes).
async function fetchFresh(cacheId, url, responseType = 'json') {
  const client = clientPromise ? await clientPromise : null;
  const cache = client?.db(MONGODB_DATABASE_NAME).collection('nsip-cache');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'BristolTrees BGS Register/1.0 (https://bgs.bristoltrees.space/)' },
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}, status: ${response.status}`);
  }

  const data = responseType === 'text' ? await response.text() : await response.json();

  if (cache) {
    await cache.updateOne(
      { _id: cacheId },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  return data;
}

// Fetches a resource, using MongoDB as a write-through cache (same pattern as the BGS register cache).
async function fetchWithMongoCache(cacheId, url, responseType = 'json') {
  const client = clientPromise ? await clientPromise : null;
  const cache = client?.db(MONGODB_DATABASE_NAME).collection('nsip-cache');

  if (cache) {
    const cacheRecord = await cache.findOne({ _id: cacheId });
    if (cacheRecord && cacheRecord.data) {
      return cacheRecord.data;
    }
  }

  return fetchFresh(cacheId, url, responseType);
}

// Fetch the Nationally Significant Infrastructure Projects geojson dataset.
export const fetchNSIPGeoJson = unstable_cache(
  () => fetchWithMongoCache('infrastructure-project', NSIP_GEOJSON_URL),
  ['nsip-geojson'],
  { revalidate: 43200 }
);

// Fetch and parse the Planning Inspectorate's register of applications CSV, dropping any rows
// that aren't real project entries (e.g. trailing footer/notes rows with no project reference).
export const fetchNSIPRegisterRows = unstable_cache(
  async () => {
    const csv = await fetchWithMongoCache('infrastructure-project-register', NSIP_REGISTER_CSV_URL, 'text');
    const { data: rows } = Papa.parse(csv, { header: true, skipEmptyLines: true });
    return rows.filter(row => row['Project reference']?.trim() && row['GPS co-ordinates']?.trim());
  },
  ['nsip-register-rows'],
  { revalidate: 43200 }
);

// Fetch developer/applicant names for NSIPs, primarily from the Planning Inspectorate's register of
// applications, falling back to the SDNPA ArcGIS layers (points and polygons) for any gaps.
// Returned as a map of project reference -> developer name.
export const fetchNSIPDevelopers = unstable_cache(
  async () => {
    const developers = {};

    const rows = await fetchNSIPRegisterRows();
    rows.forEach(row => {
      const reference = row['Project reference']?.trim();
      const applicant = row['Applicant name']?.trim();
      if (reference && applicant && !developers[reference]) {
        developers[reference] = applicant;
      }
    });

    for (const [index, url] of NSIP_DEVELOPERS_URLS.entries()) {
      const data = await fetchWithMongoCache(`infrastructure-project-developers-${index}`, url);
      (data.features || []).forEach(({ attributes }) => {
        if (attributes.prjref && attributes.Developer && !developers[attributes.prjref]) {
          developers[attributes.prjref] = attributes.Developer;
        }
      });
    }

    return developers;
  },
  ['nsip-developers'],
  { revalidate: 43200 }
);

// Forces a refresh of all NSIP data sources in the nsip-cache collection, bypassing the
// cache-hit short-circuit in fetchWithMongoCache. Intended for use by the scheduled cron job,
// since fetchWithMongoCache otherwise never re-fetches once a cache document exists.
export async function refreshNSIPCache() {
  await fetchFresh('infrastructure-project', NSIP_GEOJSON_URL);
  await fetchFresh('infrastructure-project-register', NSIP_REGISTER_CSV_URL, 'text');

  for (const [index, url] of NSIP_DEVELOPERS_URLS.entries()) {
    await fetchFresh(`infrastructure-project-developers-${index}`, url);
  }
}
