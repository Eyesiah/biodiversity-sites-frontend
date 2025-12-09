import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { normalizeBodyName, slugify } from '@/lib/format'

const CALC_ENHANCEMENT_HUS = true;

function loadTemporalMultipliers() {
  const csvPath = path.join(process.cwd(), 'data', 'Temporal-Multipliers.csv');
  const csvData = fs.readFileSync(csvPath, 'utf8');

  const multiplierMap = new Map();

  const results = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    const year = row['Year'].trim();
    const multiplier = row['Time to target Multiplier'].trim();

    if (year && multiplier) {
      if (multiplier.toLowerCase() === 'n/a') {
        multiplierMap.set(year, null);
      } else {
        multiplierMap.set(year, parseFloat(multiplier));
      }
    }
  });

  return multiplierMap;
}

function loadEnhancementMultipliers() {
  const csvPath = path.join(process.cwd(), 'data', 'Temporal-Enhancement-Multipliers.csv');
  const csvData = fs.readFileSync(csvPath, 'utf8');

  const enhancementMap = new Map();

  const results = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    const broadHabitat = row['Broad Habitat']?.trim();
    const habitat = row['Habitat']?.trim();

    if (broadHabitat && habitat) {
      const key = `${broadHabitat}-${habitat}`;
      // Store the entire row for lookup, including distinctiveness from column C
      enhancementMap.set(key, row);
    }
  });

  return enhancementMap;
}

const temporalMultipliers = loadTemporalMultipliers();
const enhancementMultipliers = loadEnhancementMultipliers();


function loadLPAData() {
  const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const rawLpas = JSON.parse(jsonData);

  const lpas = rawLpas
    // Only include English LPAs
    .filter((lpa) => lpa.id && lpa.id.startsWith('E'))
    .map((lpa) => ({
      id: lpa.id,
      name: lpa.name,
      adjacents: lpa.adjacents || [],
      size: lpa.size / 10000,
      adjacentsCount: lpa.adjacents ? lpa.adjacents.length : 0
    }));

  const lpaMap = new Map();
  lpas.forEach(lpa => lpaMap.set(slugify(normalizeBodyName(lpa.name)), lpa));

  return lpaMap;
}

const lpaData = loadLPAData();

export function getLPAData() {
  return lpaData;
}

function loadNCAData() {
  const jsonPath = path.join(process.cwd(), 'data', 'NCAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const rawNcas = JSON.parse(jsonData);

  // Convert size from square meters to hectares
  rawNcas.forEach(nca => {
    nca.size = nca.size / 10000;
    if (nca.adjacents) {
      nca.adjacents.forEach(adj => adj.size = adj.size / 10000);
    }
  });

  const ncaMap = new Map();
  rawNcas.forEach(nca => ncaMap.set(slugify(normalizeBodyName(nca.name)), nca));

  return ncaMap;
}

const ncaData = loadNCAData();

export function getNCAData() {
  return ncaData;
}

export const calcSpatialRiskCategory = (alloc, site) => {

  const siteLPA = slugify(normalizeBodyName(site.lpaName));
  const allocLPA = slugify(normalizeBodyName(alloc.localPlanningAuthority));
  const siteNCA = slugify(normalizeBodyName(site.ncaName));
  const allocNCA = slugify(normalizeBodyName(alloc.nca));

  if (siteLPA && allocLPA) {
    if (siteLPA == allocLPA) {
      return {
        cat: 'Within',
        from: 'LPA'
      }
    }
  }
  if (siteNCA && allocNCA) {
    if (siteNCA == allocNCA) {
      return {
        cat: 'Within',
        from: 'NCA'
      }
    }
  }

  if (siteLPA && allocLPA) {
    const adjacentLPAs = lpaData.get(siteLPA)?.adjacents || [];
    if (adjacentLPAs.find(alpa => allocLPA == slugify(normalizeBodyName(alpa.name)))) {
      return {
        cat: 'Neighbouring',
        from: 'LPA'
      }
    }
  }
  if (siteNCA && allocNCA) {
    const adjacentNCAs = ncaData.get(siteNCA)?.adjacents || [];
    if (adjacentNCAs.find(anca => allocNCA == slugify(normalizeBodyName(anca.name)))) {
      return {
        cat: 'Neighbouring',
        from: 'NCA'
      }
    }
  }

  return { cat: 'Outside' };
}

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
    const habitatType = row['Habitat Type']?.trim();
    let distinctiveness = row['Distinctiveness Category']?.trim();
    if (habitatType && distinctiveness) {
      distinctiveness = distinctiveness.trim();
      const distinctivenessScore = Number(row['Distinctiveness Score']) || 1;
      const difficultyCreationMultiplier = row['Technical Difficulty Creation Multiplier']?.trim();
      const group = row['Habitat Group']?.trim();

      // extract the time to target for various condition types
      const timeToTargetMap = new Map();
      for (const propName of Object.keys(row)) {
        const lowerName = propName.toLowerCase();
        if (lowerName.endsWith('time to target')) {
          const conditionType = lowerName.replace('time to target', '').trim();
          timeToTargetMap.set(conditionType, row[propName]?.trim());
        }
      }

      habitatMap.set(habitatType.trim().toLowerCase(), {
        distinctiveness: distinctiveness,
        score: distinctivenessScore,
        timeToTarget: timeToTargetMap,
        difficultyCreationMultiplier: difficultyCreationMultiplier,
        group: group
      });
    }
  });

  return habitatMap;
}

