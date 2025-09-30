import fs from 'fs';
import path from 'path';
import { fetchAllSites } from '@/lib/api';
import Footer from '@/components/Footer';
import LPAContent from './LPAContent'

export const metadata = {
  title: 'Local Planning Authorities',
};

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export default async function LocalPlanningAuthoritiesPage() {
  const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const rawLpas = JSON.parse(jsonData);

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

  const lpas = rawLpas
      // Only include English LPAs
      .filter((lpa) => lpa.id && lpa.id.startsWith('E'))
      .map((lpa) => ({
          id: lpa.id,
          name: lpa.name,
          adjacents: lpa.adjacents || [],
          size: lpa.size / 10000,
          adjacentsCount: lpa.adjacents ? lpa.adjacents.length : 0,
          siteCount: siteCounts[lpa.name] || 0,
          allocationsCount: allocationCounts[lpa.name] || 0,
  })).sort((a, b) => a.name.localeCompare(b.name));

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
      <div className="container">
        <LPAContent lpas={lpas} sites={sites}  />
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}