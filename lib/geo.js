import clientPromise from '@/lib/mongodb.js';
import { getLSOAInfo } from '@/lib/LSOA'
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL, ARCGIS_LSOA_NAME_FIELD, MONGODB_DATABASE_NAME } from '@/config'

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param {number | null | undefined} lat1 Latitude of the first point.
 * @param {number | null | undefined} lon1 Longitude of the first point.
 * @param {number | null | undefined} lat2 Latitude of the second point.
 * @param {number | null | undefined} lon2 Longitude of the second point.
 * @returns {number | null} The distance in kilometers, or null if coordinates are missing.
 */
export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Geocodes an address string to latitude and longitude.
 * This function uses the Google Maps Geocoding API.
 * @param {string} address The address to geocode.
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function getCoordinatesForAddress(address, lpaName = null) {
  if (!address) return null;

  const cacheKey = { address: address };

  // 1. Check cache first
  if (clientPromise) {
    try {
      const client = await clientPromise;
      const db = client.db(MONGODB_DATABASE_NAME);
      const cache = db.collection('geoCache');
      const cachedResult = await cache.findOne(cacheKey);
      if (cachedResult) {
        return cachedResult.coords;
      }
    } catch (e) {
      console.error('Error reading from geoCache:', e);
      // If cache read fails, proceed to geocode without failing the request.
    }
  }

  // 2. If not in cache, geocode via API
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY is not set. Geocoding will be skipped.');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
      { next: { revalidate: 86400 } } // Revalidate the data at most once per day.
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {

      // filter England locations only
      const validLocations = data.results.filter(r => r.address_components.find(c => c.types.includes('administrative_area_level_1'))?.short_name == "England");      

      if (validLocations.length > 0) {
        const location = data.results[0].geometry.location;
        const coords = { latitude: location.lat, longitude: location.lng };

        // 3. Store in cache for next time
        if (clientPromise) {
          try {
            const client = await clientPromise;
            const db = client.db(MONGODB_DATABASE_NAME);
            const cache = db.collection('geoCache');
            await cache.updateOne(
              cacheKey,
              { $set: { coords: coords, updatedAt: new Date() } },
              { upsert: true }
            );
          } catch (e) {
            console.error('Error writing to geoCache:', e);
            // Don't fail if caching fails.
          }
        }
        return coords;
      }
    }
    // Return null if geocoding was not successful - the caller of this function should handle this case.
    return null;
  } catch (error) {
    console.error(`Error during geocoding for address "${address}":`, error);
    return null;
  }
}

