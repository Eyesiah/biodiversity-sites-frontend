import { fetchAllocationWithSiteData, fetchAllAllocationsForStaticParams, getUnslugifiedValues } from '@/lib/api';
import AllocationPageContent from './AllocationPageContent';
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
  
  // Get unslugified values from cache with fallback
  const { lpa: unslugifiedLpa, planningRef: unslugifiedRef } = 
    await getUnslugifiedValues(lpa, planningRef);
  
  return {
    title: `Allocations: ${unslugifiedRef} | ${unslugifiedLpa}`,
    description: `Biodiversity allocation details for planning application ${unslugifiedRef} by ${unslugifiedLpa}.`,
    keywords: ['BGS allocation', 'biodiversity allocation', 'BNG allocation', unslugifiedRef, unslugifiedLpa],
  };
}

export default async function AllocationPage({ params }) {
  const { lpa, planningRef } = await params;
  
  // Decode the slugified values
  const decodedLpa = lpa.replace(/-/g, ' ');
  const decodedRef = planningRef.replace(/-/g, ' ');

  const { allocations, sites, selectedSite } = await fetchAllocationWithSiteData(decodedLpa, decodedRef);
  
  const lastUpdated = Date.now();

  return (
    <>
      <AllocationPageContent 
        allocations={allocations} 
        sites={sites} 
        selectedSite={selectedSite}
      />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
