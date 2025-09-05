import clientPromise from './mongodb.js';

const MONGODB_DATABASE_NAME='biodiversity-sites-frontend'

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
 * @param {string | null} [lpaName=null] Optional. The Local Planning Authority name to provide context.
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function getCoordinatesForAddress(address, lpaName = null) {
  if (!address) return null;

  // Combine address and LPA for a more specific query
  const fullAddress = lpaName ? `${address}, ${lpaName}` : address;
  const cacheKey = { address: fullAddress };

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
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`,
      { next: { revalidate: 86400 } } // Revalidate the data at most once per day.
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
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
    // Return null if geocoding was not successful - the caller of this function should handle this case.
    return null;
  } catch (error) {
    console.error(`Error during geocoding for address "${fullAddress}":`, error);
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
  // Appending ", UK" helps Google Maps resolve LPA names more accurately.
  const coords = await getCoordinatesForAddress(lpaName, 'UK');

  if (!coords) {
    console.warn(`Could not resolve coordinates for LPA: "${lpaName}"`);
  }

  return coords;
}
