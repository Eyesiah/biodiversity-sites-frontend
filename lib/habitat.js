import path from 'path';
import Papa from 'papaparse';
import { normalizeBodyName, slugify, formatNumber } from '@/lib/format'
import { getHabitatAssignmentData } from '@/lib/sites'
import { HABITAT_UNIT_TYPES } from '@/config'

// Only import fs on the server side
let fs;
try {
  fs = require('fs');
} catch (e) {
  // fs is not available on the client
}

function loadTemporalMultipliers() {
  if (!fs) return new Map();
  
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
  if (!fs) return new Map();
  
  const csvPath = path.join(process.cwd(), 'data', 'Temporal-Enhancement-Multipliers.csv');
  const csvData = fs.readFileSync(csvPath, 'utf8');

  const enhancementMap = new Map();

  const results = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim().toLowerCase()
  });

  results.data.forEach(row => {
    const broadHabitat = row['broad habitat']?.trim();
    const habitat = row['habitat']?.trim();

    if (broadHabitat && habitat) {
      const key = `${broadHabitat}-${habitat}`;
      // Store the entire row for lookup, including distinctiveness from column C
      enhancementMap.set(key.toLowerCase(), row);
    }
  });

  return enhancementMap;
}

const temporalMultipliers = loadTemporalMultipliers();
const enhancementMultipliers = loadEnhancementMultipliers();


