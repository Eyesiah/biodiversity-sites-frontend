const fs = require('fs');
const path = require('path');
const { fetchAllSites } = require('../lib/api.js');
const { getCoordinatesForAddress, getCoordinatesForLPA, getDistanceFromLatLonInKm } = require('../lib/geo.js');
const clientPromise = require('../lib/mongodb.js').default;

async function fetchAndProcessAllocations() {
  try {
    console.log('Fetching all BGS sites...');
    const allSites = await fetchAllSites();
    console.log(`Found ${allSites.length} sites. Processing allocations...`);

    const allocationPromises = allSites.flatMap(site => {
      if (!site.allocations) return [];
      return site.allocations.map(async (alloc) => {
        let allocCoords = null;

        if (alloc.projectName) {
          allocCoords = await getCoordinatesForAddress(alloc.projectName, alloc.localPlanningAuthority);
        }

        if (!allocCoords && alloc.localPlanningAuthority) {
          allocCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
        }

        let distance = 'unknown';
        if (allocCoords && site.latitude && site.longitude) {
          distance = getDistanceFromLatLonInKm(
            site.latitude,
            site.longitude,
            allocCoords.latitude,
            allocCoords.longitude
          );

          // If distance is > 688km, fall back to LPA centroid
          if (distance > 688 && alloc.localPlanningAuthority) {
            const lpaCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
            if (lpaCoords) {
              distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, lpaCoords.latitude, lpaCoords.longitude);
            }
          }
        }

        return {
          ...alloc,
          siteReferenceNumber: site.referenceNumber,
          distance: distance,
        };
      });
    });

    const allAllocations = await Promise.all(allocationPromises);
    console.log(`Processed ${allAllocations.length} allocations. Writing to MongoDB...`);

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('processedAllocations');

    // Clear the existing collection and insert the new data
    await collection.deleteMany({});
    if (allAllocations.length > 0) {
      await collection.insertMany(allAllocations);
    }

    console.log(`Successfully updated the 'processedAllocations' collection in MongoDB.`);
    await client.close();

  } catch (error) {
    console.error('An error occurred while updating allocations data:', error);
    process.exit(1);
  }
}
fetchAndProcessAllocations();