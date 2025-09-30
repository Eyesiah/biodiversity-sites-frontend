import { fetchAllSites } from '@/lib/api';
import AllAllocationsList from './AllAllocationsList';
import Footer from '@/components/Footer';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export const metadata = {
  title: 'All BGS Allocations',
};

export default async function AllocationsPage() {

  const allSites = await fetchAllSites(true, true);
  
  const allocationPromises = allSites.flatMap(site => {
    if (!site.allocations) return [];
    return site.allocations.map(async (alloc) => {
      
      return {
        pr: alloc.planningReference,
        lpa: alloc.localPlanningAuthority,
        pn: alloc.projectName,
        au: alloc.areaUnits,
        hu: alloc.hedgerowUnits,
        wu: alloc.watercoursesUnits,
        srn: site.referenceNumber,
        d: alloc.distance,
        imd: alloc.lsoa?.IMDDecile || 'N/A',
        simd: site.lsoa?.IMDDecile || 'N/A'
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