function loadLPAData() {
  if (!fs) return new Map();
  
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
  if (!fs) return new Map();
  
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
  if (!fs) return new Map();
  
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
      const difficultyEnhancementMultiplier = row['Technical Difficulty Enhancement Multiplier']?.trim();
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
        difficultyEnhancementMultiplier: difficultyEnhancementMultiplier,
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
  return habitatMap.get(habitat.toLowerCase())?.distinctiveness || null;
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

function calcEnhancedTimeToTarget(baselineHabitat, baselineCondition, enhancedHabitat, enhancedCondition) {

  const broadHabitat = getHabitatGroup(enhancedHabitat);

  const enhancedKey = `${broadHabitat}-${enhancedHabitat}`;
  const enhancedRow = enhancementMultipliers.get(enhancedKey.toLowerCase());

  if (!enhancedRow) {
    return null;
  }

  if (baselineCondition.toLowerCase().includes('n/a')) {
    // Columns J-M for condition assessment N/A upgrades
    const columnName = `condition assessment n/a - ${enhancedCondition?.toLowerCase()}`;
    return enhancedRow[columnName];
  } else if (baselineHabitat == enhancedHabitat) {
    // Columns N-X for condition improvements within same habitat
    const columnName = `${baselineCondition?.toLowerCase()} - ${enhancedCondition?.toLowerCase()}`;
    return enhancedRow[columnName];
  } else {
    // a habitat (ie distinctiveness) change
    if (broadHabitat === 'Hedgerow') {
      // Hedgerows use columns Y-AK which are cross-referenced pairs
      // the column is the name of the enhanced habitat
      return enhancedRow[enhancedHabitat?.toLowerCase()];
    }
    else {
      // Columns C-I for lower distinctiveness habitat upgrades
      // Find the column based on the improvement condition
      const columnName = `lower distinctiveness habitat - ${enhancedCondition?.toLowerCase()}`;
      return enhancedRow[columnName];
    }
  }
}

export function getDifficultyCreationMultiplier(habitat) {
  return habitatMap.get(habitat.toLowerCase())?.difficultyCreationMultiplier ?? 1;
}

export function getEnhancementDifficultyFactor(habitat) {
  return habitatMap.get(habitat.toLowerCase())?.difficultyEnhancementMultiplier ?? 1;
}

/**
 * Get the trading rules for a habitat based on its distinctiveness
 * @param {string} habitat The habitat type
 * @returns {string} The trading rule: "same habitat", "like for like or better", or "same distinctiveness band or better"
 */
export function getTradingRules(habitat) {
  if (typeof habitat !== 'string') {
    console.error('getTradingRules: "habitat" must be a string.');
    return 'same distinctiveness band or better';
  }
  
  const distinctivenessScore = getDistinctivenessScore(habitat);
  
  // V.High (score 8) - Same habitat required
  if (distinctivenessScore >= 8) {
    return 'same habitat';
  }
  // High (score 6) or Medium (score 4) - Like for like or better
  if (distinctivenessScore >= 4) {
    return 'like for like or better';
  }
  // Low (score 2) or V.Low (score 1) - Same distinctiveness band or better
  return 'same distinctiveness band or better';
}

/**
 * Check if an enhancement complies with trading rules
 * @param {string} baselineHabitat The baseline habitat type
 * @param {string} targetHabitat The target (enhanced) habitat type
 * @returns {object} { allowed: boolean, reason: string }
 */
export function checkTradingRules(baselineHabitat, targetHabitat) {
  if (!baselineHabitat || !targetHabitat) {
    return { allowed: true, reason: 'No baseline or target habitat' };
  }
  
  // Same habitat is always allowed
  if (baselineHabitat.toLowerCase() === targetHabitat.toLowerCase()) {
    return { allowed: true, reason: 'Same habitat - trading rules satisfied' };
  }
  
  // Check habitat type compatibility (Hedgerow, Watercourse, Area)
  const baselineGroup = getHabitatGroup(baselineHabitat);
  const targetGroup = getHabitatGroup(targetHabitat);
  
  // Define incompatible habitat groups
  const hedgerowGroup = 'Hedgerow';
  const watercourseGroup = 'Watercourse';
  
  // Check for Hedgerow compatibility
  if (baselineGroup === hedgerowGroup && targetGroup !== hedgerowGroup) {
    return {
      allowed: false,
      reason: `Trading rules violated: Cannot enhance from ${hedgerowGroup} to ${targetGroup || targetHabitat}. ${hedgerowGroup} habitats can only enhance to other ${hedgerowGroup} habitats.`
    };
  }
  
  if (targetGroup === hedgerowGroup && baselineGroup !== hedgerowGroup) {
    return {
      allowed: false,
      reason: `Trading rules violated: Cannot enhance from ${baselineGroup || baselineHabitat} to ${hedgerowGroup}. ${hedgerowGroup} habitats can only be enhanced from other ${hedgerowGroup} habitats.`
    };
  }
  
  // Check for Watercourse compatibility
  if (baselineGroup === watercourseGroup && targetGroup !== watercourseGroup) {
    return {
      allowed: false,
      reason: `Trading rules violated: Cannot enhance from ${watercourseGroup} to ${targetGroup || targetHabitat}. ${watercourseGroup} habitats can only enhance to other ${watercourseGroup} habitats.`
    };
  }
  
  if (targetGroup === watercourseGroup && baselineGroup !== watercourseGroup) {
    return {
      allowed: false,
      reason: `Trading rules violated: Cannot enhance from ${baselineGroup || baselineHabitat} to ${watercourseGroup}. ${watercourseGroup} habitats can only be enhanced from other ${watercourseGroup} habitats.`
    };
  }
  
  const baselineDistinctiveness = getDistinctivenessScore(baselineHabitat);
  const targetDistinctiveness = getDistinctivenessScore(targetHabitat);
  const baselineRules = getTradingRules(baselineHabitat);
  
  // Check based on trading rules
  if (baselineRules === 'same habitat') {
    return { 
      allowed: false, 
      reason: `Trading rules violated: ${baselineHabitat} is V.High distinctiveness and requires same habitat. Cannot enhance to ${targetHabitat}.` 
    };
  }
  
  if (baselineRules === 'like for like or better') {
    // Must be same habitat OR higher distinctiveness
    if (targetDistinctiveness < baselineDistinctiveness) {
      return { 
        allowed: false, 
        reason: `Trading rules violated: ${baselineHabitat} requires like-for-like or better (same or higher distinctiveness). Cannot enhance to lower distinctiveness ${targetHabitat}.` 
      };
    }
  }
  
  if (baselineRules === 'same distinctiveness band or better') {
    // Must be same or higher distinctiveness band
    if (targetDistinctiveness < baselineDistinctiveness) {
      return { 
        allowed: false, 
        reason: `Trading rules violated: ${baselineHabitat} requires same or higher distinctiveness. Cannot enhance to lower distinctiveness ${targetHabitat}.` 
      };
    }
  }
  
  return { allowed: true, reason: 'Trading rules satisfied' };
}

export function calculateImprovementHU(size, habitat, condition, improvementType, baselineHabitat = null, baselineCondition = null, timeToTargetOffset = 0, strategicSignificanceScore = 1.0, spatialRisk = 1.0) {
  if (typeof size !== 'number' || isNaN(size) ||
    typeof strategicSignificanceScore !== 'number' || isNaN(strategicSignificanceScore) ||
    typeof spatialRisk !== 'number' || isNaN(spatialRisk) ||
    typeof timeToTargetOffset !== 'number' || isNaN(timeToTargetOffset) ||
    typeof habitat !== 'string' ||
    typeof condition !== 'string' ||
    typeof improvementType !== 'string') {
    console.error('calculateImprovementHU: Invalid parameter type.', { size, habitat, condition, improvementType, baselineHabitat, timeToTargetOffset, strategicSignificanceScore, spatialRisk });
    return { HUs: 0 };
  }

  if (habitatMap.get(habitat.toLowerCase()) == null) {
    console.warn(`calculateImprovementHU: Unknown habitat type '${habitat}'`);
    return { HUs: 0 };
  }

  if (improvementType.toLowerCase() == 'creation') {
    // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel- low) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (1 as this site is being used by an off-site provider)

    const HUData = {};
    HUData.timeToTarget = getTimeToTarget(habitat, condition);
    HUData.temporalRisk = calcTemporalRisk(habitat, condition, timeToTargetOffset);
    HUData.difficultyFactor = getDifficultyCreationMultiplier(habitat);
    HUData.spatialRisk = spatialRisk;
    HUData.HUs = size * getDistinctivenessScore(habitat) * getConditionScore(condition) * strategicSignificanceScore * HUData.temporalRisk * HUData.difficultyFactor * HUData.spatialRisk;
    HUData.baselineHUs = baselineHabitat != '[CREATION]' ? calculateBaselineHU(size, baselineHabitat, baselineCondition, strategicSignificanceScore) : 0;
    return HUData;
  }
  else if (improvementType.toLowerCase() == 'enhanced') {
    // Enhanced improvements require a baseline parcel
    if (baselineHabitat == null || baselineCondition == null) {
      console.log(`calculateImprovementHU: enhanced improvement with no baseline habitat or condition`);
      return { HUs: 0 };
    }

    // Check trading rules before calculating
    const tradingCheck = checkTradingRules(baselineHabitat, habitat);
    if (!tradingCheck.allowed) {
      return { 
        HUs: 0, 
        tradingRuleViolation: true, 
        tradingRuleReason: tradingCheck.reason 
      };
    }

    const HUData = {};
    HUData.timeToTarget = calcEnhancedTimeToTarget(baselineHabitat, baselineCondition, habitat, condition);
    if (HUData.timeToTarget == null || HUData.timeToTarget == 'Error' || HUData.timeToTarget == 'Not Possible') {
      return { HUs: 0 };
    }

    // Apply timeToTargetOffset for enhancement using calcTemporalRisk
    HUData.temporalRisk = calcTemporalRisk(habitat, condition, timeToTargetOffset);
    HUData.difficultyFactor = getEnhancementDifficultyFactor(habitat);
    HUData.spatialRisk = spatialRisk;
    // HU = (((Enhanced Size × Enhanced Distinctiveness × Enhanced Condition) -
    //        (Enhanced Size × Baseline Distinctiveness × Baseline Condition)) ×
    //       (Temporal Risk Multiplier × Difficulty Factor) +
    //       (Enhanced Size × Baseline Distinctiveness × Baseline Condition)) x
    //      Enhanced Strategic Significance Multiplier x Spatial Risk Multiplier

    const enhancedQuality = size * getDistinctivenessScore(habitat) * getConditionScore(condition);
    const baselineQuality = size * getDistinctivenessScore(baselineHabitat) * getConditionScore(baselineCondition);
    const qualityImprovement = enhancedQuality - baselineQuality;
    const temporalDifficultyMultiplier = HUData.temporalRisk * HUData.difficultyFactor;
    const result = (qualityImprovement * temporalDifficultyMultiplier) + baselineQuality;
    HUData.HUs = result * strategicSignificanceScore * spatialRisk;
    HUData.baselineHUs = calculateBaselineHU(size, baselineHabitat, baselineCondition, strategicSignificanceScore);
    return HUData;
  }
  else {
    throw new Error(`Unknown improvement type ${improvementType}`);
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

const processHabitatDistinctiveness = (habitats) => {
  // baseline habitats need their distinctiveness rating gathered and HUs calculated
  habitats.forEach(habitat => {
    habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
  });
}

export function getAllHabitats() {
  return Array.from(habitatMap.keys());
}

export function getAllConditions() {
  return Object.keys(conditionScores);
}

export function getAllHabitatGroups() {
  const groups = new Set();
  habitatMap.forEach((data) => {
    if (data.group) {
      groups.add(data.group);
    }
  });
  return Array.from(groups).sort();
}

export function getHabitatsByGroup(group) {
  const habitats = [];
  habitatMap.forEach((data, key) => {
    if (data.group === group) {
      habitats.push(key);
    }
  });
  return habitats.sort();
}

/**
 * Get habitats that are compatible for enhancement based on the baseline habitat's broad category
 * Linear habitats (Hedgerow, Watercourse) can only enhance to same linear type
 * Area habitats can only enhance to other Area habitats
 * @param {string} baselineHabitat The baseline habitat type
 * @returns {string[]} Array of compatible target habitat names
 */
export function getCompatibleHabitatsForEnhancement(baselineHabitat) {
  if (!baselineHabitat) {
    // If no baseline, return all habitats
    return Array.from(habitatMap.keys()).sort();
  }
  
  const baselineGroup = getHabitatGroup(baselineHabitat);
  
  // Define linear habitat groups
  const linearGroups = ['Hedgerow', 'Watercourse'];
  
  // Get all habitats that are in the same category (linear or area)
  const compatibleHabitats = [];
  habitatMap.forEach((data, key) => {
    const targetGroup = data.group;
    const isLinearBaseline = linearGroups.includes(baselineGroup);
    const isLinearTarget = linearGroups.includes(targetGroup);
    
    // Both must be linear OR both must be area
    if (isLinearBaseline === isLinearTarget) {
      compatibleHabitats.push(key);
    }
  });
  
  return compatibleHabitats.sort();
}

/**
 * Get broad habitat groups that are compatible for enhancement based on the baseline habitat's broad category
 * Linear habitats (Hedgerow, Watercourse) can only enhance to same linear type
 * Area habitats can only enhance to other Area habitats
 * @param {string} baselineHabitat The baseline habitat type
 * @returns {string[]} Array of compatible broad habitat group names
 */
export function getCompatibleBroadHabitatsForEnhancement(baselineHabitat) {
  if (!baselineHabitat) {
    // If no baseline, return all broad habitat groups
    return getAllHabitatGroups();
  }
  
  const baselineGroup = getHabitatGroup(baselineHabitat);
  
  // Define linear habitat groups
  const linearGroups = ['Hedgerow', 'Watercourse'];
  const isLinearBaseline = linearGroups.includes(baselineGroup);
  
  // Get all broad groups that are in the same category (linear or area)
  const allGroups = getAllHabitatGroups();
  const compatibleGroups = allGroups.filter(group => {
    const isLinearGroup = linearGroups.includes(group);
    // Both must be linear OR both must be area
    return isLinearBaseline === isLinearGroup;
  });
  
  return compatibleGroups;
}

const isIndividualTree = (habitat) => getHabitatGroup(habitat.type) == 'Individual trees';

export const preProcessSiteHabitatData = (site) => {

  // PRE-PROCESSING
  if (site.habitats) {
    if (site.habitats.areas) {
      // areas first need their sub-type processed out
      processHabitatSubTypes(site.habitats.areas)
      processHabitatConditions(site.habitats.areas);
      processHabitatDistinctiveness(site.habitats.areas);
    }
    if (site.habitats.hedgerows) {
      processHabitatConditions(site.habitats.hedgerows);
      processHabitatDistinctiveness(site.habitats.hedgerows);
    }
    if (site.habitats.watercourses) {
      processHabitatConditions(site.habitats.watercourses);
      processHabitatDistinctiveness(site.habitats.watercourses);
    }
  }
  if (site.improvements) {
    if (site.improvements?.areas) {
      // areas need their sub-type processed out
      processHabitatSubTypes(site.improvements.areas);
      processHabitatConditions(site.improvements.areas);
      processHabitatDistinctiveness(site.improvements.areas);
    }
    if (site.improvements?.hedgerows) {
      processHabitatConditions(site.improvements.hedgerows);
      processHabitatDistinctiveness(site.improvements.hedgerows);
    }
    if (site.improvements?.watercourses) {
      processHabitatConditions(site.improvements.watercourses);
      processHabitatDistinctiveness(site.improvements.watercourses);
    }
  }

  /// COLLATE HABITATS & SPLIT OUT TREES
  site.habitats = collateAllHabitats(site.habitats, false);
  site.improvements = collateAllHabitats(site.improvements, true);

  site.habitats.trees = site.habitats.areas.filter(h => isIndividualTree(h));
  site.improvements.trees = site.improvements.areas.filter(h => isIndividualTree(h));
  site.habitats.areas = site.habitats.areas.filter(h => !isIndividualTree(h));
  site.improvements.areas = site.improvements.areas.filter(h => !isIndividualTree(h));

  site.habitats.trees.forEach(h => h.module = 'Tree');
  site.improvements.trees.forEach(h => h.module = 'Tree');
}

export const processSiteHabitatData = (site, habData) => {

  /// CALCULATE HUs

  for (const unit of HABITAT_UNIT_TYPES) {
    site.habitats[unit].forEach(habitat => {
      habitat.HUs = 0;
      habitat.subRows.forEach(parcel => {
        parcel.HUs = calculateBaselineHU(parcel.size, habitat.type, parcel.condition)
        habitat.HUs += parcel.HUs;
      });
    })
    const assignmentData = habData && habData[unit] ? habData[unit] : getHabitatAssignmentData(site, unit);
    site.improvements[unit].forEach(habitat => {
      habitat.HUs = 0;
      habitat.baselineHUs = 0;
      habitat.subRows.forEach(parcel => {

        // look up in the assignmentData what parcels were allocated to this
        const linkData = Array.from(assignmentData?.aggregatedLinks?.entries() || []);
        const matchingLinks = linkData.filter(([linkKey,]) => {
          const [, , improvement] = linkKey.split('_');
          const [habType, condition, improvementType] = improvement.split('|');
          return habType == habitat.type && condition == parcel.condition && improvementType == parcel.interventionType;
        });

        if (matchingLinks.length == 0) {
          // fall back to just a single [CREATION]
          matchingLinks.push(['_[CREATION]', parcel.size]);
        }

        const difficultyFactor = new Set();
        const spatialRisk = new Set();
        const temporalRisk = new Set();
        const timeToTarget = new Set()

        parcel.HUs = 0;
        parcel.baselineHUs = 0;
        matchingLinks.forEach(([linkKey, linkValue]) => {
          const [, baseline] = linkKey.split('_');
          const [baselineHabitat, baselineCondition] = baseline.split('|');

          // if no enhancement could be found, just treat it like a creation
          const interventionType = baselineHabitat == '[CREATION]' ? 'creation' : parcel.interventionType;

          const huData = calculateImprovementHU(linkValue, habitat.type, parcel.condition, interventionType, baselineHabitat, baselineCondition);
          if (huData.HUs > 0) {
            parcel.HUs += huData.HUs;
            parcel.baselineHUs += huData.baselineHUs;
            difficultyFactor.add(huData.difficultyFactor);
            spatialRisk.add(huData.spatialRisk);
            temporalRisk.add(huData.temporalRisk);
            timeToTarget.add(huData.timeToTarget);
          }
        });

        // collapse down the assignments info
        parcel.difficultyFactor = Array.from(difficultyFactor).join('; ');
        parcel.spatialRisk = Array.from(spatialRisk).join('; ');
        parcel.temporalRisk = Array.from(temporalRisk).map(t => formatNumber(t, 3)).join('; ');
        parcel.timeToTarget = Array.from(timeToTarget).join('; ');

        habitat.HUs += parcel.HUs;
        habitat.baselineHUs += parcel.baselineHUs;
      });
    })
  }

  /// PROCESS ALLOCATIONS

  if (site.allocations) {
    site.allocations.forEach(alloc => {
      // areas need subtypes processed out
      processHabitatSubTypes(alloc.habitats.areas);

      // trees moved to their own module
      alloc.habitats.trees = alloc.habitats.areas.filter(h => isIndividualTree(h));
      alloc.habitats.areas = alloc.habitats.areas.filter(h => !isIndividualTree(h));
      alloc.habitats.trees.forEach(h => h.module = 'Tree');

      const allHabitats = [
        ...(alloc.habitats.areas || []),
        ...(alloc.habitats.hedgerows || []),
        ...(alloc.habitats.watercourses || []),
        ...(alloc.habitats.trees || [])
      ];
      processHabitatConditions(allHabitats);
      allHabitats.forEach(habitat => {
        habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
        const improvements = habitat.module == 'Area' ? site.improvements.areas : habitat.module == 'Hedgerow' ? site.improvements.hedgerows : habitat.module == 'Tree' ? site.improvements.trees : site.improvements.watercourses;
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
        size: 0,
        allocatedArea: 0,
        HUs: 0,
        subRows: {},
      };
      if (isImprovement) {
        acc[key].baselineHUs = 0;
      }
    }
    acc[key].parcels += habitat.parcels || 1;
    acc[key].size += habitat.size;
    acc[key].allocatedArea += habitat.allocatedSize || 0;
    acc[key].HUs += habitat.HUs;
    if (isImprovement) {
      acc[key].baselineHUs += habitat.baselineHUs || 0;
    }

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
        timeToTarget: habitat.timeToTarget,
        temporalRisk: habitat.temporalRisk,
        difficultyFactor: habitat.difficultyFactor,
        spatialRisk: habitat.spatialRisk,
        parcels: 0,
        size: 0,
        HUs: 0,
      };
      if (isImprovement) {
        acc[key].subRows[subKey].baselineHUs = 0;
      }
    }
    acc[key].subRows[subKey].parcels += habitat.parcels || 1;
    acc[key].subRows[subKey].size += habitat.size;
    acc[key].subRows[subKey].HUs += habitat.HUs;
    if (isImprovement) {
      acc[key].subRows[subKey].baselineHUs += habitat.baselineHUs || 0;
    }

    return acc;
  }, {});

  // calc allocation percentages
  Object.values(collated).forEach(h => {
    if (h.allocatedArea && h.allocatedArea > 0 && h.size > 0) {
      h.allocated = h.allocatedArea / h.size;
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
  const collated = {};
  for (const unit of HABITAT_UNIT_TYPES) {
    collated[unit] = collateHabitats(habObj[unit], isImprovement);
  }
  return collated;
}