const habitatMap = loadHabitatData();

/**
 * Get the group type for a particular habitat type
 * @param {string} habitat The habitat type.
 * @returns {string} The broad habitat group.
 */
export function getHabitatGroup(habitat) {
  if (typeof habitat !== 'string') {
    console.error('getHabitatGroup: "habitat" must be a string.');
    return 'N/A';
  }
  return habitatMap.get(habitat.toLowerCase())?.group || 'N/A';
}

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
 * @param {number} strategicSignificanceScore the Strategic significance score (defaults to 1 which is Low)
 * @returns {number} The calculated baseline Habitat Units.
 */
export function calculateBaselineHU(size, habitat, condition, strategicSignificanceScore = 1.0) {
  if (typeof size !== 'number' || isNaN(size) ||
    typeof strategicSignificanceScore !== 'number' || isNaN(strategicSignificanceScore) ||
    typeof habitat !== 'string' ||
    typeof condition !== 'string') {
    console.error('calculateBaselineHU: Invalid parameter type.', { size, habitat, condition, strategicSignificanceScore });
    return 0;
  }

  //Baseline parcels is as per the standard formula
  // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low).
  return size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore;
}

export function getTimeToTarget(habitat, condition) {

  const timeToTargetData = habitatMap.get(habitat.toLowerCase())?.timeToTarget;
  return timeToTargetData?.get(condition.toLowerCase().trim());
}

export function getEffectiveTimeToTarget(habitat, condition, timeToTargetOffset = 0) {
  const timeToTarget = getTimeToTarget(habitat, condition);
  let effectiveTimeToTarget = timeToTarget;

  if (timeToTargetOffset !== 0 && typeof timeToTarget === 'string' && !isNaN(Number(timeToTarget))) {
    // Apply offset to numeric time to target
    const baseYears = Number(timeToTarget);
    effectiveTimeToTarget = Math.max(0, baseYears + timeToTargetOffset);
  } else if (timeToTargetOffset !== 0 && timeToTarget === "30+") {
    // For 30+, apply negative offset but don't go below 0
    if (timeToTargetOffset < 0) {
      effectiveTimeToTarget = Math.max(0, 30 + timeToTargetOffset);
    }
  }

  return effectiveTimeToTarget;
}

