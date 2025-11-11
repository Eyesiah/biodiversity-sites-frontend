import { fetchAllSites } from '@/lib/api';
import SearchableHabitatLists from './SearchableHabitatLists';
import Footer from '@/components/core/Footer';
import { collateAllHabitats } from '@/lib/habitat';
import { processSitesForListView} from '@/lib/sites';

import {ISR_REVALIDATE_TIME} from '@/config'
export const revalidate = ISR_REVALIDATE_TIME;


export const metadata = {
  title: 'BGS Habitat Finder',
  description: 'Use this page to find available habitats. Click on a habitat to see all the sites that offer that habitat, including how much has already been allocated.'
};


export default async function HabitatSummaryPage() {
  const lastUpdated = Date.now();
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
      if (site.habitats.areas) {
        processHabitats(site.habitats.areas, site, false, allHabitats.areas);
      }
      if (site.habitats.hedgerows) {
        processHabitats(site.habitats.hedgerows, site, false, allHabitats.hedgerows);
      }
      if (site.habitats.watercourses) {
        processHabitats(site.habitats.watercourses, site, false, allHabitats.watercourses);
      }
    }
    if (site.improvements) {
      if (site.improvements.areas) {
        processHabitats(site.improvements.areas, site, true, allImprovements.areas);
      }
      if (site.improvements.hedgerows) {
        processHabitats(site.improvements.hedgerows, site, true, allImprovements.hedgerows);
      }
      if (site.improvements.watercourses) {
        processHabitats(site.improvements.watercourses, site, true, allImprovements.watercourses);
      }
    }
  });

  const collatedHabitats = collateAllHabitats(allHabitats, false);
  const collatedImprovements = collateAllHabitats(allImprovements, true);

  const baselineHabitats = Object.values(collatedHabitats).flat().map(h => ({ ...h, isImprovement: false }));
  const improvementHabitats = Object.values(collatedImprovements).flat().map(h => ({ ...h, isImprovement: true }));
  const habitats = [...baselineHabitats, ...improvementHabitats];

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