/**
 * Gets the centroid coordinates for a Local Planning Authority (LPA).
 * This function uses the Google Maps Geocoding API.
 * @param {string} lpaName The name of the LPA.
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function getCoordinatesForLPA(lpaName) {
  if (!lpaName) return null;
  const coords = await getCoordinatesForAddress(`${lpaName.replace(' LPA', '')}, UK`);

  if (!coords) {
    console.warn(`Could not resolve coordinates for LPA: "${lpaName}"`);
  }

  return coords;
}

export const fetchSiteSpatialData = async (site) => {
  
  const cacheKey = { id: site.referenceNumber };

  // 1. Check cache first
  if (clientPromise) {
    try {
      const client = await clientPromise;
      const db = client.db(MONGODB_DATABASE_NAME);
      const cache = db.collection('siteGeoCache');
      const cachedResult = await cache.findOne(cacheKey);
      if (cachedResult) {
        site.lnrsName = cachedResult.lnrsName;
        site.ncaName = cachedResult.ncaName;
        site.lpaName = cachedResult.lpaName;

        const lsoaName = cachedResult.lsoaName;
        const lsoaInfo = getLSOAInfo(lsoaName);
        site.lsoa = {
          name: lsoaName,
          ...lsoaInfo
        }
        return;
      }
    } catch (e) {
      console.error('Error reading from siteGeoCache:', e);
      // If cache read fails, proceed to geocode without failing the request.
    }
  }

  if (!site.latitude || !site.longitude) {
    return;
  }

  const point = `geometry=${site.longitude},${site.latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;

  const lsoaUrl = `${ARCGIS_LSOA_URL}?${point}&outFields=${ARCGIS_LSOA_NAME_FIELD}`;
  const lnrsUrl = `${ARCGIS_LNRS_URL}?${point}&outFields=Name`;
  const ncaUrl = `${ARCGIS_NCA_URL}?${point}&outFields=NCA_Name`;
  const lpaUrl = `${ARCGIS_LPA_URL}?${point}&outFields=LPA23NM`;

  try {
    const [lsoaRes, lnrsRes, ncaRes, lpaRes] = await Promise.all([
      fetch(lsoaUrl, {next: { revalidate: 21600 } }),
      fetch(lnrsUrl, {next: { revalidate: 21600 } }),
      fetch(ncaUrl, {next: { revalidate: 21600 } }),
      fetch(lpaUrl, {next: { revalidate: 21600 } }),

    ]);

    const [lsoaData, lnrsData, ncaData, lpaData] = await Promise.all([
      lsoaRes.json(),
      lnrsRes.json(),
      ncaRes.json(),
      lpaRes.json(),
    ]);

    const lsoaName = lsoaData.features?.[0]?.attributes?.[ARCGIS_LSOA_NAME_FIELD].trim() || 'N/A';
    site.lnrsName = lnrsData.features?.[0]?.attributes?.Name.trim() || 'N/A';
    site.ncaName = ncaData.features?.[0]?.attributes?.NCA_Name.trim() || 'N/A';
    site.lpaName = lpaData.features?.[0]?.attributes?.LPA23NM.trim() || 'N/A';

    // handle the LPA query returning bad apostrophes
    if (site.lpaName.includes('King0s')) {
      site.lpaName = site.lpaName.replace('King0s', "King's");
    }

    const lsoaInfo = getLSOAInfo(lsoaName);
    site.lsoa = {
      name: lsoaName,
      ...lsoaInfo
    }

    // 3. Store in cache for next time
    if (clientPromise) {
      try {
        const client = await clientPromise;
        const db = client.db(MONGODB_DATABASE_NAME);
        const cache = db.collection('siteGeoCache');
        await cache.updateOne(
          cacheKey,
          { $set: {
            lnrsName: site.lnrsName,
            ncaName: site.ncaName,
            lpaName: site.lpaName,
            lsoaName: lsoaName,
            updatedAt: new Date()
          } },
          { upsert: true }
        );
      } catch (e) {
        console.error('Error writing to siteGeoCache:', e);
        // Don't fail if caching fails.
      }
    }
    

  } catch (error) {
    console.error(`Failed to fetch spatial data for site ${site.referenceNumber}`, error);
  }
};

export const fetchAllocSpatialData = async (alloc, site) => {

  // find coords for alloc based on address (aka projectName)
  alloc.coords = null;
  if (alloc.projectName) {    
    // remove these common prefixes that confuse the google geocoder
    const sanitizedAddress = alloc.projectName.toLowerCase()
      .replace(/\b(?:land (?:south|east|north|west) of|land adjacent(?: to)?|land to the (?:side|rear) (?: of)?|land between)\b\s*/g, '');

    // Combine address and LPA for a more specific query (but without the "LPA" suffix as that confuses google)    
    const fullAddress = `${sanitizedAddress}, ${alloc.localPlanningAuthority.replace(' LPA', '')}`;
    alloc.coords = await getCoordinatesForAddress(fullAddress);
  }
  if (!alloc.coords && alloc.localPlanningAuthority) {
    // fall back to LPA if that failed
    alloc.coords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
  }

  // calc distance from alloc to site
  alloc.distance = 'unknown';
  if (site && site.latitude && site.longitude) {
    if (alloc.coords) {
      // use coords
      alloc.distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, alloc.coords.latitude, alloc.coords.longitude);
    }
    
    // if distance failed or is longer than the length of England, use the LPA coords instead
    const maxDistEngland = 688;
    if ((alloc.distance > maxDistEngland || alloc.distance === 'unknown') && alloc.localPlanningAuthority) {
      alloc.coords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
      if (alloc.coords) {
        alloc.distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, alloc.coords.latitude, alloc.coords.longitude);
      }
    }    
  }

  if (alloc.coords) {
    // get the LSOA      
    const cacheKey = { allocID: alloc.developerReference ?? alloc.planningReference };
      
    // Check cache first
    if (clientPromise) {
      try {
        const client = await clientPromise;
        const db = client.db(MONGODB_DATABASE_NAME);
        const cache = db.collection('allocGeoCache');
        const cachedResult = await cache.findOne(cacheKey);
        if (cachedResult) {
          const lsoaName = cachedResult.lsoaName;
          const lsoaInfo = getLSOAInfo(lsoaName);
          alloc.lsoa = {
            name: lsoaName,
            ...lsoaInfo
          }
          alloc.nca = cachedResult.nca;
        }
      } catch (e) {
        console.error('Error reading from siteGeoCache:', e);
        // If cache read fails, proceed to geocode without failing the request.
      }
    }

    // query arcgis if not in our cache
    if (alloc.lsoa == null) {
      const point = `geometry=${alloc.coords.longitude},${alloc.coords.latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;
      const lsoaUrl = `${ARCGIS_LSOA_URL}?${point}&outFields=${ARCGIS_LSOA_NAME_FIELD}`;
      const ncaUrl = `${ARCGIS_NCA_URL}?${point}&outFields=NCA_Name`;

      try {
        const [lsoaRes, ncaRes] = await Promise.all([
          fetch(lsoaUrl, {next: { revalidate: 21600 } }),
          fetch(ncaUrl, {next: { revalidate: 21600 } }),

        ]);

        const [lsoaData, ncaData] = await Promise.all([
          lsoaRes.json(),
          ncaRes.json(),
        ]);

        const lsoaName = lsoaData.features?.[0]?.attributes?.[ARCGIS_LSOA_NAME_FIELD].trim() || 'N/A';
        alloc.nca = ncaData.features?.[0]?.attributes?.NCA_Name.trim() || 'N/A';

        const lsoaInfo = getLSOAInfo(lsoaName);
        alloc.lsoa = {
          name: lsoaName,
          ...lsoaInfo
        }
      }
      catch (error) {
        console.error(`Failed to fetch lsoa data for alloc ${alloc.planningReference}`, error);
      }
        
      // 3. Store in cache for next time
      if (clientPromise && alloc.lsoa) {
        try {
          const client = await clientPromise;
          const db = client.db(MONGODB_DATABASE_NAME);
          const cache = db.collection('allocGeoCache');
          await cache.updateOne(
            cacheKey,
            { $set: {
              lsoaName: alloc.lsoa.name,
              nca: alloc.nca,
              updatedAt: new Date()
            } },
            { upsert: true }
          );
        } catch (e) {
          console.error('Error writing to allocGeoCache:', e);
          // Don't fail if caching fails.
        }
      }
    }
  }
}