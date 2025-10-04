import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const TEMPORAL_RISK_DISCOUNT = 0.035; // 3.5%
const TEMPORAL_RISK_MAX_YEARS = 30;
const TEMPORAL_RISK_MULTIPLIER_OVER_MAX_YEARS = 0.32    // hardcoded when over the max, ignores the formula

function loadHabitatData() {
  const habitatDataPath = path.join(process.cwd(), 'data', 'BNG-Habitat-Data.csv');
  const habitatDataCsv = fs.readFileSync(habitatDataPath, 'utf8');

  const habitatMap = new Map();

  const results = Papa.parse(habitatDataCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    const habitatType = row['Habitat Type'];
    let distinctiveness = row['Distinctiveness Category'];
    if (habitatType && distinctiveness) {
      distinctiveness = distinctiveness.trim();
      const distinctivenessScore = row['Distinctiveness Score'] || 1;
      const difficultyCreationMultiplier = row['Technical Difficulty Creation Multiplier'];

      // extract the time to target for various condition types
      const timeToTargetMap = new Map();
      for (const propName of Object.keys(row)) {
        const lowerName = propName.toLowerCase();
        if (lowerName.endsWith('time to target')) {
          const conditionType = lowerName.replace('time to target', '').trim();
          timeToTargetMap.set(conditionType, row[propName]);
        }
      }

      habitatMap.set(habitatType.trim().toLowerCase(), {
        distinctiveness: distinctiveness,
        score: distinctivenessScore,
        timeToTarget: timeToTargetMap,
        difficultyCreationMultiplier: difficultyCreationMultiplier
      });
    }
  });

  return habitatMap;
}

function calculateRiskMultipliers() {
  // each year's multiplier is the previous year reduced by the discount
  const multipliers = [1];
  while (multipliers.length < TEMPORAL_RISK_MAX_YEARS + 1) {
    const prevVal = multipliers[multipliers.length - 1];
    const nextVal = prevVal - (prevVal * TEMPORAL_RISK_DISCOUNT);
    multipliers.push(nextVal);
  }
  multipliers.push(TEMPORAL_RISK_MULTIPLIER_OVER_MAX_YEARS);
  return multipliers;
}

const habitatMap = loadHabitatData();
const riskMultipliers = calculateRiskMultipliers();

/**
 * Get the distinctiveness type for a particular habitat type
 * @param {string} habitat The habitat type.
 * @returns {string} The distinctiveness.
 */
export function getHabitatDistinctiveness(habitat) {
  if (typeof habitat !== 'string') {
    console.error('getHabitatDistinctiveness: "habitat" must be a string.');
    return 'N/A';
  }
  return habitatMap.get(habitat.toLowerCase())?.distinctiveness || 'N/A';
}

/**
 * Get the score for a particular habitat.
 * @param {string} habitat The habitat type.
 * @returns {number} The score.
 */
export function getDistinctivenessScore(habitat) {
  if (typeof habitat !== 'string') {
    console.error('getHabitatDistinctiveness: "habitat" must be a string.');
    return 0;
  }
  return habitatMap.get(habitat.toLowerCase())?.score || 0;
}

const conditionScores = {
  'good': 3,
  'fairly good': 2.5,
  'moderate': 2,
  'fairly poor': 1.5,
  'poor': 1,
  'condition assessment n/a': 1,
  'n/a – other': 0,
  'n/a - other': 0,
}

/**
 * Get the score for a particular habitat's condition.
 * @param {string} condition The condition of the habitat parcel.
 * @returns {number} The score.
 */
export function getConditionScore(condition) {
  if (typeof condition !== 'string') {
    console.error('getConditionScore: "condition" must be a string.');
    return 1;
  }

  return conditionScores[condition.toLowerCase().trim()] || 0;
}

/**
 * Calculates the baseline Habitat Units (HU).
 * @param {number} size The area or length of the habitat parcel.
 * @param {string} habitat The type of habitat.
 * @param {string} condition The condition of the habitat parcel.
 * @returns {number} The calculated baseline Habitat Units.
 */
