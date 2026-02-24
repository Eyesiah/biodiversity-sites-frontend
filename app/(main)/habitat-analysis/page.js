import { fetchAllSites } from '@/lib/api';
import { getHabitatDistinctiveness } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import HabitatAnalysisContent from './HabitatAnalysisContent'
import { slugify } from '@/lib/format'
import { HABITAT_UNIT_TYPES } from '@/config'

export const metadata = {
  title: 'BGS Habitat Analysis',
  description: 'View which baseline habitats exist in the register, which will be improved and which have been allocated.',
  keywords: ['habitat analysis', 'baseline habitat', 'improved habitat', 'habitat distinctiveness', 'BGS habitat analysis', 'biodiversity habitat types', 'habitat condition'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/habitat-analysis',
  },
};

export const revalidate = 86400; // 24 hours

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

    
    for (const unit of HABITAT_UNIT_TYPES) {
      processCategory(unit);
    }
  });

  // Calculate totals per module for percentage calculations
  const moduleTotals = {};

  // Process each site to calculate totals
  allSites.forEach(site => {

    const calculateTotals = (module) => {
      if (!moduleTotals[module]) {
        moduleTotals[module] = {
          totalBaseline: 0,
          totalImprovement: 0,
          totalAllocation: 0,
        };
      }

      // Baseline
      if (site.habitats && site.habitats[module]) {
        site.habitats[module].forEach(h => {
          moduleTotals[module].totalBaseline += h.size;
        });
      }

      // Improvements
      if (site.improvements && site.improvements[module]) {
        site.improvements[module].forEach(h => {
          moduleTotals[module].totalImprovement += h.size;
        });
      }

      // Allocations
      if (site.allocations) {
        site.allocations.forEach(alloc => {
          if (alloc.habitats && alloc.habitats[module]) {
            alloc.habitats[module].forEach(h => {
              moduleTotals[module].totalAllocation += h.size;
            });
          }
        });
      }
    };

    for (const unit of HABITAT_UNIT_TYPES) {
      calculateTotals(unit);
    }
  });

  const lastUpdated = Date.now();

  // Process data with pre-calculated percentages
  const processedData = Object.values(analysis).map(h => {
    const totals = moduleTotals[h.module];
    return {
      ...h,
      improvementSites: h.improvementSites.size,
      baselineShare: totals.totalBaseline > 0 ? (h.baseline / totals.totalBaseline) * 100 : 0,
      improvementShare: totals.totalImprovement > 0 ? (h.improvement / totals.totalImprovement) * 100 : 0,
      allocationShare: totals.totalAllocation > 0 ? (h.allocation / totals.totalAllocation) * 100 : 0,
      improvementAllocation: h.improvement > 0 ? (h.allocation / h.improvement) * 100 : 0,
    };
  });

  return (
    <>
      <HabitatAnalysisContent habitats={processedData} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
