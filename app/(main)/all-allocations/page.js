import { fetchAllSites } from '@/lib/api';
import { getCoordinatesForAddress, getCoordinatesForLPA, getDistanceFromLatLonInKm } from '@/lib/geo';
import AllAllocationsList from './AllAllocationsList';
import Footer from '@/components/Footer';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export const metadata = {
  title: 'All BGS Allocations',
};

export default async function AllocationsPage() {

  const allSites = await fetchAllSites();
  
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

        if (distance > 688 && alloc.localPlanningAuthority) {
          const lpaCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
          if (lpaCoords) {
            distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, lpaCoords.latitude, lpaCoords.longitude);
          }
        }
      }

      return {
        pr: alloc.planningReference,
        lpa: alloc.localPlanningAuthority,
        pn: alloc.projectName,
        au: alloc.areaUnits,
        hu: alloc.hedgerowUnits,
        wu: alloc.watercoursesUnits,
        srn: site.referenceNumber,
        d: distance,
      };
    });
  });

  const allocations = await Promise.all(allocationPromises);

  const lastUpdated = Date.now();

  return (
    <>
      <div className="container">
        <h1 className="title">All BGS Allocations</h1>
        <AllAllocationsList allocations={allocations}/>
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