export function calcTemporalRisk(habitat, condition, timeToTargetOffset = 0) {

  // first find the "time-to-target condition" for this habitat and condition
  // then if its a valid time, look it up in the pre-calculated Temporal Multipliers from CSV

  const timeToTarget = getTimeToTarget(habitat, condition);
  let effectiveTimeToTarget = timeToTarget;

  if (timeToTargetOffset !== 0 && typeof timeToTarget === 'string' && !isNaN(Number(timeToTarget))) {
    // Apply offset to numeric time to target
    const baseYears = Number(timeToTarget);
    effectiveTimeToTarget = Math.max(0, baseYears + timeToTargetOffset);
  } else if (timeToTargetOffset !== 0 && timeToTarget === "30+") {
    // For 30+, apply negative offset but don't go below 0
    if (timeToTargetOffset < 0) {
      effectiveTimeToTarget = Math.max(0, 30 + timeToTargetOffset);
    }
  }

  if (effectiveTimeToTarget == "Not Possible") {
    return temporalMultipliers.get("Not Possible") || 0;
  }
  else if (effectiveTimeToTarget == null) {
    if (condition == "Unable to Map") {
      return 1;
    }
    else {
      console.error(`No time to target found for habitat '${habitat}' and condition '${condition}'`);
      return 0;
    }
  }
  else if (effectiveTimeToTarget == "30+") {
    return temporalMultipliers.get("30+") || 0;
  }
  else {
    const timeToTargetYears = Number(effectiveTimeToTarget);
    if (!isNaN(timeToTargetYears)) {
      // Try to get the multiplier for the exact year, or fall back to 30+ for years beyond our data
      const multiplier = temporalMultipliers.get(String(timeToTargetYears)) ??
                        (timeToTargetYears > 31 ? temporalMultipliers.get("31+") : temporalMultipliers.get("30+"));
      if (multiplier !== null && multiplier !== undefined) {
        return multiplier;
      }
      else {
        console.error(`No temporal multiplier found for ${timeToTargetYears} years`);
        return 0;
      }
    }
    else {
      console.error(`Unknown time to target type ${effectiveTimeToTarget}`);
      return 0;
    }
  }
}

/**
 * Calculates enhancement temporal multiplier and time to target for habitat improvements.
 * @param {object} improvementHab The improvement habitat object
 * @param {Array} baselineHabitats Array of baseline habitats to match against
 * @param {string} module The module type (areas, hedgerows, watercourses)
 * @returns {object} { timeToTarget, temporalMultiplier } or null if not applicable
 */
