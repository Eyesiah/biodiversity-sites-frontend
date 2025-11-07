import { getHabitatDistinctiveness, calculateBaselineHU, calculateImprovementHU, getHabitatGroup, getDistinctivenessScore, getConditionScore, collateAllHabitats } from '@/lib/habitat';
import { formatNumber } from '@/lib/format';

const reverseDistinctivenessLookup = {
  0: 'Very Low',
  1: 'Very Low',
  2: 'Low',
  4: 'Medium',
  6: 'High',
  8: 'Very High'
};

// Base colors in HSL for each unit type (copied from SiteHabitatSankeyChart.js)
const BASE_COLORS = {
  areas: { h: 120, s: 45, l: 25 }, // Green
  hedgerows: { h: 50, s: 90, l: 55 }, // Yellow
  watercourses: { h: 220, s: 90, l: 30 } // Blue
};

// Distinctiveness bands for lightness mapping
const DISTINCTIVENESS_BANDS = {
  0: { min: 70, max: 75 }, // Very Low (area)
  1: { min: 70, max: 75 }, // Very Low
  2: { min: 60, max: 65 }, // Low
  4: { min: 50, max: 55 }, // Medium
  6: { min: 40, max: 45 }, // High
  8: { min: 30, max: 35 }  // Very High
};

// Get habitat-specific color for a node based on unit hue and quality lightness
const getNodeColor = (node) => {
  const { name: habitatName, unit, distinctivenessScore, conditionScore } = node;

  // Special handling for Individual trees habitats
  if (habitatName === 'Urban tree' || habitatName === 'Rural tree') {
    return '#b0500cff'; // Burnt Orange colour for Individual trees
  }

  // Get distinctiveness band
  const band = DISTINCTIVENESS_BANDS[distinctivenessScore] || DISTINCTIVENESS_BANDS[3];

  // Map condition within the band (higher condition = darker)
  const conditionNormalized = conditionScore / 3; // 0 to 3
  const lightness = band.min + (1 - conditionNormalized) * (band.max - band.min);

  // Get base color for unit
  const base = BASE_COLORS[unit] || BASE_COLORS.areas;

  return `hsl(${base.h}, ${base.s}%, ${lightness}%)`;
};

// Blend two colors for link gradients
const blendColors = (color1, color2) => {
  // For Plotly Sankey, we need a single color, not a gradient
  // Return the target color (improvement) with some transparency
  // Extract color components and blend them
  const color1Match = color1.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  const color2Match = color2.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);

  if (color1Match && color2Match) {
    const [, h1, s1, l1] = color1Match.map(Number);
    const [, h2, s2, l2] = color2Match.map(Number);

    // Blend the colors (simple average)
    const h = Math.round((h1 + h2) / 2);
    const s = Math.round((s1 + s2) / 2);
    const l = Math.round((l1 + l2) / 2);

    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // Fallback: return target color with transparency
  return color2.replace('hsl', 'hsla').replace(')', ', 0.7)');
};

const normalizeName = (name) => {
  if (!name) return 'N/A';
  // Remove common suffixes like 'LPA', 'NCA', 'LNRS', 'Council', etc., and trim whitespace.
  return name
    .replace(/\s+(LPA|NCA|LNRS|Council|Borough|District|County|Combined Authority|Mayoral Combined Authority)$/i, '')
    .trim();
};

const isIndividualTree = (habitat) => getHabitatGroup(habitat.type) == 'Individual trees';

