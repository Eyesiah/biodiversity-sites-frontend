import { fetchAllSites } from '@/lib/api';
import AllAllocationsList from './AllAllocationsList';
import Footer from '@/components/Footer';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export const metadata = {
  title: 'BGS allocations',
  description: 'Every allocation in the register is listed here. Select a row for more detail about which habitats have been allocated.'
};

export default async function AllocationsPage() {

  const allSites = await fetchAllSites(true, true);
  
  const allocationPromises = allSites.flatMap(site => {
    if (!site.allocations) return [];
    return site.allocations.map(async (alloc) => {

      return {
        pr: alloc.planningReference,
        lpa: alloc.localPlanningAuthority,
        nca: alloc.nca,
        pn: alloc.projectName,
        au: alloc.areaUnits,
        hu: alloc.hedgerowUnits,
        wu: alloc.watercoursesUnits,
        srn: site.referenceNumber,
        d: alloc.distance,
        sr: alloc.sr,
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
        <AllAllocationsList allocations={allocations}/>
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
