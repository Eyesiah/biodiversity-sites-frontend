import { calculateBaselineHU, calculateImprovementHU, getHabitatGroup, getDistinctivenessScore, getConditionScore } from '@/lib/habitat';

const normalizeName = (name) => {
  if (!name) return 'N/A';
  // Remove common suffixes like 'LPA', 'NCA', 'LNRS', 'Council', etc., and trim whitespace.
  return name
    .replace(/\s+(LPA|NCA|LNRS|Council|Borough|District|County|Combined Authority|Mayoral Combined Authority)$/i, '')
    .trim();
};

const isIndividualTree = (habitat) => getHabitatGroup(habitat.type) == 'Individual tree';

export function processSiteForListView(site) {
  return {
    referenceNumber: site.referenceNumber,
    responsibleBodies: site.responsibleBodies || [],
    siteSize: site.siteSize || 0,
    allocationsCount: site.allocations ? site.allocations.length : 0,
    lpaName: normalizeName(site.lpaName),
    ncaName: normalizeName(site.ncaName),
    lnrsName: normalizeName(site.lnrsName),
    imdDecile: site.lsoa?.IMDDecile ?? 'N/A',
    position: site.latitude && site.longitude ? [site.latitude, site.longitude] : null,
    lsoaName: site.lsoa?.name || '',
    responsibleBody: site.responsibleBodies?.[0] || 'N/A',
    allocationsCount: site.allocations ? site.allocations.length : 0,
    baselineHUs: [...site.habitats.areas, ...site.habitats.hedgerows, ...site.habitats.watercourses].reduce((acc, h) => acc + h.HUs, 0),
    improvementHUs: [...site.improvements.areas, ...site.improvements.hedgerows, ...site.improvements.watercourses].reduce((acc, h) => acc + h.HUs, 0),
    baselineAreaSize: site.habitats.areas.filter(h => !isIndividualTree(h)).reduce((acc, h) => acc + h.size, 0),
    improvementAreaSize: site.improvements.areas.filter(h => !isIndividualTree(h)).reduce((acc, h) => acc + h.size, 0),
  }
}

/**
 * Processes an array of raw site objects to a format suitable for the site list view.
 * This reduces the data payload sent to the client.
 * @param {Array} sites - The array of raw site objects.
 * @returns {Array} The array of processed site objects.
 */
export function processSitesForListView(sites) {
  if (!sites) return [];
  return sites.map(site => processSiteForListView(site));
}

/**
 * Processes raw site data for the index page, calculating summary statistics.
 * @param {Array} allSites - The array of raw site objects.
 * @returns {{processedSites: Array, summary: Object}}
 */
