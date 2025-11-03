import { fetchSite, fetchAllSites } from '@/lib/api';
import { collateAllHabitats, getDistinctivenessScore, getHabitatGroup, getConditionScore } from '@/lib/habitat';
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
            for (const sub of habitat.subRows) {
              totalSourceSize += sub.area;
              const key = `${habitat.type}|${sub.condition}`;
              siteBaselineTotals.set(key, (siteBaselineTotals.get(key) || 0) + habitat.area);
            }
          }
        }
      }
    }

    // Aggregate improvement area for the current site
    if (site.improvements) {
      if (site.improvements[unit]) {
        for (const habitat of site.improvements[unit]) {
          for (const sub of habitat.subRows) {
            totalImprovementSize += sub.area;
            const key = `${habitat.type}|${sub.condition}`;
            siteImprovementTotals.set(key, (siteImprovementTotals.get(key) || 0) + sub.area);
          }
        }
      }
    }

    const remainingBaseline = new Map(siteBaselineTotals);
    const remainingImprovement = new Map(siteImprovementTotals);

    const createdBaseline = '<CREATED>';
    const retainedImprovement = '<RETAINED>'

    const AllocateHabitat = (baseline, improvement, allocatedAmount) => {
      // add to the sets of types
      sourceNodeTypes.add(baseline);
      improvementNodeTypes.add(improvement);

      // increment the amount allocated to this link
      const linkKey = `${unit}_${baseline}_${improvement}`;
      const newAmount = (aggregatedLinks.get(linkKey) || 0) + allocatedAmount;
      aggregatedLinks.set(linkKey, newAmount);

      // reduce the remaining amounts
      if (baseline != createdBaseline) {
        const newRemainingBaseline = (remainingBaseline.get(baseline) || 0) - allocatedAmount;
        if (newRemainingBaseline < 0) throw new Error('negative remaining baseline');
        remainingBaseline.set(baseline, newRemainingBaseline);
      }
      if (improvement != retainedImprovement) {
        const newRemainingImprovement = (remainingImprovement.get(improvement) || 0) - allocatedAmount;
        if (newRemainingImprovement < 0) throw new Error('negative remaining improvement');
        remainingImprovement.set(improvement, newRemainingImprovement);
      }
    };

    // conversions only allowed if they would lead to an increase in distinctiveness
    // or, if the same broad habitat, the same distinctiveness
    const IsConversionPossible = (baseline, improvement, sameGroupOnly) => {
      // Extract habitat types from compound keys (type|condition)
      const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
      const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;

      const baselineGroup = getHabitatGroup(baselineType);
      const improvementGroup = getHabitatGroup(improvementType);
      if (sameGroupOnly && baselineGroup != improvementGroup) {
        return false;
      }
      const sameGroup = baselineGroup == improvementGroup;
      const baselineD = getDistinctivenessScore(baselineType);
      const improvementD = getDistinctivenessScore(improvementType);
      return sameGroup ? baselineD <= improvementD : baselineD < improvementD;
    }

    // Pass 1: Allocate same-habitat types of at least the same condition
    for (const [habitatType, baselineAmount] of siteBaselineTotals.entries()) {
      let remainingBaselineAmount = baselineAmount;
      const baselineType = habitatType.includes('|') ? habitatType.split('|')[0] : habitatType;
      for (const [improvementHabitat, improvementAmount] of remainingImprovement) {
        const improvementType = improvementHabitat.includes('|') ? improvementHabitat.split('|')[0] : improvementHabitat;
        if (baselineType == improvementType) {
          const baselineCondition = habitatType.includes('|') ? habitatType.split('|')[1] : 'condition assessment n/a';
          const improvementCondition = improvementHabitat.includes('|') ? improvementHabitat.split('|')[1] : 'condition assessment n/a';
          if (getConditionScore(improvementCondition) >= getConditionScore(baselineCondition)) {
            const allocatedAmount = Math.min(baselineAmount, improvementAmount);
            if (allocatedAmount > 0) {
              AllocateHabitat(habitatType, improvementHabitat, allocatedAmount);
              remainingBaselineAmount -= allocatedAmount;
            }
          }
        }
      }
    }

    // Pass 2: Allocate remaining baseline to improvements, preferring large blocks
    const allocateRemaining = (sameGroupOnly, baselineGroupsOnly) => {
      // sort by combined distinctiveness & condition score to allocate the lowest first (poorer quality habitats first)
      const sortedBaseline = Array.from(remainingBaseline.entries())
        .sort(([keyA,], [keyB,]) => {
          const [typeA, conditionA] = keyA.split('|');
          const [typeB, conditionB] = keyB.split('|');
          const scoreA = getDistinctivenessScore(typeA) * getConditionScore(conditionA);
          const scoreB = getDistinctivenessScore(typeB) * getConditionScore(conditionB);
          return scoreA - scoreB;
        });
      for (const [baselineType, baselineAmount] of sortedBaseline) {
        if (baselineAmount <= 0) continue;
        const baselineHabitat = baselineType.includes('|') ? baselineType.split('|')[0] : baselineType;
        if (baselineGroupsOnly && !baselineGroupsOnly.includes(getHabitatGroup(baselineHabitat))) continue;

        let remainingToAllocate = baselineAmount;

        // Sort remaining improvements by size (largest first)
        const sortedImprovements = Array.from(remainingImprovement.entries())
          .filter(([, amount]) => amount > 0)
          .sort(([, a], [, b]) => b - a); // Sort by amount descending

        for (const [improvementType, improvementAmount] of sortedImprovements) {
          if (remainingToAllocate <= 0 || improvementAmount <= 0 || !IsConversionPossible(baselineType, improvementType, sameGroupOnly)) continue;

          const allocatedAmount = Math.min(remainingToAllocate, improvementAmount);

          if (allocatedAmount > 0) {
            AllocateHabitat(baselineType, improvementType, allocatedAmount);
            remainingToAllocate -= allocatedAmount;
          }
        }
      }
    }
    if (unit == 'areas') {
      // special handling for undesirable area baseline groups - assume these are more likely to be improved to process them first
      const unwantedGroups = ['Cropland', 'Urban', 'Intertidal hard structures'];
      allocateRemaining(false, unwantedGroups);
    }
    // first do a pass only within habitat groups
    allocateRemaining(true);
    // then allow allocation between groups
    allocateRemaining(false);


    // Pass 3: allocate any remaining baseline to a "destroyed" improvement node
    for (const [baselineType, baselineAmount] of remainingBaseline.entries()) {
      if (baselineAmount > 0.01) {
        AllocateHabitat(baselineType, retainedImprovement, baselineAmount);
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
    const sortedSourceNodeTypes = Array.from(sourceNodeTypes)
      .sort((keyA, keyB) => {
        if (keyA === createdBaseline) return 1;
        if (keyB === createdBaseline) return -1;

        const [typeA, conditionA] = keyA.split('|');
        const [typeB, conditionB] = keyB.split('|');
        const scoreA = getDistinctivenessScore(typeA) * getConditionScore(conditionA);
        const scoreB = getDistinctivenessScore(typeB) * getConditionScore(conditionB);

        if (scoreA == scoreB) {
          return siteBaselineTotals.get(keyB) - siteBaselineTotals.get(keyA);
        }
        else {
          return scoreB - scoreA; // Higher scores first for display
        }
      });
    for (const key of sortedSourceNodeTypes) {
      baselineNodeMap.set(key, data.nodes.length);
      const displayName = key.includes('|') ? `[${key.split('|')[1]}] ${key.split('|')[0]}` : key;
      data.nodes.push({ name: displayName, unit: unit });
    }

    // Create improvement (destination) nodes
    const sortedimprovementNodeTypes = Array.from(improvementNodeTypes)
      .sort((keyA, keyB) => {
        if (keyA == retainedImprovement) return -1;
        if (keyB == retainedImprovement) return 1;

        const [typeA, conditionA] = keyA.split('|');
        const [typeB, conditionB] = keyB.split('|');
        const scoreA = getDistinctivenessScore(typeA) * getConditionScore(conditionA);
        const scoreB = getDistinctivenessScore(typeB) * getConditionScore(conditionB);

        if (scoreA == scoreB) {
          return siteImprovementTotals.get(keyB) - siteImprovementTotals.get(keyA);
        }
        else {
          return scoreB - scoreA; // Higher scores first for display
        }
      });
    for (const key of sortedimprovementNodeTypes) {
      improvementNodeMap.set(key, data.nodes.length);
      const displayName = key.includes('|') ? `${key.split('|')[0]} [${key.split('|')[1]}]` : key;
      data.nodes.push({ name: displayName, unit: unit });
    }

    for (const [linkKey, linkValue] of aggregatedLinks.entries()) {
      const [unitType, sourceType, improvementType] = linkKey.split('_');
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
  data.sort = false;

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
