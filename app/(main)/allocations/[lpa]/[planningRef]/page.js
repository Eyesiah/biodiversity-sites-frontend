import { fetchAllocationWithSiteData, fetchAllAllocationsForStaticParams } from '@/lib/api';
import AllocationPageContent from '@/lib/components/AllocationPageContent';
import Footer from '@/components/core/Footer';

export const revalidate = 86400; // 24 hours

export async function generateStaticParams() {
  const allocations = await fetchAllAllocationsForStaticParams();
  return allocations.map((alloc) => ({
    lpa: alloc.lpa,
    planningRef: alloc.planningRef,
  }));
}

export async function generateMetadata({ params }) {
  const { lpa, planningRef } = await params;
  
  // Fetch actual allocation data to get real values for metadata
  const decodedLpa = lpa.replace(/-/g, ' ');
  const decodedRef = planningRef.replace(/-/g, ' ');
  const { allocations } = await fetchAllocationWithSiteData(decodedLpa, decodedRef);
  
  const firstAlloc = allocations[0];
  const actualLpa = firstAlloc?.lpa || decodedLpa;
  const actualRef = firstAlloc?.pr || decodedRef;

  return {
    title: `Allocation: ${actualRef} | ${actualLpa}`,
    description: `Biodiversity allocation details for planning application ${actualRef} by ${actualLpa}.`,
    keywords: ['BGS allocation', 'biodiversity allocation', 'BNG allocation', actualRef, actualLpa],
  };
}

export default async function AllocationPage({ params }) {
  const { lpa, planningRef } = await params;
  
  // Decode the slugified values
  const decodedLpa = lpa.replace(/-/g, ' ');
  const decodedRef = planningRef.replace(/-/g, ' ');

  const { allocations, sites, selectedSite, allocationsForMap } = await fetchAllocationWithSiteData(decodedLpa, decodedRef);
  
  const lastUpdated = Date.now();

  return (
    <>
      <AllocationPageContent 
        allocations={allocations} 
        sites={sites} 
        selectedSite={selectedSite}
        allocationsForMap={allocationsForMap}
      />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