export function calculateBaselineHU(size, habitat, condition) {
  if (typeof size !== 'number' || isNaN(size) ||
    typeof habitat !== 'string' ||
    typeof condition !== 'string') {
    console.error('calculateBaselineHU: Invalid parameter type.', { size, habitat, condition });
    return 0;
  }

  //Baseline parcels is as per the standard formula
  // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low).
  const strategicSignificanceScore = 1.0;
  return size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore;
}

export function getTimeToTarget(habitat, condition) {
  
  const timeToTargetData = habitatMap.get(habitat.toLowerCase())?.timeToTarget;
  return timeToTargetData?.get(condition.toLowerCase().trim());
}

export function calcTemporalRisk(habitat, condition) {

  // first find the "time-to-target condition" for this habitat and condition
  // then if its a valid time, look it up in the pre-calculated riskMultipliers to apply the discount

  const timeToTarget = getTimeToTarget(habitat, condition);
  if (timeToTarget == "Not Possible") {
    return 0;
  }
  else if (timeToTarget == null) {
    if (condition == "Unable to Map") {
      return 1;
    }
    else {
      console.error(`No time to target found for habitat '${habitat}' and condition '${condition}'`);
      return 0;
    }
  }
  else if (timeToTarget == "30+") {
    return riskMultipliers[riskMultipliers.length - 1];
  }
  else {
    const timeToTargetYears = Number(timeToTarget);
    if (!isNaN(timeToTargetYears)) {
      if (timeToTargetYears < riskMultipliers.length) {
        return riskMultipliers[timeToTargetYears];
      }
      else {
        return riskMultipliers[riskMultipliers.length - 1];
      }
    }
    else {
      console.error(`Unknown time to target type ${timeToTarget}`);
      return 0;
    }
  }
}

export function calcDifficultyFactor(habitat) {
  return habitatMap.get(habitat.toLowerCase())?.difficultyCreationMultiplier ?? 1;
}

export function calculateImprovementHU(size, habitat, condition, improvementType) {
  if (typeof size !== 'number' || isNaN(size) ||
    typeof habitat !== 'string' ||
    typeof condition !== 'string' ||
    typeof improvementType !== 'string') {
    console.error('calculateImprovementHU: Invalid parameter type.', { size, habitat, condition });
    return 0;
  }

  if (habitatMap.get(habitat.toLowerCase()) == null) {
    console.error(`calculateImprovementHU: Unknown habitat type '${habitat}'`);
    return 0;
  }

  if (improvementType.toLowerCase() == 'creation') {
    // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel- low) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (1 as this site is being used by an off-site provider)
    const strategicSignificanceScore = 1.0;
    const spatialRisk = 1.0;

    return size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore * calcTemporalRisk(habitat, condition) * calcDifficultyFactor(habitat) * spatialRisk;
  }
  else if (improvementType.toLowerCase() == 'enhanced') {
    // HU is not computed because no connection is made back to the baseline parcel.
    return 0;
  }
  else {
    console.error(`Unknown improvement type ${improvementType}`);
    return 0;
  }
}

export const processHabitatConditions = (habitats) => {
  // fix for https://github.com/Eyesiah/biodiversity-sites-frontend/issues/3
  habitats.forEach(habitat => {
    if (habitat.condition == null || habitat.condition == "") {
      habitat.condition = "N/A - Other"
    }
  });
}

export const processHabitatSubTypes = (habitats) => {
  habitats.forEach(habitat => {
    const typeParts = habitat.type.split(' - ');
    habitat.type = (typeParts.length > 1 ? typeParts[1] : habitat.type).trim();
  });
}

const processBaselineHabitats = (habitats) => {
  // baseline habitats need their distinctiveness rating gathered and HUs calculated
  habitats.forEach(habitat => {
    habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
    habitat.HUs = calculateBaselineHU(habitat.size, habitat.type, habitat.condition)
  });
}

