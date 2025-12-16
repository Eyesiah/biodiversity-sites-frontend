import { getHabitatDistinctiveness, HABITAT_UNIT_TYPES, calculateImprovementHU, getHabitatGroup, getDistinctivenessScore, getConditionScore } from '@/lib/habitat';

const allocationLoggingEnabled = process.env.ALLOCATION_LOGGING_ENABLED === 'true';

const allocationLogger = (message) => {
  if (allocationLoggingEnabled) {
    console.log(message);
  }
};

// Base colors in HSL for each unit type
const BASE_COLORS = {
  areas: {
    'Cropland': { h: 61, s: 69, l: 51 },
    'Grassland': { h: 91, s: 81, l: 46 },
    'Heathland and shrub': { h: 120, s: 67, l: 27 },
    'Lakes': { h: 162, s: 94, l: 26 },
    'Sparsely vegetated land': { h: 71, s: 72, l: 72 },
    'Urban': { h: 43, s: 51, l: 69 },
    'Wetland': { h: 165, s: 87, l: 33 },
    'Woodland and forest': { h: 120, s: 85, l: 15 },
    'Coastal lagoons': { h: 182, s: 70, l: 22 },
    'Rocky shore': { h: 69, s: 36, l: 67 },
    'Intertidal sediment': { h: 64, s: 28, l: 42 },
    'Coastal saltmarsh': { h: 205, s: 48, l: 51 },
    'Intertidal hard structures': { h: 0, s: 0, l: 67 },
    'Watercourse footprint': { h: 0, s: 1, l: 36 },
  },
  hedgerows: { h: 30, s: 32, l: 36 }, // Yellow
  watercourses: { h: 202, s: 75, l: 30 }, // Blue
  trees: { h: 135, s: 32, l: 36 }  // burnt orange
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

  // Get distinctiveness band
  const band = DISTINCTIVENESS_BANDS[distinctivenessScore] || DISTINCTIVENESS_BANDS[3];

  // Map condition within the band (higher condition = darker)
  const conditionNormalized = conditionScore / 3; // 0 to 3
  const lightness = band.min + (1 - conditionNormalized) * (band.max - band.min);

  // Get base color for unit
  let base = {};
  if (unit == 'areas') {
    base = BASE_COLORS.areas[node.habGroup] || BASE_COLORS.areas.Grassland;
  } else {
    base = BASE_COLORS[unit] || BASE_COLORS.trees;
  }

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

export function processSiteForListView(site) {
  const baselineHUs = [...site.habitats.areas, ...site.habitats.hedgerows, ...site.habitats.watercourses, ...site.habitats.trees].reduce((acc, h) => acc + h.HUs, 0)
  const allImprovements = [...site.improvements.areas, ...site.improvements.hedgerows, ...site.improvements.watercourses, ...site.improvements.trees]
  const createdHUs = allImprovements.reduce((acc, h) => acc + h.subRows.filter(r => r.interventionType == 'Creation').reduce((sAcc, s) => sAcc + s.HUs, 0), 0);
  const enhancedHUs = allImprovements.reduce((acc, h) => acc + h.subRows.filter(r => r.interventionType == 'Enhanced').reduce((sAcc, s) => sAcc + s.HUs, 0), 0);
  const huGain = allImprovements.reduce((acc, h) => acc + (h.HUs - h.baselineHUs), 0);
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
    baselineHUs: baselineHUs,
    createdHUs: createdHUs,
    enhancedHUs: enhancedHUs,
    baselineAreaSize: site.habitats.areas.reduce((acc, h) => acc + h.size, 0),
    improvementAreaSize: site.improvements.areas.reduce((acc, h) => acc + h.size, 0),
    huGain: huGain,
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
      const processHabitats = (habitats) => {
        if (!habitats) return;
        habitats.forEach(h => {
          baselineParcels += h.parcels;
        });
      };
      
      for (const unit of HABITAT_UNIT_TYPES) {
        processHabitats(site.habitats[unit]);
      }

      baselineAreaSize += site.habitats.areas.reduce((acc, hab) => acc + hab.size, 0);
      baselineAreaSize += site.habitats.trees.reduce((acc, hab) => acc + hab.size, 0);
      baselineWatercourseSize += site.habitats.watercourses.reduce((acc, hab) => acc + hab.size, 0);
      baselineHedgerowSize += site.habitats.hedgerows.reduce((acc, hab) => acc + hab.size, 0);
    }

    if (site.improvements) {
      const processImprovementHabitats = (habitats, isArea) => {
        if (!habitats) return;
        habitats.forEach(h => {      
          improvementsParcels += h.parcels;
        });
      };
      for (const unit of HABITAT_UNIT_TYPES) {
        processImprovementHabitats(site.improvements[unit]);
      }

      improvementsAreaSize += site.improvements.areas.reduce((acc, hab) => acc + hab.size, 0);
      improvementsAreaSize += site.improvements.trees.reduce((acc, hab) => acc + hab.size, 0);
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
        if (alloc.habitats) {
          for (const unit of HABITAT_UNIT_TYPES) {
            processHabitats(alloc.habitats[unit]);
          }
        }
      });
    }
  });

  const processedSites = processSitesForListView(allSites);
  const totalSites = processedSites.length;
  const totalArea = processedSites.reduce((acc, site) => acc + (site.siteSize || 0), 0);
  const totalBaselineHUs = processedSites.reduce((acc, site) => acc + (site.baselineHUs || 0), 0);
  const totalCreatedHUs = processedSites.reduce((acc, site) => acc + (site.createdHUs || 0), 0);
  const totalEnhancedHUs = processedSites.reduce((acc, site) => acc + (site.enhancedHUs || 0), 0);
  const totalHUGain = processedSites.reduce((acc, site) => acc + (site.huGain || 0), 0);

  return {
    processedSites,
    summary: {
      totalSites,
      totalArea,
      totalBaselineHUs,
      totalCreatedHUs,
      totalEnhancedHUs,
      totalHUGain,
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

const CREATED_BASELINE_NODE_NAME = '[CREATION]';

export const getHabitatAssignmentData = (site, unit) => {

  const aggregatedLinks = new Map();

  let baselineHabitats = site?.habitats[unit];
  let improvementHabitats = site?.improvements[unit]

  if ((baselineHabitats == null || baselineHabitats.length == 0) && (improvementHabitats == null || improvementHabitats.length == 0)) {
    return null;
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
      if (habitat.size > 0) {
        siteBaselineHabTotals.set(habitat.type, (siteBaselineHabTotals.get(habitat.type) || 0) + habitat.size);
        const subrows = habitat.subRows || [habitat];
        for (const sub of subrows) {
          const key = `${habitat.type}|${sub.condition}`;
          siteBaselineTotals.set(key, (siteBaselineTotals.get(key) || 0) + sub.size);
        }
      }
    }
  }


  // Aggregate improvement area for the current site
  if (improvementHabitats) {
    for (const habitat of improvementHabitats) {
      siteImprovementHabTotals.set(habitat.type, (siteImprovementHabTotals.get(habitat.type) || 0) + habitat.size);
      const subrows = habitat.subRows || [habitat];
      for (const sub of subrows) {
        const key = `${habitat.type}|${sub.condition}|${sub.interventionType}`;
        siteImprovementTotals.set(key, (siteImprovementTotals.get(key) || 0) + sub.size);
      }
    }
  }


  const remainingBaseline = new Map(siteBaselineTotals);
  const remainingImprovement = new Map(siteImprovementTotals);

    allocationLogger(`ALLOCATION START: ${site.referenceNumber} - ${unit}`)

  const AllocateHabitat = (baseline, improvement, allocatedAmount) => {
    // add to the sets of types
    sourceNodeTypes.add(baseline);
    improvementNodeTypes.add(improvement);

    // increment the amount allocated to this link
    const linkKey = `${unit}_${baseline}_${improvement}`;
    const newAmount = (aggregatedLinks.get(linkKey) || 0) + allocatedAmount;
    aggregatedLinks.set(linkKey, newAmount);

    allocationLogger(`ALLOCATION: ${baseline} -> ${improvement} x ${allocatedAmount}`)

    // reduce the remaining amounts
    if (baseline != CREATED_BASELINE_NODE_NAME) {
      const newRemainingBaseline = (remainingBaseline.get(baseline) || 0) - allocatedAmount;
      if (newRemainingBaseline < 0) throw new Error('negative remaining baseline');
      remainingBaseline.set(baseline, newRemainingBaseline);
    }
    if (!improvement.endsWith('|Retained')) {
      const newRemainingImprovement = (remainingImprovement.get(improvement) || 0) - allocatedAmount;
      if (newRemainingImprovement < 0) throw new Error('negative remaining improvement');
      remainingImprovement.set(improvement, newRemainingImprovement);
    }
  };

  // sort habitats by combined distinctiveness then condition score to allocate the lowest first (poorer quality habitats first)
  const habitatSorter = (preferredMinSize = 0) => {
    return ([keyA, remainingSizeA], [keyB, remainingSizeB]) => {

      if (remainingSizeA >= preferredMinSize != remainingSizeB >= preferredMinSize) {
        // when sorting improvements, we prefer ones that are at least as big as the baseline being allocated
        // so those should go at the start
        return remainingSizeA < preferredMinSize ? 1 : -1;
      }

      const [typeA, conditionA, enhacementA] = keyA.split('|');
      const [typeB, conditionB, enhacementB] = keyB.split('|');

      if (enhacementA != null && enhacementB != null && enhacementA != enhacementB) {
        // sort improvements by enhanced first
        return enhacementA == 'Enhanced' ? -1 : 1;
      }

      const scoreA = getDistinctivenessScore(typeA);
      const scoreB = getDistinctivenessScore(typeB);
      if (scoreA == scoreB) {
        const condScoreA = getConditionScore(conditionA);
        const condScoreB = getConditionScore(conditionB);
        if (condScoreA == condScoreB) {
          // for habitats with the same scores
          if (preferredMinSize == 0) {
            // when sorting baseline, sort by largest remaining to allocate first
            return remainingSizeB - remainingSizeA;
          } else {
            // when sorting improvements, if the sizes are above the min, sort by smallest first
            if (remainingSizeA >= preferredMinSize) {
              return remainingSizeA - remainingSizeB;
            } else {
              // otherwise sort by smallest first
              return remainingSizeB - remainingSizeA;
            }
          }
        } else {
          return condScoreA - condScoreB;
        }
      } else {
        return scoreA - scoreB;
      }
    }
  }

  // Allocate remaining baseline to improvements, preferring large blocks
  const allocateRemaining = (isConversionPossiblePredicate) => {
    const sortedBaseline = Array.from(remainingBaseline.entries())
      .sort(habitatSorter());
    for (const [baselineType, baselineAmount] of sortedBaseline) {
      if (baselineAmount <= 0) continue;
      let remainingToAllocate = baselineAmount;

      // Sort remaining improvements also
      const sortedImprovements = Array.from(remainingImprovement.entries())
        .filter(([, amount]) => amount > 0)
        .sort(habitatSorter(remainingToAllocate));

      const baselineHabType = baselineType.includes('|') ? baselineType.split('|')[0] : baselineType;
      const baselineCond = baselineType.includes('|') ? baselineType.split('|')[1] : 'n/a';
      const baselineBroadHabType = getHabitatGroup(baselineHabType);
      const baselineDistinctiveness = getDistinctivenessScore(baselineHabType);

      for (const [improvementType, improvementAmount] of sortedImprovements) {
        if (remainingToAllocate <= 0.0001 || improvementAmount <= 0.0001 || !isConversionPossiblePredicate(baselineType, improvementType, remainingToAllocate, improvementAmount)) continue;

        const improvementHabType = improvementType.includes('|') ? improvementType.split('|')[0] : improvementType;
        const improvementCond = improvementType.includes('|') ? improvementType.split('|')[1] : 'n/a';
        const improvementBroadHabType = getHabitatGroup(improvementHabType);
        const improvementDistinctiveness = getDistinctivenessScore(improvementHabType);

        // enhancments can only ever be allocated to baseline habitats of the same type with worse condition, OR of the same broad type and worse distinctiveness
        const enhancementType = improvementType.split('|')[2];
        if (enhancementType == 'Enhanced') {
          if (baselineHabType == improvementHabType) {
            // same habitat: only allowed if condition improves
            if (getConditionScore(improvementCond) <= getConditionScore(baselineCond)) {
              continue;
            }
          } else {
            // different habitat: only allowed if same broad habitat and distinctiveness improves
            const sameBroadHab = baselineBroadHabType == improvementBroadHabType;
            const distinctivenessImproves = improvementDistinctiveness > baselineDistinctiveness;
            if (!sameBroadHab || !distinctivenessImproves) {
              continue;
            }
          }
        } else {
          // creation refers to the broad habitat type changing
          if (baselineBroadHabType == improvementBroadHabType) {
            // BUT: we allow a creation to be used within the same broad habitat type if the baseline has distinctiveness < medium
            // this is because practically, the change from eg 'modified grassland' to 'other neutral grassland' is often treated as a creation
            if (baselineDistinctiveness >= 4) {
              continue;
            }
          }
        }

        const allocatedAmount = Math.min(remainingToAllocate, improvementAmount);

        // must also be an HU gain
        const huData = calculateImprovementHU(allocatedAmount, improvementHabType, improvementCond, enhancementType, baselineHabType, baselineCond);
        if (huData.HUs == 0 || huData.HUs <= (huData.baselineHUs || 0)) {
          continue;
        }

        if (allocatedAmount > 0) {
          AllocateHabitat(baselineType, improvementType, allocatedAmount);
          remainingToAllocate -= allocatedAmount;
        }
      }
    }
  }

  allocationLogger(`ALLOCATION 0: same size`);
  allocateRemaining((baseline, improvement, baselineSize, improvementSize) => {
    if (Math.abs(baselineSize - improvementSize) > 0.01) {
      return false;
    }
    
    // only allow if basic conditions are met: either condition gain or distinctiveness gain
    const baselineCond = baseline.includes('|') ? baseline.split('|')[1] : 'n/a';
    const improvementCond = improvement.includes('|') ? improvement.split('|')[1] : 'n/a';
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;

    if (baselineType == improvementType) {
      return getConditionScore(improvementCond) > getConditionScore(baselineCond);
    } else {
      const improvementScore = getDistinctivenessScore(improvementType);
      const baselineScore = getDistinctivenessScore(baselineType);
      return improvementScore > baselineScore || (improvementScore == baselineScore && getConditionScore(improvementCond) > getConditionScore(baselineCond));
    }
  });

  // 1: allocate enhanced habitats only (same habitat type and higher condition score)
  allocationLogger(`ALLOCATION 1: Enhanced, same type`);
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
  // 2a: first only if condition is not reduced
  allocationLogger(`ALLOCATION 2a: low/very low baseline distinctiveness (no condition reduction)`);
  allocateRemaining((baseline, improvement) => {
    const [baselineType, baselineCondition] = baseline.split('|');
    const baselineScore = getDistinctivenessScore(baselineType);
    if (baselineScore > 2) {  // 2 is Low
      return false;
    }

    const [improvementType, improvementCondition] = improvement.split('|');
    if (getConditionScore(baselineCondition) > getConditionScore(improvementCondition)) {
      return false;
    }    
    const improvementScore = getDistinctivenessScore(improvementType);
    return improvementScore > baselineScore;
  });
  
  allocationLogger(`ALLOCATION 2b: low/very low baseline distinctiveness (allow condition reduction)`);
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
  allocationLogger(`ALLOCATION 3: medium baseline distinctiveness in same group`);
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

  // 4a: convert any remaining habitats: first when there is improved distinctiveness
  allocationLogger(`ALLOCATION 4a: improved distinctiveness`);
  allocateRemaining((baseline, improvement) => {
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;
    const baselineScore = getDistinctivenessScore(baselineType);
    const improvementScore = getDistinctivenessScore(improvementType);
    return improvementScore > baselineScore;
  });

  // 4b: convert any remaining habitats: then allow same distinctiveness
  allocationLogger(`ALLOCATION 4b: same distinctiveness`);
  allocateRemaining((baseline, improvement) => {
    const baselineType = baseline.includes('|') ? baseline.split('|')[0] : baseline;
    const improvementType = improvement.includes('|') ? improvement.split('|')[0] : improvement;
    const baselineScore = getDistinctivenessScore(baselineType);
    const improvementScore = getDistinctivenessScore(improvementType);
    return improvementScore >= baselineScore;
  });

  // 5a: allocate any remaining baseline to a "retained" improvement node
  allocationLogger(`ALLOCATION 5a: retained`);
  for (const [baselineType, baselineAmount] of remainingBaseline.entries()) {
    if (baselineAmount > 0.01) {
      AllocateHabitat(baselineType, `${baselineType}|Retained`, baselineAmount);
    }
  }

  // 5b: allocate any remaining improvements to a "created" baseline node
  allocationLogger(`ALLOCATION 5a: created`);
  for (const [improvementType, improvementAmount] of remainingImprovement) {
    if (improvementAmount > 0.01) {
      AllocateHabitat(CREATED_BASELINE_NODE_NAME, improvementType, improvementAmount);
    }
  }

  return {
    baselineHabTotals: siteBaselineHabTotals,
    improvementHabTotals: siteImprovementHabTotals,
    sourceNodeTypes: sourceNodeTypes,
    improvementNodeTypes: improvementNodeTypes,
    aggregatedLinks
  };;
};

const sortNodesForSankey = (nodes, habTotals, dummyNodeName) => {

  return Array.from(nodes).sort((keyA, keyB) => {
    if (keyA === dummyNodeName) return -1;
    if (keyB === dummyNodeName) return 1;

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

const convertSankeySourceDataToGraph = (unitName, unitData) => {
  const nodes = [];
  const nodeLabels = [];
  const nodeColors = [];
  const links = [];
  const linkSources = [];
  const linkTargets = [];
  const linkValues = [];
  const linkColors = [];

  let nodeIndex = 0;

  // Create baseline (source) nodes
  const baselineNodeMap = new Map();
  for (const key of sortNodesForSankey(unitData.sourceNodeTypes, unitData.baselineHabTotals, CREATED_BASELINE_NODE_NAME)) {
    baselineNodeMap.set(key, nodeIndex);
    const habitatName = key.includes('|') ? key.split('|')[0] : key;
    const conditionName = key.includes('|') ? key.split('|')[1] : '';
    const distinctivenessScore = key === CREATED_BASELINE_NODE_NAME ? 0 : getDistinctivenessScore(habitatName);
    const conditionScore = key === CREATED_BASELINE_NODE_NAME ? 0 : getConditionScore(conditionName);

    const node = { name: habitatName, unit: unitName, condition: conditionName, distinctivenessScore, conditionScore, habGroup: getHabitatGroup(habitatName) };
    nodes.push(node);

    // Create label with area and unit info (similar to original)
    let label = conditionName.length > 0 ? `[${conditionName}] ${habitatName}` : habitatName;
    nodeLabels.push(label);
    nodeColors.push(getNodeColor(node));

    nodeIndex++;
  }

  // Create improvement (destination) nodes
  const improvementNodeMap = new Map();
  const improvementNodeMapSimple = new Map();
  for (const key of sortNodesForSankey(unitData.improvementNodeTypes, unitData.improvementHabTotals)) {
    const habitatName = key.includes('|') ? key.split('|')[0] : key;
    const conditionName = key.includes('|') ? key.split('|')[1] : '';

    // different enhancement types of the same habitat&condition tuple share the same target node
    const simpleKey = `${habitatName}|${conditionName}`;
    const existingIndex = improvementNodeMapSimple.get(simpleKey);
    if (existingIndex) {
      improvementNodeMap.set(key, existingIndex);
    } else {
      improvementNodeMap.set(key, nodeIndex);
      improvementNodeMapSimple.set(simpleKey, nodeIndex);

      const distinctivenessScore = getDistinctivenessScore(habitatName);
      const conditionScore = getConditionScore(conditionName);

      const node = { name: habitatName, unit: unitName, condition: conditionName, distinctivenessScore, conditionScore, habGroup: getHabitatGroup(habitatName) };
      nodes.push(node);

      // Create label with area and unit info
      let label = conditionName.length > 0 ? `[${conditionName}] ${habitatName}` : habitatName;
      nodeLabels.push(label);
      nodeColors.push(getNodeColor(node));

      nodeIndex++;
    }
  }

  // Create links
  for (const [linkKey, linkValue] of unitData.aggregatedLinks.entries()) {
    const [unitType, sourceType, improvementType] = linkKey.split('_');
    const sourceIndex = baselineNodeMap.get(sourceType);
    const targetIndex = improvementNodeMap.get(improvementType);

    if (sourceIndex !== undefined && targetIndex !== undefined) {
      const sourceNode = nodes[sourceIndex];
      const targetNode = nodes[targetIndex];

      const enhancementType = improvementType.includes('|') ? improvementType.split('|')[2] : '';

      links.push({
        source: sourceIndex,
        target: targetIndex,
        value: linkValue,
        unit: unitName,
        enhancement: enhancementType,
        sourceNode,
        targetNode
      });

      linkSources.push(sourceIndex);
      linkTargets.push(targetIndex);
      linkValues.push(linkValue);

      // Create gradient colors for link
      //const sourceColor = getNodeColor(sourceNode);
      const targetColor = getNodeColor(targetNode);
      linkColors.push(targetColor);
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
    const data = getHabitatAssignmentData(site, unit);
    if (data) {
      graphData[unit] = convertSankeySourceDataToGraph(unit, data);
    }
  }

  return graphData;
};
