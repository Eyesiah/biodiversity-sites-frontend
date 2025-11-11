import { fetchAllSites } from '@/lib/api';
import { getHabitatDistinctiveness } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import HabitatAnalysisContent from './HabitatAnalysisContent'
import { slugify } from '@/lib/format'

export const metadata = {
  title: 'BGS Habitat Analysis',
  description: 'View which baseline habitats exist in the register, which will be improved and which have been allocated.'
};

import {ISR_REVALIDATE_TIME} from '@/config'
export const revalidate = ISR_REVALIDATE_TIME;

export default async function HabitatAnalysis() {
  const allSites = await fetchAllSites();

  const analysis = {
  };

  // Helper to initialize a habitat entry
  const initHabitat = (habitatName, module) => ({
    habitat: habitatName,
    distinctiveness: getHabitatDistinctiveness(habitatName),
    baseline: 0,
    baselineParcels: 0,
    improvementSites: new Set(),
    improvement: 0,
    improvementParcels: 0,
    allocation: 0,
    allocationParcels: 0,
    module: module
  });

  // Process each site
  allSites.forEach(site => {

    const processCategory = (module) => {
      // Baseline
      if (site.habitats && site.habitats[module]) {
        site.habitats[module].forEach(h => {
          const habitatKey = `${module}_${slugify(h.type)}`;
          if (!analysis[habitatKey]) {
            analysis[habitatKey] = initHabitat(h.type, module);
          }
          analysis[habitatKey].baseline += h.size;
          analysis[habitatKey].baselineParcels += 1;
        });
      }

      // Improvements
      if (site.improvements && site.improvements[module]) {
        site.improvements[module].forEach(h => {
          const habitatKey = `${module}_${slugify(h.type)}`;
          if (!analysis[habitatKey]) {
            analysis[habitatKey] = initHabitat(h.type, module);
          }
          analysis[habitatKey].improvement += h.size;
          analysis[habitatKey].improvementParcels += 1;
          analysis[habitatKey].improvementSites.add(site.referenceNumber);
        });
      }

      // Allocations
      if (site.allocations) {
        site.allocations.forEach(alloc => {
          if (alloc.habitats && alloc.habitats[module]) {
            alloc.habitats[module].forEach(h => {
              const habitatKey = `${module}_${slugify(h.type)}`;
              if (!analysis[habitatKey]) {
                analysis[habitatKey] = initHabitat(h.type, module);
              }
              analysis[habitatKey].allocation += h.size;
              analysis[habitatKey].allocationParcels += 1;
            });
          }
        });
      }
    };

    processCategory('areas');
    processCategory('hedgerows');
    processCategory('watercourses');
  });

  const lastUpdated = Date.now();

  const processedData = Object.values(analysis).map(h => {
    return {
      ...h,
      improvementSites: h.improvementSites.size,
    };
  });

  return (
    <>
      <HabitatAnalysisContent habitats={processedData} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}