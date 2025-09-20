import { fetchAllSites } from '@/lib/api';
import HabitatSummaryClientPage from './HabitatSummaryClientPage';

export const metadata = {
  title: 'Habitat Summary',
};

// This function contains the data fetching logic previously in getStaticProps
async function getSummaryData() {
  // The revalidate option is passed to fetchAllSites, which should pass it to the underlying fetch call.
  // This enables Incremental Static Regeneration (ISR), re-fetching the data at most once per hour.
  const allSites = await fetchAllSites({ next: { revalidate: 3600 } });

  const allHabitats = {
    areas: [],
    hedgerows: [],
    watercourses: []
  }
  const allImprovements = {
    areas: [],
    hedgerows: [],
    watercourses: []
  }

  let totalSize = 0

  allSites.forEach(site => {
    totalSize += site.siteSize;

    if (site.habitats) {
      if (site.habitats.areas) {
        allHabitats.areas.push(...site.habitats.areas);
      }
      if (site.habitats.hedgerows) {
        allHabitats.hedgerows.push(...site.habitats.hedgerows);
      }
      if (site.habitats.watercourses) {
        allHabitats.watercourses.push(...site.habitats.watercourses);
      }
    }
    if (site.improvements) {
      if (site.improvements.areas) {
        allImprovements.areas.push(...site.improvements.areas);
      }
      if (site.improvements.hedgerows) {
        allImprovements.hedgerows.push(...site.improvements.hedgerows);
      }
      if (site.improvements.watercourses) {
        allImprovements.watercourses.push(...site.improvements.watercourses);
      }
    }
  });

  return {
    totalSize: totalSize,
    numSites: allSites.length,
    habitats: allHabitats,
    improvements: allImprovements,
    allocations: allSites.flatMap(s => s.allocations || []),
  };
}


export default function HabitatSummaryPage() {
  //const props = await getSummaryData();

  //return <HabitatSummaryClientPage {...props} />;

  return <div></div>
}