export function processSiteDataForIndex(allSites) {
  if (!allSites) {
    return {
      processedSites: [],
      summary: { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0, numAllocations: 0 },
    };
  }

  let totalBaselineHUs = 0;
  let totalCreatedHUs = 0;
  let totalAllocationHUs = 0;
  let numAllocations = 0;
  let baselineAreaSize = 0;
  let baselineWatercourseSize = 0;
  let baselineHedgerowSize = 0;
  let improvementsAreaSize = 0;
  let improvementsWatercourseSize = 0;
  let improvementsHedgerowSize = 0;
  let baselineParcels = 0;
  let improvementsParcels = 0;
  let allocatedParcels = 0;
  allSites.forEach(site => {
    if (site.habitats) {
      const processHabitats = (habitats, isArea, ref) => {
        if (!habitats) return;
        habitats.forEach(h => {
          let type = h.type;
          if (isArea) {
            const typeParts = h.type.split(' - ');
            type = (typeParts.length > 1 ? typeParts[1] : h.type).trim();
          }
          totalBaselineHUs += calculateBaselineHU(h.size, type, h.condition || 'N/A - Other');
          baselineParcels += 1;
        });
      };
      processHabitats(site.habitats.areas, true);
      processHabitats(site.habitats.hedgerows, false);
      processHabitats(site.habitats.watercourses, false);

      baselineAreaSize += site.habitats.areas.reduce((acc, hab) => acc + hab.size, 0);
      baselineWatercourseSize += site.habitats.watercourses.reduce((acc, hab) => acc + hab.size, 0);
      baselineHedgerowSize += site.habitats.hedgerows.reduce((acc, hab) => acc + hab.size, 0);
    }

    if (site.improvements) {
      const processImprovementHabitats = (habitats, isArea) => {
        if (!habitats) return;
        habitats.forEach(h => {
          let type = h.type;
          if (isArea) {
            const typeParts = h.type.split(' - ');
            type = (typeParts.length > 1 ? typeParts[1] : h.type).trim();
          }
          if (type) {
            totalCreatedHUs += calculateImprovementHU(h.size, type, h.condition || 'N/A - Other', h.interventionType || '');
            improvementsParcels += 1;
          } else {
            // Log a warning if a habitat is missing a type
            console.warn(`Skipping improvement habitat calculation due to missing type for site: ${site.referenceNumber}`);
          }
        });
      };
      processImprovementHabitats(site.improvements.areas, true);
      processImprovementHabitats(site.improvements.hedgerows, false);
      processImprovementHabitats(site.improvements.watercourses, false);

      improvementsAreaSize += site.improvements.areas.reduce((acc, hab) => acc + hab.size, 0);
      improvementsWatercourseSize += site.improvements.watercourses.reduce((acc, hab) => acc + hab.size, 0);
      improvementsHedgerowSize += site.improvements.hedgerows.reduce((acc, hab) => acc + hab.size, 0);
    }

    if (site.allocations) {
      numAllocations += site.allocations.length;
      site.allocations.forEach(alloc => {
        totalAllocationHUs += (alloc.areaUnits || 0);
        totalAllocationHUs += (alloc.hedgerowUnits || 0);
        totalAllocationHUs += (alloc.watercoursesUnits || 0);

        const processHabitats = (habitats) => {
          if (habitats) {
            allocatedParcels += habitats.length;
          }
        };
        processHabitats(alloc.habitats?.areas);
        processHabitats(alloc.habitats?.hedgerows);
        processHabitats(alloc.habitats?.watercourses);
      });
    }
  });

  const processedSites = processSitesForListView(allSites);
  const totalSites = processedSites.length;
  const totalArea = processedSites.reduce((acc, site) => acc + (site.siteSize || 0), 0);

  return {
    processedSites,
    summary: {
      totalSites,
      totalArea,
      totalBaselineHUs,
      totalCreatedHUs,
      totalAllocationHUs,
      numAllocations,
      baselineAreaSize,
      baselineWatercourseSize,
      baselineHedgerowSize,
      improvementsAreaSize,
      improvementsWatercourseSize,
      improvementsHedgerowSize,
      baselineParcels,
      improvementsParcels,
      allocatedParcels,
    },
  };
}

const CREATED_BASELINE_NODE_NAME = '<CREATED>';
const RETAINED_IMPROVEMENT_NODE_NAME = '<RETAINED>'