export function calcEnhancementTemporal(improvementHab, baselineHabitats, module) {
  if (!improvementHab || !baselineHabitats || baselineHabitats.length === 0) {
    return null;
  }

  const moduleType = module?.toLowerCase();
  const improvementBroadHabitat = getHabitatGroup(improvementHab.type);
  const enhancementKey = `${improvementBroadHabitat}-${improvementHab.type}`;
  const enhancementRow = enhancementMultipliers.get(enhancementKey);

  if (!enhancementRow) {
    return null;
  }

  const improvementDistinctiveness = enhancementRow['Distinctiveness'];
  const improvementCondition = improvementHab.condition;
  const improvementSize = improvementHab.size;

  // Find baseline habitats within the same broad habitat type
  const matchingBaselineHabitats = baselineHabitats.filter(hab =>
    getHabitatGroup(hab.type) === improvementBroadHabitat
  );

  if (matchingBaselineHabitats.length === 0) {
    return null; // No baseline habitats in the same broad habitat type
  }

  let bestMatch = null;
  let improvementType = null;

  // Try to find best enhancement match according to rules
  // First priority: same habitat type, condition improvement, size same or larger
  const sameHabitatBaselines = matchingBaselineHabitats.filter(hab =>
    hab.type === improvementHab.type &&
    getConditionScore(hab.condition) < getConditionScore(improvementCondition) &&
    hab.size >= improvementSize
  );

  sameHabitatBaselines.sort((a, b) => b.size - a.size); // Prefer larger baselines

  if (sameHabitatBaselines.length > 0) {
    // Same habitat, condition improvement - use columns N-X
    improvementType = 'same_condition';
    bestMatch = sameHabitatBaselines[0];
  }

  // Second priority: same habitat type, condition improvement (any size, as fallback)
  if (!bestMatch) {
    const sameTypeFallbackBaselines = matchingBaselineHabitats.filter(hab =>
      hab.type === improvementHab.type &&
      getConditionScore(hab.condition) < getConditionScore(improvementCondition)
    );

    sameTypeFallbackBaselines.sort((a, b) => b.size - a.size); // Prefer larger baselines

    if (sameTypeFallbackBaselines.length > 0) {
      improvementType = 'same_condition';
      bestMatch = sameTypeFallbackBaselines[0];
    }
  }

  // Third priority: different habitat types in same broad group with distinctiveness or condition improvement
  if (!bestMatch) {
    const differentTypeBroadBaselines = matchingBaselineHabitats.filter(hab =>
      hab.type !== improvementHab.type &&
      (getDistinctivenessScore(hab.type) < getDistinctivenessScore(improvementHab.type) ||
       getConditionScore(hab.condition) < getConditionScore(improvementCondition))
    );

    differentTypeBroadBaselines.sort((a, b) => b.size - a.size); // Prefer larger baselines

    if (differentTypeBroadBaselines.length > 0) {
      bestMatch = differentTypeBroadBaselines[0];
      // Set improvement type based on whether it's same type (condition) or different type (distinctiveness)
      improvementType = 'distinctiveness';
    }
  }

  // Third priority: condition improvement where baseline condition is 'Condition Assessment N/A'
  if (!bestMatch) {
    const conditionNAImprovementBaselines = matchingBaselineHabitats.filter(hab =>
      hab.condition?.toLowerCase() === 'condition assessment n/a' &&
      getConditionScore(hab.condition) < getConditionScore(improvementCondition)
    );

    if (conditionNAImprovementBaselines.length > 0) {
      improvementType = 'condition_na';
      bestMatch = conditionNAImprovementBaselines[0];
    }
  }

  if (!bestMatch || !improvementType) {
    return null; // No valid enhancement match found
  }

  // Check size requirement
  const totalBaselineSize = matchingBaselineHabitats.reduce((sum, hab) => sum + (hab.size || 0), 0);
  if (totalBaselineSize < improvementSize) {
    return null; // Not enough baseline size
  }

  // Special rules for watercourses and hedgerows
  if (moduleType === 'watercourses') {
    if (improvementType === 'distinctiveness') {
      // Watercourses: time to target is 10 where distinctiveness is being improved
      return {
        timetotarget: '10',
        temporalRisk: calcTemporalRisk(improvementHab.type, improvementHab.condition)
      };
    } else if (improvementType === 'condition_na' || improvementType === 'same_condition') {
      // Where watercourse condition changes, use columns N-X
      improvementType = 'condition'; // Map to condition improvement
    }
  }

  // Handle hedgerow special cases - these use cross-reference matrix
  if (moduleType === 'hedgerows') {
    // Hedgerows use columns Y-AK which are cross-referenced pairs
    // This is complex - for now, skip hedgerow enhancement calculation
    return null; // Too complex for initial implementation
  }



  // Map improvement type to column ranges
  let timeValue = null;
  if (improvementType === 'distinctiveness') {
    // Columns C-I for lower distinctiveness habitat upgrades
    const distinctivenessColumns = {
      'n/a - other': 'Lower Distinctiveness Habitat - N/A - Other',
      'poor': 'Lower Distinctiveness Habitat - Poor',
      'fairly poor': 'Lower Distinctiveness Habitat - Fairly Poor',
      'moderate': 'Lower Distinctiveness Habitat - Moderate',
      'fairly good': 'Lower Distinctiveness Habitat - Fairly Good',
      'good': 'Lower Distinctiveness Habitat - Good'
    };

    // Find the column based on bestMatch's distinctiveness
    const baselineDistinctiveness = getHabitatDistinctiveness(bestMatch.type);
    const columnName = distinctivenessColumns[baselineDistinctiveness?.toLowerCase()];
    timeValue = enhancementRow[columnName];

  } else if (improvementType === 'condition_na') {
    // Columns J-M for condition assessment N/A upgrades
    const conditionColumns = {
      'fairly poor': 'Condition Assessment N/A - Fairly Poor',
      'moderate': 'Condition Assessment N/A - Moderate',
      'fairly good': 'Condition Assessment N/A - Fairly Good',
      'good': 'Condition Assessment N/A - Good'
    };

    const columnName = conditionColumns[improvementCondition?.toLowerCase()];
    timeValue = enhancementRow[columnName];

  } else if (improvementType === 'condition' || improvementType === 'same_condition') {
    // Columns N-X for condition improvements within same habitat
    const conditionColumns = {
      'poor-fairly poor': 'Poor - Fairly Poor',
      'poor-moderate': 'Poor - Moderate',
      'poor-fairly good': 'Poor - Fairly Good',
      'poor-good': 'Poor - Good',
      'fairly poor-moderate': 'Fairly Poor - Moderate',
      'fairly poor-fairly good': 'Fairly Poor - Fairly Good',
      'fairly poor-good': 'Fairly Poor - Good',
      'moderate-fairly good': 'Moderate - Fairly Good',
      'moderate-good': 'Moderate - Good',
      'fairly good-good': 'Fairly Good - Good'
    };

    const baselineCondition = bestMatch.condition;
    const conditionKey = `${baselineCondition?.toLowerCase()}-${improvementCondition?.toLowerCase()}`;
    const columnName = conditionColumns[conditionKey];
    timeValue = enhancementRow[columnName];
  }

  if (!timeValue || timeValue === 'Not Possible') {
    return null;
  }

  return {
    timetotarget: timeValue,
    temporalMultiplier: temporalMultipliers.get(timeValue.toString()) || 0,
    baselineDistinctiveness: getDistinctivenessScore(bestMatch.type),
    baselineCondition: getConditionScore(bestMatch.condition),
    usedBaseline: bestMatch
  };
}