export function processSiteForListView(site) {
  return {
    referenceNumber: site.referenceNumber,
    name: site.name,
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

const CREATED_BASELINE_NODE_NAME = '[CREATED]';
const RETAINED_IMPROVEMENT_NODE_NAME = '[RETAINED]'
const HABITAT_UNIT_TYPES = ['areas', 'trees', 'hedgerows', 'watercourses'];

const getHabitatSankeyData = (site, unit) => {

  const aggregatedLinks = new Map();

  const data = {}

  let baselineHabitats = site?.habitats[unit];
  let improvementHabitats = site?.improvements[unit]

  // split out trees into their own unit type
  if (unit == 'areas') {
    baselineHabitats = baselineHabitats?.filter(h => !isIndividualTree(h));
    improvementHabitats = improvementHabitats?.filter(h => !isIndividualTree(h));
  } else if (unit  == 'trees') {
    baselineHabitats = site.habitats?.areas?.filter(h => isIndividualTree(h));
    improvementHabitats = site.improvements?.areas?.filter(h => isIndividualTree(h));
  }

  const siteBaselineTotals = new Map();
  const siteImprovementTotals = new Map();
  const sourceNodeTypes = new Set();
  const improvementNodeTypes = new Set();

  const siteBaselineHabTotals = new Map();
  const siteImprovementHabTotals = new Map();

  // Aggregate baseline sizes for the current site
    if (baselineHabitats) {
      for (const habitat of baselineHabitats) {
        if (habitat.area > 0) {
          siteBaselineHabTotals.set(habitat.type, (siteBaselineHabTotals.get(habitat.type) || 0) + habitat.area);
          for (const sub of habitat.subRows) {
            const key = `${habitat.type}|${sub.condition}`;
            siteBaselineTotals.set(key, (siteBaselineTotals.get(key) || 0) + sub.area);
          }
        }
      }
    }
  

  // Aggregate improvement area for the current site
    if (improvementHabitats) {
      for (const habitat of improvementHabitats) {
        siteImprovementHabTotals.set(habitat.type, (siteImprovementHabTotals.get(habitat.type) || 0) + habitat.area);
        for (const sub of habitat.subRows) {
          const key = `${habitat.type}|${sub.condition}`;
          siteImprovementTotals.set(key, (siteImprovementTotals.get(key) || 0) + sub.area);
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

  // sort habitats by combined distinctiveness then condition score to allocate the lowest first (poorer quality habitats first)
  // for habitats with the same scores, sort be largest remaining to allocate first
  const habitatSorter = ([keyA, remainingSizeA], [keyB, remainingSizeB]) => {
    const [typeA, conditionA] = keyA.split('|');
    const [typeB, conditionB] = keyB.split('|');
    const scoreA = getDistinctivenessScore(typeA);
    const scoreB = getDistinctivenessScore(typeB);
    if (scoreA == scoreB) {
      const condScoreA = getConditionScore(conditionA);
      const condScoreB = getConditionScore(conditionB);
      if (condScoreA == condScoreB) {
        return remainingSizeB - remainingSizeA;
      } else {
        return condScoreA - condScoreB;
      }
    } else {
      return scoreA - scoreB;
    }
  }

  // Allocate remaining baseline to improvements, preferring large blocks
  const allocateRemaining = (isConversionPossiblePredicate) => {
    const sortedBaseline = Array.from(remainingBaseline.entries())
      .sort(habitatSorter);
    for (const [baselineType, baselineAmount] of sortedBaseline) {
      if (baselineAmount <= 0) continue;
      let remainingToAllocate = baselineAmount;

      // Sort remaining improvements also
      const sortedImprovements = Array.from(remainingImprovement.entries())
        .filter(([, amount]) => amount > 0)
        .sort(habitatSorter);

      for (const [improvementType, improvementAmount] of sortedImprovements) {
        if (remainingToAllocate <= 0 || improvementAmount <= 0 || !isConversionPossiblePredicate(baselineType, improvementType)) continue;

        const allocatedAmount = Math.min(remainingToAllocate, improvementAmount);

        if (allocatedAmount > 0) {
          AllocateHabitat(baselineType, improvementType, allocatedAmount);
          remainingToAllocate -= allocatedAmount;
        }
      }
    }
  }

  // 1: allocate enhanced habitats only (same habitat type and higher condition score)
  allocateRemaining((baseline, improvement) => {
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;
    if (baselineType != improvementType) {
      return false;
    }
    const baselineCond = baseline.includes('|') ? baseline.split('|')[1] : 'n/a';
    const improvementCond = improvement.includes('|') ? improvement.split('|')[1] : 'n/a';
    return getConditionScore(improvementCond) > getConditionScore(baselineCond);
  });

  // 2: convert low and very low distinctiveness baseline habitats to higher distinctiveness habitats.
  allocateRemaining((baseline, improvement) => {
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const baselineScore = getDistinctivenessScore(baselineType);
    if (baselineScore > 2) {  // 2 is Low
      return false;
    }

    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;
    const improvementScore = getDistinctivenessScore(improvementType);
    return improvementScore > baselineScore;
  });

  // 3: convert medium distinctiveness habitats within the same habitat group
  allocateRemaining((baseline, improvement) => {
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const baselineDistinctiveness = getHabitatDistinctiveness(baselineType);
    if (baselineDistinctiveness != 'Medium') {
      return false;
    }

    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;
    const baselineGroup = getHabitatGroup(baselineType);
    const improvementGroup = getHabitatGroup(improvementType);
    if (baselineGroup != improvementGroup) {
      return false;
    }

    const baselineScore = getDistinctivenessScore(baselineType);
    const improvementScore = getDistinctivenessScore(improvementType);
    return improvementScore >= baselineScore;
  });

  // 4: convert any remaining habitats: only requirement is improved distinctiveness
  allocateRemaining((baseline, improvement) => {
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;
    const baselineScore = getDistinctivenessScore(baselineType);
    const improvementScore = getDistinctivenessScore(improvementType);
    return improvementScore > baselineScore;
  });

  // 5a: allocate any remaining baseline to a "retained" improvement node
  for (const [baselineType, baselineAmount] of remainingBaseline.entries()) {
    if (baselineAmount > 0.01) {
      AllocateHabitat(baselineType, RETAINED_IMPROVEMENT_NODE_NAME, baselineAmount);
    }
  }

  // 5b: allocate any remaining improvements to a "created" baseline node
  for (const [improvementType, improvementAmount] of remainingImprovement) {
    if (improvementAmount > 0.01) {
      AllocateHabitat(CREATED_BASELINE_NODE_NAME, improvementType, improvementAmount);
    }
  }

  data[unit] = {
    baselineHabTotals: siteBaselineHabTotals,
    improvementHabTotals: siteImprovementHabTotals,
    sourceNodeTypes: sourceNodeTypes,
    improvementNodeTypes: improvementNodeTypes,
    aggregatedLinks
  };


  return data;
};

const sortNodesForSankey = (nodes, habTotals, dummyNodeName, dummyNodeFirst) => {

  return Array.from(nodes).sort((keyA, keyB) => {
    if (keyA === dummyNodeName) return dummyNodeFirst ? -1 : 1;
    if (keyB === dummyNodeName) return dummyNodeFirst ? 1 : -1;

    const [typeA, conditionA] = keyA.split('|');
    const [typeB, conditionB] = keyB.split('|');
    const scoreA = getDistinctivenessScore(typeA);
    const scoreB = getDistinctivenessScore(typeB);

    if (scoreA == scoreB) {
      if (typeA == typeB) {
        const condAScore = getConditionScore(conditionA)
        const condBScore = getConditionScore(conditionB)
        return condAScore - condBScore;
      }
      return habTotals.get(typeA) - habTotals.get(typeB);
    }
    else {
      return scoreA - scoreB;
    }
  });
};

const convertSankeySourceDataToGraph = (data) => {
  const nodes = [];
  const nodeLabels = [];
  const nodeColors = [];
  const links = [];
  const linkSources = [];
  const linkTargets = [];
  const linkValues = [];
  const linkColors = [];

  let nodeIndex = 0;

  for (const [unitName, unitData] of Object.entries(data)) {
    const baselineNodeMap = new Map();
    const improvementNodeMap = new Map();

    // Create baseline (source) nodes
    for (const key of sortNodesForSankey(unitData.sourceNodeTypes, unitData.baselineHabTotals, CREATED_BASELINE_NODE_NAME, true)) {
      baselineNodeMap.set(key, nodeIndex);
      const habitatName = key.includes('|') ? key.split('|')[0] : key;
      const conditionName = key.includes('|') ? key.split('|')[1] : '';
      const distinctivenessScore = key === CREATED_BASELINE_NODE_NAME ? 0 : getDistinctivenessScore(habitatName);
      const conditionScore = key === CREATED_BASELINE_NODE_NAME ? 0 : getConditionScore(conditionName);

      const node = { name: habitatName, unit: unitName, condition: conditionName, distinctivenessScore, conditionScore };
      nodes.push(node);

      // Create label with area and unit info (similar to original)
      let label = conditionName.length > 0 ? `[${conditionName}] ${habitatName}` : habitatName;
      nodeLabels.push(label);
      nodeColors.push(getNodeColor(node));

      nodeIndex++;
    }

    // Create improvement (destination) nodes
    for (const key of sortNodesForSankey(unitData.improvementNodeTypes, unitData.improvementHabTotals, RETAINED_IMPROVEMENT_NODE_NAME, false)) {
      improvementNodeMap.set(key, nodeIndex);
      const habitatName = key.includes('|') ? key.split('|')[0] : key;
      const conditionName = key.includes('|') ? key.split('|')[1] : '';
      const distinctivenessScore = key === RETAINED_IMPROVEMENT_NODE_NAME ? 8 : getDistinctivenessScore(habitatName);
      const conditionScore = key === RETAINED_IMPROVEMENT_NODE_NAME ? 3 : getConditionScore(conditionName);

      const node = { name: habitatName, unit: unitName, condition: conditionName, distinctivenessScore, conditionScore };
      nodes.push(node);

      // Create label with area and unit info
      let label = conditionName.length > 0 ? `[${conditionName}] ${habitatName}` : habitatName;
      nodeLabels.push(label);
      nodeColors.push(getNodeColor(node));

      nodeIndex++;
    }

    // Create links
    for (const [linkKey, linkValue] of unitData.aggregatedLinks.entries()) {
      const [unitType, sourceType, improvementType] = linkKey.split('_');
      const sourceIndex = baselineNodeMap.get(sourceType);
      const targetIndex = improvementNodeMap.get(improvementType);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        const sourceNode = nodes[sourceIndex];
        const targetNode = nodes[targetIndex];

        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: linkValue,
          unit: unitName,
          sourceNode,
          targetNode
        });

        linkSources.push(sourceIndex);
        linkTargets.push(targetIndex);
        linkValues.push(linkValue);

        // Create targetColor for link
        const targetColor = getNodeColor(targetNode);
        linkColors.push(targetColor);
      }
    }
  }

  // Calculate total values for nodes (for tooltips)
  const nodeValues = new Array(nodes.length).fill(0);
  links.forEach(link => {
    nodeValues[link.source] += link.value;
    nodeValues[link.target] += link.value;
  });

  // Add values to nodes
  nodes.forEach((node, index) => {
    node.value = nodeValues[index];
  });

  return {
    node: {
      label: nodeLabels,
      color: nodeColors,
    },
    link: {
      source: linkSources,
      target: linkTargets,
      value: linkValues,
      color: linkColors
    },
    // Keep original data for reference
    _originalNodes: nodes,
    _originalLinks: links,
  };
};

export const getHabitatSankeyGraph = (site) => {

  const graphData = {};
  for (const unit of HABITAT_UNIT_TYPES) {
    const data = getHabitatSankeyData(site, unit);
    graphData[unit] = convertSankeySourceDataToGraph(data);
  }

  return graphData;
};

export const getAllHabitatSankeyGraph = (sites) => {

  const collatedData = {}
  for (const unit of HABITAT_UNIT_TYPES) {
    collatedData[unit] = {
      baselineHabTotals: new Map(),
      improvementHabTotals: new Map(),
      sourceNodeTypes: new Set(),
      improvementNodeTypes: new Set(),
      aggregatedLinks: new Map()
    }
  }

  const collateData = (source, target) => {
    // Merge baseline habitat totals (Map: habitat -> total area)
    for (const [habitat, area] of source.baselineHabTotals) {
      target.baselineHabTotals.set(habitat, (target.baselineHabTotals.get(habitat) || 0) + area);
    }

    // Merge improvement habitat totals
    for (const [habitat, area] of source.improvementHabTotals) {
      target.improvementHabTotals.set(habitat, (target.improvementHabTotals.get(habitat) || 0) + area);
    }

    // Merge source node types (add unique values)
    source.sourceNodeTypes.forEach(type => target.sourceNodeTypes.add(type));

    // Merge improvement node types (add unique values)  
    source.improvementNodeTypes.forEach(type => target.improvementNodeTypes.add(type));

    // Merge aggregated links (Map: linkKey -> total allocated amount)
    for (const [linkKey, amount] of source.aggregatedLinks) {
      target.aggregatedLinks.set(linkKey, (target.aggregatedLinks.get(linkKey) || 0) + amount);
    }
  }

  sites.forEach(site => {
    site.habitats = collateAllHabitats(site.habitats);
    site.improvements = collateAllHabitats(site.improvements);

    const siteData = getHabitatSankeyData(site);
    for (const [unitName, unitData] of Object.entries(siteData)) {
      collateData(unitData, collatedData[unitName]);
    }
  });

  const graphData = convertSankeySourceDataToGraph(collatedData);
  graphData.dynamicHeight *= 3;
  return graphData;
}
