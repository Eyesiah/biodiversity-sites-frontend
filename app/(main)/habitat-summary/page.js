import { fetchAllSites } from '@/lib/api';
import SearchableHabitatLists from './SearchableHabitatLists';
import Footer from '@/components/core/Footer';
import { collateAllHabitats } from '@/lib/habitat';
import { processSitesForListView } from '@/lib/sites';
import { HABITAT_UNIT_TYPES } from '@/config'

export const revalidate = 21600; // 6 hours


export const metadata = {
  title: 'BGS Habitat Finder',
  description: 'Use this page to find available habitats. Click on a habitat to see all the sites that offer that habitat, including how much has already been allocated.'
};


export default async function HabitatSummaryPage() {
  const lastUpdated = Date.now();
  const allSites = await fetchAllSites({ next: { revalidate: revalidate } });

  const allHabitats = {};
  const allImprovements = {};
  for (const unit of HABITAT_UNIT_TYPES) {
    allHabitats[unit] = []
    allImprovements[unit] = []
  }

  const processHabitats = (habitats, site, isImprovement, target) => {

    habitats.forEach(h => {
      if (isImprovement) {
        h.site = {
          r: site.referenceNumber,
          ta: h.size,
          aa: h.allocatedSize
        }
      } else {
        h.site = {
          r: site.referenceNumber,
          ta: h.size
        }
      }
    });
    target.push(...habitats);
  }

  let totalSize = 0
  allSites.forEach(site => {

    totalSize += site.siteSize;

    if (site.habitats) {
      for (const unit of HABITAT_UNIT_TYPES) {
        if (site.habitats[unit]) {
          processHabitats(site.habitats[unit], site, false, allHabitats[unit]);
        }
      }
    }
    if (site.improvements) {
      for (const unit of HABITAT_UNIT_TYPES) {
        if (site.habitats[unit]) {
          processHabitats(site.improvements[unit], site, true, allImprovements[unit]);
        }
      }
    }
  });

  const collatedHabitats = collateAllHabitats(allHabitats, false);
  const collatedImprovements = collateAllHabitats(allImprovements, true);

  const baselineHabitats = Object.values(collatedHabitats).flat().map(h => ({ ...h, isImprovement: false }));
  const improvementHabitats = Object.values(collatedImprovements).flat().map(h => ({ ...h, isImprovement: true }));
  const habitats = [...baselineHabitats, ...improvementHabitats];

  habitats.forEach(h => delete h.subRows);

  const processedSites = processSitesForListView(allSites);
  const sitesMap = processedSites.reduce((acc, site) => {
    acc[site.referenceNumber] = site;
    return acc;
  }, {});

  return (
    <>
      <SearchableHabitatLists allHabitats={habitats} sites={sitesMap} />
      <Footer lastUpdated={lastUpdated} />
    </>
  )
}