import { fetchSite, fetchAllSites } from '@/lib/api';
import { collateAllHabitats, getDistinctivenessScore } from '@/lib/habitat';
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
          }
        }
      }
    }

    const remainingBaseline = new Map(siteBaselineTotals);
    const remainingImprovement = new Map(siteImprovementTotals);

    const createdBaseline = '<CREATED>';
    const destroyedImprovement = '<RETAINED>'

    const AllocateHabitat = (baseline, improvement, allocatedAmount) => {
      // add to the sets of types
      sourceNodeTypes.add(baseline);
      improvementNodeTypes.add(improvement);

      // increment the amount allocated to this link
      const linkKey = `${unit}|${baseline}|${improvement}`;
      const newAmount = (aggregatedLinks.get(linkKey) || 0) + allocatedAmount;
      aggregatedLinks.set(linkKey, newAmount);

      // reduce the remaining amounts
      if (baseline != createdBaseline) {
        const newRemainingBaseline = (remainingBaseline.get(baseline) || 0) - allocatedAmount;
        if (newRemainingBaseline < 0) throw new Error('negative remaining baseline');
        remainingBaseline.set(baseline, newRemainingBaseline);
      }
      if (improvement != destroyedImprovement) {
        const newRemainingImprovement = (remainingImprovement.get(improvement) || 0) - allocatedAmount;
        if (newRemainingImprovement < 0) throw new Error('negative remaining improvement');
        remainingImprovement.set(improvement, newRemainingImprovement);
      }
    };

    // conversions only allowed if they would lead to an increase in distinciveness
    const IsConversionPossible = (baseline, improvement) => {
      const baselineD = getDistinctivenessScore(baseline);
      const improvementD = getDistinctivenessScore(improvement);
      return baselineD < improvementD;
    }

    // Pass 1: Allocate same-habitat types
    for (const [habitatType, baselineAmount] of siteBaselineTotals.entries()) {
      if (remainingImprovement.has(habitatType)) {
        const improvementAmount = remainingImprovement.get(habitatType);
        const allocatedAmount = Math.min(baselineAmount, improvementAmount);

        if (allocatedAmount > 0) {
          AllocateHabitat(habitatType, habitatType, allocatedAmount);
        }
      }
    }

    // Pass 2: Allocate remaining baseline to improvements, preferring large blocks
    // sort by distinctiveness to allocate the highest first
    const sortedBaseline = Array.from(remainingBaseline.entries())
        .sort(([typeA, ], [typeB, ]) => getDistinctivenessScore(typeA) - getDistinctivenessScore(typeB)); // Sort by amount descending
    for (const [baselineType, baselineAmount] of sortedBaseline) {
      if (baselineAmount <= 0) continue;

      let remainingToAllocate = baselineAmount;

      // Sort remaining improvements by size (largest first)
      const sortedImprovements = Array.from(remainingImprovement.entries())
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a); // Sort by amount descending

      for (const [improvementType, improvementAmount] of sortedImprovements) {
        if (remainingToAllocate <= 0 || improvementAmount <= 0 || !IsConversionPossible(baselineType, improvementType)) continue;

        const allocatedAmount = Math.min(remainingToAllocate, improvementAmount);

        if (allocatedAmount > 0) {
          AllocateHabitat(baselineType, improvementType, allocatedAmount);
          remainingToAllocate -= allocatedAmount;
        }
      }
    }


    // Pass 3: allocate any remaining baseline to a "destroyed" improvement node
    for (const [baselineType, baselineAmount] of remainingBaseline.entries()) {
      if (baselineAmount > 0.01) {
        AllocateHabitat(baselineType, destroyedImprovement, baselineAmount);
      }
    }


    // Pass 4: allocate any remaining improvements to a "created" baseline node
    for (const [improvementType, improvementAmount] of remainingImprovement) {
      if (improvementAmount > 0.01) {
        AllocateHabitat(createdBaseline, improvementType, improvementAmount);
      }
    }

    const baselineNodeMap = new Map();
    const improvementNodeMap = new Map();

    // Create baseline (source) nodes
    for (const type of sourceNodeTypes) {
      baselineNodeMap.set(type, data.nodes.length);
      data.nodes.push({ name: type, unit: unit });
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
