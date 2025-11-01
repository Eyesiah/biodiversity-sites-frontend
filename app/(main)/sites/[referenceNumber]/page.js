import { fetchSite, fetchAllSites } from '@/lib/api';
import { collateAllHabitats } from '@/lib/habitat';
import SitePageContent from './SitePageContent'
import Footer from '@/components/core/Footer';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export async function generateStaticParams() {

  const sites = await fetchAllSites();
  const paths = sites.map(site => {
    return { referenceNumber: site.referenceNumber };
  });

  return paths;
}

export async function generateMetadata({ params }) {

  const { referenceNumber } = await params;
  const site = await fetchSite(referenceNumber);

  return {
    title: `Site Details: ${site.referenceNumber}`,
    description: `Details for Biodiversity Gain Site ${site.referenceNumber}`,
  };
}

const getHabitatSankeyData = (site) => {

  const aggregatedLinks = new Map();
  const habitatUnits = ['areas', 'hedgerows', 'watercourses'];
  const data = { nodes: [], links: [] };
  let totalSourceSize = 0;
  let totalImprovementSize = 0;

  for (const unit of habitatUnits) {
    const siteBaselineTotals = new Map();
    const siteImprovementTotals = new Map();
    const sourceNodeTypes = new Set();
    const improvementNodeTypes = new Set();

    // Aggregate baseline sizes for the current site
    if (site.habitats) {
      if (site.habitats[unit]) {
        for (const habitat of site.habitats[unit]) {
          if (habitat.area > 0) {
            totalSourceSize += habitat.area;
            siteBaselineTotals.set(habitat.type, (siteBaselineTotals.get(habitat.type) || 0) + habitat.area);
            sourceNodeTypes.add(habitat.type);
          }
        }
      }
    }

    // Aggregate improvement area for the current site
    if (site.improvements) {
      if (site.improvements[unit]) {
        for (const habitat of site.improvements[unit]) {
          if (habitat.area > 0) {
            totalImprovementSize += habitat.area;
            siteImprovementTotals.set(habitat.type, (siteImprovementTotals.get(habitat.type) || 0) + habitat.area);
            improvementNodeTypes.add(habitat.type);
          }
        }
      }

    }

    // Improved habitat allocation algorithm with proportional scaling
    let baselineTotal = Array.from(siteBaselineTotals.values()).reduce((sum, amount) => sum + amount, 0);
    const improvementTotal = Array.from(siteImprovementTotals.values()).reduce((sum, amount) => sum + amount, 0);

    // Handle creation scenarios (baselineTotal = 0 but improvementTotal > 0)
    if (baselineTotal === 0 && improvementTotal > 0) {
      // Create baseline nodes with same names as improvements but tiny values
      for (const [habitatType, improvementAmount] of siteImprovementTotals.entries()) {
        siteBaselineTotals.set(habitatType, 0.001); // Tiny value to show creation
        sourceNodeTypes.add(habitatType);
      }
      baselineTotal = Array.from(siteBaselineTotals.values()).reduce((sum, amount) => sum + amount, 0);
    }

    // Calculate scaling factor to ensure all improvements get allocated
    const scalingFactor = improvementTotal > 0 ? improvementTotal / baselineTotal : 1;

    // Pass 1: Allocate same-habitat types (maintenance/enhancement)
    const remainingBaseline = new Map(siteBaselineTotals);
    const remainingImprovement = new Map(siteImprovementTotals);

    for (const [habitatType, baselineAmount] of siteBaselineTotals.entries()) {
      if (remainingImprovement.has(habitatType)) {
        const improvementAmount = remainingImprovement.get(habitatType);
        const allocatedAmount = Math.min(baselineAmount, improvementAmount);

        if (allocatedAmount > 0) {
          const scaledAmount = allocatedAmount * scalingFactor;
          const linkKey = `${unit}|${habitatType}|${habitatType}`;
          aggregatedLinks.set(linkKey, (aggregatedLinks.get(linkKey) || 0) + scaledAmount);

          // Reduce remaining amounts
          remainingBaseline.set(habitatType, baselineAmount - allocatedAmount);
          remainingImprovement.set(habitatType, improvementAmount - scaledAmount);
        }
      }
    }

    // Pass 2: Allocate remaining baseline to improvements, preferring large blocks
    const remainingBaselineTotal = Array.from(remainingBaseline.values()).reduce((sum, amount) => sum + amount, 0);

    if (remainingBaselineTotal > 0) {
      // Sort remaining improvements by size (largest first)
      const sortedImprovements = Array.from(remainingImprovement.entries())
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a); // Sort by amount descending

      for (const [baselineType, baselineAmount] of remainingBaseline.entries()) {
        if (baselineAmount <= 0) continue;

        let remainingToAllocate = baselineAmount;

        for (const [improvementType, improvementAmount] of sortedImprovements) {
          if (remainingToAllocate <= 0 || improvementAmount <= 0) continue;

          const allocatedAmount = Math.min(remainingToAllocate, improvementAmount);

          if (allocatedAmount > 0) {
            const scaledAmount = allocatedAmount * scalingFactor;
            const linkKey = `${unit}|${baselineType}|${improvementType}`;
            aggregatedLinks.set(linkKey, (aggregatedLinks.get(linkKey) || 0) + scaledAmount);

            remainingToAllocate -= allocatedAmount;
            sortedImprovements.find(([type]) => type === improvementType)[1] -= scaledAmount;
          }
        }
      }
    }


    const baselineNodeMap = new Map();
    const improvementNodeMap = new Map();

    // Create baseline (source) nodes
    for (const type of sourceNodeTypes) {
      baselineNodeMap.set(type, data.nodes.length);
      data.nodes.push({ name: type, unit: unit});
    }

    // Create improvement (destination) nodes
    for (const type of improvementNodeTypes) {
      improvementNodeMap.set(type, data.nodes.length);
      data.nodes.push({ name: type, unit: unit });
    }

    for (const [linkKey, linkValue] of aggregatedLinks.entries()) {
      const [unitType, sourceType, improvementType] = linkKey.split('|');
      const sourceIndex = baselineNodeMap.get(sourceType);
      const targetIndex = improvementNodeMap.get(improvementType);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        data.links.push({
          source: sourceIndex,
          target: targetIndex,
          value: linkValue,
          unit: unit
        });
      }
    }
  }

  const totalSize = Math.max(totalSourceSize, totalImprovementSize);
  data.dynamicHeight = Math.max(Math.min(totalSize * 35, 1500), 200);
  data.sort = true;

  return data;
};

export default async function SitePage({ params }) {

  const { referenceNumber } = await params;
  const lastUpdated = Date.now();

  const site = await fetchSite(referenceNumber, true, true)
  if (!site) {
    return <p>Site not found</p>
  }

  if (site.latitude && site.longitude) {
    site.position = [site.latitude, site.longitude];
  }

  site.habitats = collateAllHabitats(site.habitats, false);
  site.improvements = collateAllHabitats(site.improvements, true);

  const sankeyData = getHabitatSankeyData(site);

  return (
    <>
      <SitePageContent site={site} sankeyData={sankeyData} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
