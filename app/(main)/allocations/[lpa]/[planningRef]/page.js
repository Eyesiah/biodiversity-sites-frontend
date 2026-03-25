import { fetchAllocationWithSiteData, fetchAllAllocationsForStaticParams, getUnslugifiedValues } from '@/lib/api';
import AllocationPageContent from './AllocationPageContent';
import Footer from '@/components/core/Footer';
import fs from 'fs';
import path from 'path';

export const revalidate = 604800; // 7 days

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
    title: `Allocations for Development ${unslugifiedRef} (${unslugifiedLpa})`,
    description: `Biodiversity allocation details for planning application ${unslugifiedRef} in ${unslugifiedLpa}.`,
    keywords: ['BGS allocation', 'biodiversity allocation', 'BNG allocation', unslugifiedRef, unslugifiedLpa],
  };
}

export default async function AllocationPage({ params }) {
  const { lpa, planningRef } = await params;
  
  // Decode the slugified values
  const decodedLpa = lpa.replace(/-/g, ' ');
  const decodedRef = planningRef.replace(/-/g, ' ');

  const { allocations, sites, summary } = await fetchAllocationWithSiteData(decodedLpa, decodedRef);
  
  const lastUpdated = Date.now();

  const lpaJsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const lpaJsonData = fs.readFileSync(lpaJsonPath, 'utf-8');
  const allLpas = JSON.parse(lpaJsonData);
  const matchingLPA = allLpas.find(lpa => lpa.name.toLowerCase() == decodedLpa);
  const portalUrls = matchingLPA?.planningPortalUrls || [];

  return (
    <>
      <AllocationPageContent 
        allocations={allocations} 
        sites={sites} 
        summary={summary}
        portalUrls={portalUrls}
      />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