export function calcDifficultyFactor(habitat) {
  return habitatMap.get(habitat.toLowerCase())?.difficultyCreationMultiplier ?? 1;
}

export function calculateImprovementHU(size, habitat, condition, improvementType, timeToTargetOffset = 0, strategicSignificanceScore = 1.0, spatialRisk = 1.0) {
  if (typeof size !== 'number' || isNaN(size) ||
    typeof strategicSignificanceScore !== 'number' || isNaN(strategicSignificanceScore) ||
    typeof spatialRisk !== 'number' || isNaN(spatialRisk) ||
    typeof timeToTargetOffset !== 'number' || isNaN(timeToTargetOffset) ||
    typeof habitat !== 'string' ||
    typeof condition !== 'string' ||
    typeof improvementType !== 'string') {
    console.error('calculateImprovementHU: Invalid parameter type.', { size, habitat, condition, timeToTargetOffset, strategicSignificanceScore, spatialRisk });
    return {HUs: 0};
  }

  if (habitatMap.get(habitat.toLowerCase()) == null) {
    console.error(`calculateImprovementHU: Unknown habitat type '${habitat}'`);
    return {HUs: 0};
  }

  if (improvementType.toLowerCase() == 'creation') {
    // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel- low) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (1 as this site is being used by an off-site provider)

    const HUData = {};
    HUData.timetotarget = getTimeToTarget(habitat, condition);
    HUData.temporalRisk = calcTemporalRisk(habitat, condition, timeToTargetOffset);
    HUData.difficultyFactor = calcDifficultyFactor(habitat);
    HUData.spatialRisk = spatialRisk;
    HUData.HUs = size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore * HUData.temporalRisk * HUData.difficultyFactor * HUData.spatialRisk;
    return HUData;
  }
  else if (improvementType.toLowerCase() == 'enhanced') {
    // HU is not computed because no connection is made back to the baseline parcel.
    return {HUs: 0};
  }
  else {
    console.error(`Unknown improvement type ${improvementType}`);
    return {HUs: 0};
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

// Helper function to calculate HU with optional enhancement temporal override
function calculateImprovementHUWithEnhancement(size, habitat, condition, interventionType, enhancementTemporalMultiplier) {
  const strategicSignificanceScore = 1.0;
  const spatialRisk = 1.0;
  const timeToTargetOffset = 0;

  if (interventionType.toLowerCase() == 'creation') {
    // HU = Habitat area/length x Distinctiveness x Condition x Strategic Significance x Temporal Risk x Difficulty factor x Spatial Risk
    return size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore * calcTemporalRisk(habitat, condition, timeToTargetOffset) * calcDifficultyFactor(habitat) * spatialRisk;
  }
  else if (interventionType.toLowerCase() == 'enhanced') {
    // For enhancements, use enhancement temporal multiplier if available, otherwise fall back to standard calculation
    const temporalMultiplier = enhancementTemporalMultiplier || calcTemporalRisk(habitat, condition, timeToTargetOffset);
    return size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore * temporalMultiplier * calcDifficultyFactor(habitat) * spatialRisk;
  }
  else {
    console.error(`Unknown improvement type ${interventionType}`);
    return 0;
  }
}

const processImprovementHabitats = (habitats) => {
  // baseline habitats need their distinctiveness rating gathered and HUs calculated
  habitats.forEach(habitat => {
    habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
    Object.assign(habitat, calculateImprovementHU(habitat.size, habitat.type, habitat.condition, habitat.interventionType));
  });
}

export function getAllHabitats() {
  return Array.from(habitatMap.keys());
}

export function getAllConditions() {
  return Object.keys(conditionScores);
}

// Helper function to calculate enhanced HU using the new formula
function calculateEnhancedHU(size, habitat, condition, temporalMultiplier, difficultyMultiplier, baselineDistinctiveness, baselineCondition, strategicSignificance = 1.0) {
  // Formula: (((Enhanced Size × Enhanced Distinctiveness × Enhanced Condition) -
  //           (Enhanced Size × Baseline Distinctiveness × Baseline Condition)) ×
  //           (Time to Target Multiplier × Difficulty Multiplier) +
  //           (Enhanced Size × Baseline Distinctiveness × Baseline Condition)
  //          ) × Enhanced Strategic Significance Multiplier

  const enhancedDistinctiveness = getDistinctivenessScore(habitat);
  const enhancedConditionScore = getConditionScore(condition);

  const enhancedQuality = size * enhancedDistinctiveness * enhancedConditionScore;
  const baselineQuality = size * baselineDistinctiveness * baselineCondition;
  const qualityImprovement = enhancedQuality - baselineQuality;

  const temporalDifficultyMultiplier = temporalMultiplier * difficultyMultiplier;

  const result = (qualityImprovement * temporalDifficultyMultiplier) + baselineQuality;
  const finalHU = result * strategicSignificance;

  // Debug logging for specific habitats
  if (habitat.toLowerCase().includes('lowland mixed deciduous woodland') ||
      habitat.toLowerCase().includes('other woodland; broadleaved') ||
      habitat.toLowerCase().includes('other neutral grassland')) {
    console.log('=== ENHANCED HU CALCULATION FOR BGS-150925001 ===');
    console.log(`Size: ${size} ha`);
    console.log(`Habitat: ${habitat}`);
    console.log(`Condition: ${condition}`);
    console.log(`Enhanced Distinctiveness Score: ${enhancedDistinctiveness}`);
    console.log(`Enhanced Condition Score: ${enhancedConditionScore}`);
    console.log(`Baseline Distinctiveness Score: ${baselineDistinctiveness}`);
    console.log(`Baseline Condition Score: ${baselineCondition}`);
    console.log(`Time to Target Multiplier: ${temporalMultiplier}`);
    console.log(`Difficulty Multiplier: ${difficultyMultiplier}`);
    console.log(`Strategic Significance: ${strategicSignificance}`);
    console.log('');
    console.log(`Formula Components:`);
    console.log(`Enhanced Quality = ${size} × ${enhancedDistinctiveness} × ${enhancedConditionScore} = ${enhancedQuality}`);
    console.log(`Baseline Quality = ${size} × ${baselineDistinctiveness} × ${baselineCondition} = ${baselineQuality}`);
    console.log(`Quality Improvement = ${enhancedQuality} - ${baselineQuality} = ${qualityImprovement}`);
    console.log(`Temporal×Difficulty = ${temporalMultiplier} × ${difficultyMultiplier} = ${temporalDifficultyMultiplier}`);
    console.log(`Result before SS = (${qualityImprovement} × ${temporalDifficultyMultiplier}) + ${baselineQuality} = ${result}`);
    console.log(`Final HU = ${result} × ${strategicSignificance} = ${finalHU}`);
    console.log('============================================================');
  }

  return finalHU;
}

// Add enhancement temporal data to improvement habitats
const processEnhancementHabitats = (improvements, baselines, module) => {
  if (!improvements || !CALC_ENHANCEMENT_HUS) return;

  improvements.forEach(improvement => {
    if (improvement.interventionType && improvement.interventionType.toLowerCase() === 'enhanced') {
      // Calculate enhancement temporal values
      const enhancementResult = calcEnhancementTemporal(improvement, baselines, module);
      if (enhancementResult) {
        improvement.timetotarget = enhancementResult.timetotarget;
        improvement.temporalRisk = enhancementResult.temporalMultiplier;
        improvement.difficultyFactor = calcDifficultyFactor(improvement.type);
        improvement.spatialRisk = 1.0; // Sites use 1.0 spatial risk
        improvement.baselineDistinctiveness = enhancementResult.baselineDistinctiveness;
        improvement.baselineCondition = enhancementResult.baselineCondition;
        // Remove the used baseline from available baselines to prevent reuse
        if (enhancementResult.usedBaseline) {
          const index = baselines.indexOf(enhancementResult.usedBaseline);
          if (index >= 0) {
            baselines.splice(index, 1);
          }
        }
        // Recalculate HU with the new enhanced formula
        improvement.HUs = calculateEnhancedHU(
          improvement.size,
          improvement.type,
          improvement.condition,
          enhancementResult.temporalMultiplier,
          calcDifficultyFactor(improvement.type),
          enhancementResult.baselineDistinctiveness,
          enhancementResult.baselineCondition,
          1.0 // strategic significance
        );
      }
    }
  });
};

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
    // Collect all baseline habitats for enhancement calculations
    const allBaselineHabitats = [
      ...(site.habitats?.areas || []),
      ...(site.habitats?.hedgerows || []),
      ...(site.habitats?.watercourses || [])
    ];

    if (site.improvements?.areas) {
      // areas need their sub-type processed out
      processHabitatSubTypes(site.improvements.areas);
      processHabitatConditions(site.improvements.areas);
      processImprovementHabitats(site.improvements.areas);
      // Process enhancement temporal calculations (TODO: encapsulate this within processImprovementHabitats / calculateImprovementHU)
      processEnhancementHabitats(site.improvements.areas, allBaselineHabitats, 'areas');
    }
    if (site.improvements?.hedgerows) {
      processHabitatConditions(site.improvements.hedgerows);
      processImprovementHabitats(site.improvements.hedgerows);
      processEnhancementHabitats(site.improvements.hedgerows, allBaselineHabitats, 'hedgerows');
    }
    if (site.improvements?.watercourses) {
      processHabitatConditions(site.improvements.watercourses);
      processImprovementHabitats(site.improvements.watercourses);
      processEnhancementHabitats(site.improvements.watercourses, allBaselineHabitats, 'watercourses');
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
        const improvements = habitat.module == 'Area' ? site.improvements.areas : habitat.module == 'Hedgerow' ? site.improvements.hedgerows : site.improvements.watercourses;
        const improvementHab = improvements?.find(h => h.type == habitat.type);
        if (improvementHab) {
          improvementHab.allocatedSize = (improvementHab.allocatedSize || 0) + habitat.size;
        }
      });
    })
  }
}

