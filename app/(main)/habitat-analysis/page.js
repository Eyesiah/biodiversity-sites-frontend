import { fetchAllSites } from '@/lib/api';
import { getHabitatDistinctiveness } from '@/lib/habitat';
import styles from '@/styles/SiteDetails.module.css';
import Footer from '@/components/Footer';
import HabitatAnalysisContent from './HabitatAnalysisContent'

export const metadata = {
  title: 'BGS habitat analysis',
};

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export default async function HabitatAnalysis() {
  const allSites = await fetchAllSites();

  const analysis = {
    areas: {},
    hedgerows: {},
    watercourses: {},
  };

  // Helper to initialize a habitat entry
  const initHabitat = (habitatName) => ({
    habitat: habitatName,
    distinctiveness: getHabitatDistinctiveness(habitatName),
    baseline: 0,
    baselineParcels: 0,
    improvementSites: new Set(),
    improvement: 0,
    improvementParcels: 0,
    allocation: 0,
    allocationParcels: 0,
  });

  // Process each site
  allSites.forEach(site => {

    const processCategory = (category) => {
      // Baseline
      if (site.habitats && site.habitats[category]) {
        site.habitats[category].forEach(h => {
          const habitatName = h.type;
          if (!analysis[category][habitatName]) {
            analysis[category][habitatName] = initHabitat(habitatName);
          }
          analysis[category][habitatName].baseline += h.size;
          analysis[category][habitatName].baselineParcels += 1;
        });
      }

      // Improvements
      if (site.improvements && site.improvements[category]) {
        site.improvements[category].forEach(h => {
          const habitatName = h.type;
          if (!analysis[category][habitatName]) {
            analysis[category][habitatName] = initHabitat(habitatName);
          }
          analysis[category][habitatName].improvement += h.size;
          analysis[category][habitatName].improvementParcels += 1;
          analysis[category][habitatName].improvementSites.add(site.referenceNumber);
        });
      }

      // Allocations
      if (site.allocations) {
        site.allocations.forEach(alloc => {
          if (alloc.habitats && alloc.habitats[category]) {
            alloc.habitats[category].forEach(h => {
              const habitatName = h.type;
              if (!analysis[category][habitatName]) {
                analysis[category][habitatName] = initHabitat(habitatName);
              }
              analysis[category][habitatName].allocation += h.size;
              analysis[category][habitatName].allocationParcels += 1;
            });
          }
        });
      }
    };

    processCategory('areas');
    processCategory('hedgerows');
    processCategory('watercourses');
  });

  // Convert sets to counts and calculate totals
  const finalizeData = (category) => {
    let totalBaseline = 0;
    let totalImprovement = 0;
    let totalAllocation = 0;
    let totalBaselineParcels = 0;
    let totalImprovementParcels = 0;
    let totalAllocationParcels = 0;

    const processedData = Object.values(analysis[category]).map(h => {
      totalBaseline += h.baseline;
      totalImprovement += h.improvement;
      totalAllocation += h.allocation;
      totalBaselineParcels += h.baselineParcels;
      totalImprovementParcels += h.improvementParcels;
      totalAllocationParcels += h.allocationParcels;
      return {
        ...h,
        improvementSites: h.improvementSites.size,
      };
    });

    // Calculate percentages
    const totalImprovementSites = processedData.reduce((acc, h) => acc + h.improvementSites, 0);

    processedData.forEach(h => {
      h.baselineShare = totalBaseline > 0 ? (h.baseline / totalBaseline) * 100 : 0;
      h.improvementShare = totalImprovement > 0 ? (h.improvement / totalImprovement) * 100 : 0;
      h.allocationShare = totalAllocation > 0 ? (h.allocation / totalAllocation) * 100 : 0;
      h.improvementAllocation = h.improvement > 0 ? (h.allocation / h.improvement) * 100 : 0;
    });

    return {
      rows: processedData.sort((a, b) => a.habitat.localeCompare(b.habitat)),
      totals: {
        baseline: totalBaseline,
        improvement: totalImprovement,
        allocation: totalAllocation,
        improvementParcels: totalImprovementParcels,
        baselineParcels: totalBaselineParcels,
        allocationParcels: totalAllocationParcels,
        improvementSites: totalImprovementSites,
        improvementAllocation: totalImprovement > 0 ? (totalAllocation / totalImprovement) * 100 : 0,
      },
    };
  };

  const areaAnalysis = finalizeData('areas');
  const hedgerowAnalysis = finalizeData('hedgerows');
  const watercourseAnalysis = finalizeData('watercourses');
  const lastUpdated = Date.now();
  
  return (
    <>
      <div className={styles.container}>
        <HabitatAnalysisContent areaAnalysis={areaAnalysis} hedgerowAnalysis={hedgerowAnalysis} watercourseAnalysis={watercourseAnalysis}/>        
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}