const getHabitatSankeyData = (site) => {

  const aggregatedLinks = new Map();
  const habitatUnits = ['areas', 'hedgerows', 'watercourses'];

  const data = {}

  for (const unit of habitatUnits) {
    const siteBaselineTotals = new Map();
    const siteImprovementTotals = new Map();
    const sourceNodeTypes = new Set();
    const improvementNodeTypes = new Set();

    const siteBaselineHabTotals = new Map();
    const siteImprovementHabTotals = new Map();

    // Aggregate baseline sizes for the current site
    if (site.habitats) {
      if (site.habitats[unit]) {
        for (const habitat of site.habitats[unit]) {
          if (habitat.area > 0) {
            siteBaselineHabTotals.set(habitat.type, (siteBaselineHabTotals.get(habitat.type) || 0) + habitat.area);
            for (const sub of habitat.subRows) {
              const key = `${habitat.type}|${sub.condition}`;
              siteBaselineTotals.set(key, (siteBaselineTotals.get(key) || 0) + sub.area);
            }
          }
        }
      }
    }

    // Aggregate improvement area for the current site
    if (site.improvements) {
      if (site.improvements[unit]) {
        for (const habitat of site.improvements[unit]) {
          siteImprovementHabTotals.set(habitat.type, (siteImprovementHabTotals.get(habitat.type) || 0) + habitat.area);
          for (const sub of habitat.subRows) {
            const key = `${habitat.type}|${sub.condition}`;
            siteImprovementTotals.set(key, (siteImprovementTotals.get(key) || 0) + sub.area);
          }
        }
      }
    }

    const remainingBaseline = new Map(siteBaselineTotals);
    const remainingImprovement = new Map(siteImprovementTotals);

    const AllocateHabitat = (baseline, improvement, allocatedAmount) => {
      // add to the sets of types
      sourceNodeTypes.add(baseline);
      improvementNodeTypes.add(improvement);

      // increment the amount allocated to this link
      const linkKey = `${unit}_${baseline}_${improvement}`;
      const newAmount = (aggregatedLinks.get(linkKey) || 0) + allocatedAmount;
      aggregatedLinks.set(linkKey, newAmount);

      // reduce the remaining amounts
      if (baseline != CREATED_BASELINE_NODE_NAME) {
        const newRemainingBaseline = (remainingBaseline.get(baseline) || 0) - allocatedAmount;
        if (newRemainingBaseline < 0) throw new Error('negative remaining baseline');
        remainingBaseline.set(baseline, newRemainingBaseline);
      }
      if (improvement != RETAINED_IMPROVEMENT_NODE_NAME) {
        const newRemainingImprovement = (remainingImprovement.get(improvement) || 0) - allocatedAmount;
        if (newRemainingImprovement < 0) throw new Error('negative remaining improvement');
        remainingImprovement.set(improvement, newRemainingImprovement);
      }
    };

    // Allocate same-habitat types of better same condition
    for (const [habitatType, baselineAmount] of remainingBaseline.entries()) {
      let remainingBaselineAmount = baselineAmount;
      const baselineType = habitatType.includes('|') ? habitatType.split('|')[0] : habitatType;
      for (const [improvementHabitat, improvementAmount] of remainingImprovement) {
        const improvementType = improvementHabitat.includes('|') ? improvementHabitat.split('|')[0] : improvementHabitat;
        if (baselineType == improvementType) {
          const baselineCondition = habitatType.includes('|') ? habitatType.split('|')[1] : 'condition assessment n/a';
          const improvementCondition = improvementHabitat.includes('|') ? improvementHabitat.split('|')[1] : 'condition assessment n/a';
          if (getConditionScore(improvementCondition) > getConditionScore(baselineCondition)) {
            const allocatedAmount = Math.min(remainingBaselineAmount, improvementAmount);
            if (allocatedAmount > 0) {
              AllocateHabitat(habitatType, improvementHabitat, allocatedAmount);
              remainingBaselineAmount -= allocatedAmount;
            }
          }
        }
      }
    }

    // conversions only allowed if they would lead to an increase in distinctiveness
    // or, if the same broad habitat, the same distinctiveness
    const IsConversionPossible = (baseline, improvement, sameGroupOnly) => {
      // Extract habitat types from compound keys (type|condition)
      const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
      const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;

      if (baselineType == improvementType) {
        const baselineCond = baseline.includes('|') ? baseline.split('|')[1] : 'n/a';
        const improvementCond = improvement.includes('|') ? improvement.split('|')[1] : 'n/a';
        // only allowed if condition is same or better
        return getConditionScore(improvementCond) >= getConditionScore(baselineCond);
      }

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

    // Allocate remaining baseline to improvements, preferring large blocks
    const allocateRemaining = (sourceHabitats, sameGroupOnly) => {
      // sort by combined distinctiveness & condition score to allocate the lowest first (poorer quality habitats first)
      const sortedBaseline = sourceHabitats
        .sort(([keyA,], [keyB,]) => {
          const [typeA, conditionA] = keyA.split('|');
          const [typeB, conditionB] = keyB.split('|');
          const scoreA = getDistinctivenessScore(typeA);
          const scoreB = getDistinctivenessScore(typeB);
          if (scoreA == scoreB) {
            const condScoreA = getConditionScore(conditionA);
            const condScoreB = getConditionScore(conditionB);
            return condScoreA - condScoreB;
          } else {
            return scoreA - scoreB;
          }
        });
      for (const [baselineType, baselineAmount] of sortedBaseline) {
        if (baselineAmount <= 0) continue;
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
      // special handling for artificial area habitats - assume these are more likely to be improved to process them first
      const artificialGroups = ['cropland', 'urban', 'intertidal hard structures'];
      const artificalHabitats = ['modified grassland'];
      const artificialRemaining = Array.from(remainingBaseline.entries())
        .filter(([habitat]) => {
          const baselineHabitat = habitat.includes('|') ? habitat.split('|')[0] : habitat;
          const distinctivenessScore = getDistinctivenessScore(baselineHabitat);
          return distinctivenessScore <= 2 && (artificalHabitats.includes(baselineHabitat.toLowerCase()) || artificialGroups.includes(getHabitatGroup(baselineHabitat).toLowerCase()));
        });
      allocateRemaining(artificialRemaining, false);
    }

    // first do a pass only within habitat groups
    allocateRemaining(Array.from(remainingBaseline.entries()), true);
    // then allow allocation between groups
    allocateRemaining(Array.from(remainingBaseline.entries()), false);


    // Pass 3: allocate any remaining baseline to a "destroyed" improvement node
    for (const [baselineType, baselineAmount] of remainingBaseline.entries()) {
      if (baselineAmount > 0.01) {
        AllocateHabitat(baselineType, RETAINED_IMPROVEMENT_NODE_NAME, baselineAmount);
      }
    }


    // Pass 4: allocate any remaining improvements to a "created" baseline node
    for (const [improvementType, improvementAmount] of remainingImprovement) {
      if (improvementAmount > 0.01) {
        AllocateHabitat(CREATED_BASELINE_NODE_NAME, improvementType, improvementAmount);
      }
    }

    data[unit] = {
      siteBaselineHabTotals,
      siteImprovementHabTotals,
      sourceNodeTypes: Array.from(sourceNodeTypes),
      improvementNodeTypes: Array.from(improvementNodeTypes),
      aggregatedLinks
    };
  }

  return data;
};

const sortNodesForSankey = (nodes, habTotals, dummyNodeName, dummyNodeFirst) => {

  return nodes.sort((keyA, keyB) => {
    if (keyA === dummyNodeName) return dummyNodeFirst ? 1 : -1;
    if (keyB === dummyNodeName) return dummyNodeFirst ? -1 : 1;

    const [typeA, conditionA] = keyA.split('|');
    const [typeB, conditionB] = keyB.split('|');
    const scoreA = getDistinctivenessScore(typeA);
    const scoreB = getDistinctivenessScore(typeB);

    if (scoreA == scoreB) {
      if (typeA == typeB) {
        const condAScore = getConditionScore(conditionA)
        const condBScore = getConditionScore(conditionB)
        return condBScore - condAScore;
      }
      return habTotals.get(typeB) - habTotals.get(typeA);
    }
    else {
      return scoreB - scoreA; // Higher scores first for display
    }
  });
};

const convertSankeySourceDataToGraph = (data) => {

  const graphData = { nodes: [], links: [] };
  let totalSize = 0;

  for (const [unitName, unitData] of Object.entries(data)) {
    const baselineNodeMap = new Map();
    const improvementNodeMap = new Map();

    // Create baseline (source) nodes
    for (const key of sortNodesForSankey(unitData.sourceNodeTypes, unitData.siteBaselineHabTotals, CREATED_BASELINE_NODE_NAME, true)) {
      baselineNodeMap.set(key, graphData.nodes.length);
      const habitatName = key.includes('|') ? key.split('|')[0] : key;
      const conditionName = key.includes('|') ? key.split('|')[1] : '';
      graphData.nodes.push({ name: habitatName, unit: unitName, condition: conditionName });
    }

    // Create improvement (destination) nodes
    for (const key of sortNodesForSankey(unitData.improvementNodeTypes, unitData.siteImprovementHabTotals, RETAINED_IMPROVEMENT_NODE_NAME, false)) {
      improvementNodeMap.set(key, graphData.nodes.length);
      const habitatName = key.includes('|') ? key.split('|')[0] : key;
      const conditionName = key.includes('|') ? key.split('|')[1] : '';
      graphData.nodes.push({ name: habitatName, unit: unitName, condition: conditionName });
    }

    for (const [linkKey, linkValue] of unitData.aggregatedLinks.entries()) {
      const [unitType, sourceType, improvementType] = linkKey.split('_');
      const sourceIndex = baselineNodeMap.get(sourceType);
      const targetIndex = improvementNodeMap.get(improvementType);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        totalSize += linkValue;
        graphData.links.push({
          source: sourceIndex,
          target: targetIndex,
          value: linkValue,
          unit: unitName
        });
      }
    }
  }

  graphData.dynamicHeight = Math.max(Math.min(totalSize * 35, 1500), 200);
  graphData.sort = false;

  return graphData;
};

export const getHabitatSankeyGraph = (site) => {
  const data = getHabitatSankeyData(site);
  return convertSankeySourceDataToGraph(data);
};