// Helper function to collate habitat data
export const collateHabitats = (habitats, isImprovement) => {
  if (!habitats) return [];

  const collated = habitats.reduce((acc, habitat) => {
    const key = slugify(habitat.type);
    if (!acc[key]) {
      acc[key] = {
        type: habitat.type,
        distinctiveness: habitat.distinctiveness,
        module: habitat.module,
        parcels: 0,
        area: 0,
        allocatedArea: 0,
        HUs: 0,
        subRows: {},
      };
    }
    acc[key].parcels += 1;
    acc[key].area += habitat.size;
    acc[key].allocatedArea += habitat.allocatedSize || 0;
    acc[key].HUs += habitat.HUs;

    if (habitat.site) {
      if (acc[key].sites == null) {
        acc[key].sites = []
      }
      let existing = acc[key].sites.find(s => s.r == habitat.site.r);
      if (existing) {
        existing.ta += habitat.site.ta;
        if (existing.aa) {
          existing.aa += habitat.site.aa || 0;
        }
      } else {
        acc[key].sites.push(habitat.site);
      }
    }

    const subKey = isImprovement ? `${habitat.interventionType}-${habitat.condition}-${habitat.type}` : `${habitat.condition}-${habitat.type}`;
    if (!acc[key].subRows[subKey]) {
      acc[key].subRows[subKey] = {
        condition: habitat.condition,
        interventionType: habitat.interventionType,
        type: habitat.type,
        timetotarget: habitat.timetotarget,
        temporalRisk: habitat.temporalRisk,
        difficultyFactor: habitat.difficultyFactor,
        spatialRisk: habitat.spatialRisk,
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

  // calc allocation percentages
  Object.values(collated).forEach(h => {
    if (h.allocatedArea && h.allocatedArea > 0 && h.area > 0) {
      h.allocated = h.allocatedArea / h.area;
    } else {
      h.allocated = 0;
    }
  });

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