const processImprovementHabitats = (habitats) => {
  // baseline habitats need their distinctiveness rating gathered and HUs calculated
  habitats.forEach(habitat => {
    habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
    habitat.HUs = calculateImprovementHU(habitat.size, habitat.type, habitat.condition, habitat.interventionType);
  });
}

export const processSiteHabitatData = (site) => {
  // Pre-process baseline habitats
  if (site.habitats) {
    if (site.habitats.areas) {
      // areas first need their sub-type processed out
      processHabitatSubTypes(site.habitats.areas)
      processHabitatConditions(site.habitats.areas);
      processBaselineHabitats(site.habitats.areas);
    }
    if (site.habitats.hedgerows) {
      processHabitatConditions(site.habitats.hedgerows);
      processBaselineHabitats(site.habitats.hedgerows);
    }
    if (site.habitats.watercourses) {
      processHabitatConditions(site.habitats.watercourses);
      processBaselineHabitats(site.habitats.watercourses);
    }
  }

  if (site.improvements) {
    if (site.improvements?.areas) {
      // areas need their sub-type processed out
      processHabitatSubTypes(site.improvements.areas);
      processHabitatConditions(site.improvements.areas);
      processImprovementHabitats(site.improvements.areas)
    }
    if (site.improvements?.hedgerows) {
      processHabitatConditions(site.improvements.hedgerows);
      processImprovementHabitats(site.improvements.hedgerows)
    }
    if (site.improvements?.watercourses) {
      processHabitatConditions(site.improvements.watercourses);
      processImprovementHabitats(site.improvements.watercourses)
    }
  }

  if (site.allocations) {
    site.allocations.forEach(alloc => {
      // areas need subtypes processed out
      processHabitatSubTypes(alloc.habitats.areas);

      const allHabitats = [
        ...(alloc.habitats.areas || []),
        ...(alloc.habitats.hedgerows || []),
        ...(alloc.habitats.watercourses || [])
      ];
      processHabitatConditions(allHabitats);
      allHabitats.forEach(habitat => {
        habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
      });
    })
  }
}

export function getAllHabitats() {
  return Array.from(habitatMap.keys());
}

export function getAllConditions() {
  return Object.keys(conditionScores);
}

// Helper function to collate habitat data
export const collateHabitats = (habitats, isImprovement) => {
  if (!habitats) return [];

  const collated = habitats.reduce((acc, habitat) => {
    const key = habitat.type;
    if (!acc[key]) {
      acc[key] = {
        type: habitat.type,
        distinctiveness: habitat.distinctiveness,
        parcels: 0,
        area: 0,
        HUs: 0,
        subRows: {},
      };
    }
    acc[key].parcels += 1;
    acc[key].area += habitat.size;
    acc[key].HUs += habitat.HUs;
    
    if (habitat.site) {
      if (acc[key].sites == null) {
        acc[key].sites = []
      }
      if (!acc[key].sites.includes(habitat.site)) {
        acc[key].sites.push(habitat.site);
      }
    }

    const subKey = isImprovement ? `${habitat.interventionType}-${habitat.condition}` : habitat.condition;
    if (!acc[key].subRows[subKey]) {
      acc[key].subRows[subKey] = {
        condition: habitat.condition,
        interventionType: habitat.interventionType,
        parcels: 0,
        area: 0,
        HUs: 0,
      };
    }
    acc[key].subRows[subKey].parcels += 1;
    acc[key].subRows[subKey].area += habitat.size;
    acc[key].subRows[subKey].HUs += habitat.HUs;

    return acc;
  }, {});

  return Object.values(collated).map(habitat => ({
    ...habitat,
    subRows: Object.values(habitat.subRows),
  }));
};

export const collateAllHabitats = (habObj, isImprovement) => {
  return {
    areas: collateHabitats(habObj.areas, isImprovement),
    hedgerows: collateHabitats(habObj.hedgerows, isImprovement),
    watercourses: collateHabitats(habObj.watercourses, isImprovement)
  }
}
