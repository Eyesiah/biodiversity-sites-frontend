import { fetchAllSites } from '@/lib/api';
import Footer from '@/components/Footer';
import LPAContent from './LPAContent'
import { getLPAData } from '@/lib/habitat';

export const metadata = {
  title: 'Local Planning Authorities',
  description: 'View all the LPA bodies and which sites are present in each one. Click on any record for a dropdown of adjacent LPAs.'
};

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export default async function LocalPlanningAuthoritiesPage() {

  const allSites = await fetchAllSites(true);
  const allocationCounts = {};
  const siteCounts = {};

  allSites.forEach(site => {
      if (site.allocations) {
          site.allocations.forEach(alloc => {
              const lpaName = alloc.localPlanningAuthority;
              allocationCounts[lpaName] = (allocationCounts[lpaName] || 0) + 1;
          });
      }
      if (site.lpaName) {
          const lpaName = site.lpaName;
          siteCounts[lpaName] = (siteCounts[lpaName] || 0) + 1;
      }
  });

  let lpas = Array.from(getLPAData().values());
  lpas.forEach(lpa => {
    lpa.siteCount = siteCounts[lpa.name] || 0;
    lpa.allocationsCount = allocationCounts[lpa.name] || 0;
  });

  const sites = allSites.map(s => ({
    referenceNumber: s.referenceNumber,
    lpaName: s.lpaName || null,
    position: [s.latitude, s.longitude],
    responsibleBodies: s.responsibleBodies || [],
    ncaName: s.ncaName || null,
    siteSize: s.siteSize || 0,
    lnrsName: s.lnrsName || null
  }));
      
  const lastUpdated = Date.now();
  
  return (
    <>
      <LPAContent lpas={lpas} sites={sites}  />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}