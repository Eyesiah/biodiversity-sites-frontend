const fs = require('fs');
const path = require('path');
const { fetchAllSites } = require('../lib/api.js');
const { getCoordinatesForAddress, getCoordinatesForLPA, getDistanceFromLatLonInKm } = require('../lib/geo.js');

const JSON_PATH = path.join(__dirname, '..', 'data', 'allocations.json');

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
        }

        return {
          ...alloc,
          siteReferenceNumber: site.referenceNumber,
          distance: distance,
        };
      });
    });

    const allAllocations = await Promise.all(allocationPromises);
    console.log(`Processed ${allAllocations.length} allocations. Writing to JSON file...`);

    fs.writeFileSync(JSON_PATH, JSON.stringify(allAllocations, null, 2), 'utf-8');
    console.log(`Successfully created ${JSON_PATH}`);

  } catch (error) {
    console.error('An error occurred while updating allocations data:', error);
    process.exit(1);
  }
}

fetchAndProcessAllocations();