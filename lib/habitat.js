import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { normalizeBodyName, slugify, formatNumber } from '@/lib/format'
import { getHabitatAssignmentData } from '@/lib/sites'

export const HABITAT_UNIT_TYPES = ['areas', 'trees', 'hedgerows', 'watercourses'];

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
      enhancementMap.set(key.toLowerCase(), row);
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

function calcEnhancedTimeToTarget(baselineHabitat, baselineCondition, enhancedHabitat, enhancedCondition) {

  const broadHabitat = getHabitatGroup(enhancedHabitat);

  const enhancementKey = `${broadHabitat}-${enhancedHabitat}`;
  const enhancementRow = enhancementMultipliers.get(enhancementKey.toLowerCase());

  if (!enhancementRow) {
    return null;
  }

  if (baselineCondition.toLowerCase().includes('n/a')) {
    // Columns J-M for condition assessment N/A upgrades (unless watercourses)
    const conditionColumns = {
      'fairly poor': 'Condition Assessment N/A - Fairly Poor',
      'moderate': 'Condition Assessment N/A - Moderate',
      'fairly good': 'Condition Assessment N/A - Fairly Good',
      'good': 'Condition Assessment N/A - Good'
    };

    const columnName = conditionColumns[enhancedCondition?.toLowerCase()];
    return enhancementRow[columnName];
  } else if (baselineHabitat == enhancedHabitat) {
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

    const conditionKey = `${baselineCondition?.toLowerCase()}-${enhancedCondition?.toLowerCase()}`;
    const columnName = conditionColumns[conditionKey];
    return enhancementRow[columnName];
  } else {

    // Handle hedgerow special cases - these use cross-reference matrix
    if (broadHabitat === 'Hedgerow') {
      // Hedgerows use columns Y-AK which are cross-referenced pairs
      // TODO: Implement me
      return null;
    }

    // Columns C-I for lower distinctiveness habitat upgrades
    const distinctivenessColumns = {
      'n/a - other': 'Lower Distinctiveness Habitat - N/A - Other',
      'poor': 'Lower Distinctiveness Habitat - Poor',
      'fairly poor': 'Lower Distinctiveness Habitat - Fairly Poor',
      'moderate': 'Lower Distinctiveness Habitat - Moderate',
      'fairly good': 'Lower Distinctiveness Habitat - Fairly Good',
      'good': 'Lower Distinctiveness Habitat - Good'
    };

    // Find the column based on the improvement condition
    const columnName = distinctivenessColumns[enhancedCondition?.toLowerCase()];
    return enhancementRow[columnName];
  }
}

export function calcDifficultyFactor(habitat) {
  return habitatMap.get(habitat.toLowerCase())?.difficultyCreationMultiplier ?? 1;
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
    console.error(`calculateImprovementHU: Unknown habitat type '${habitat}'`);
    return { HUs: 0 };
  }

  if (improvementType.toLowerCase() == 'creation') {
    // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel- low) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (1 as this site is being used by an off-site provider)

    const HUData = {};
    HUData.timeToTarget = getTimeToTarget(habitat, condition);
    HUData.temporalRisk = calcTemporalRisk(habitat, condition, timeToTargetOffset);
    HUData.difficultyFactor = calcDifficultyFactor(habitat);
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

    const HUData = {};
    HUData.timeToTarget = calcEnhancedTimeToTarget(baselineHabitat, baselineCondition, habitat, condition);
    if (HUData.timeToTarget == null) {
      return { HUs: 0 };
    }

    HUData.temporalRisk = temporalMultipliers.get(HUData.timeToTarget.toString()) || 0;
    HUData.difficultyFactor = calcDifficultyFactor(habitat);
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
    console.error(`Unknown improvement type ${improvementType}`);
    return { HUs: 0 };
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

const isIndividualTree = (habitat) => getHabitatGroup(habitat.type) == 'Individual trees';

export const processSiteHabitatData = (site) => {

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

  /// CALCULATE HUs

  for (const unit of HABITAT_UNIT_TYPES) {
    const assignmentData = getHabitatAssignmentData(site, unit);
    site.habitats[unit].forEach(habitat => {
      habitat.HUs = 0;
      habitat.subRows.forEach(parcel => {
        parcel.HUs = calculateBaselineHU(parcel.size, habitat.type, parcel.condition)
        habitat.HUs += parcel.HUs;
      });
    })
    site.improvements[unit].forEach(habitat => {
      habitat.HUs = 0;
      habitat.baselineHUs = 0;
      habitat.subRows.forEach(parcel => {

        // look up in the assignmentData what parcels were allocated to this
        const matchingLinks = Array.from(assignmentData.aggregatedLinks.entries().filter(([linkKey,]) => {
          const [, , improvement] = linkKey.split('_');
          const [habType, condition, improvementType] = improvement.split('|');
          return habType == habitat.type && condition == parcel.condition && improvementType == parcel.interventionType;
        }));

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
        size: 0,
        allocatedArea: 0,
        HUs: 0,
        subRows: {},
      };
    }
    acc[key].parcels += 1;
    acc[key].size += habitat.size;
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
        timeToTarget: habitat.timeToTarget,
        temporalRisk: habitat.temporalRisk,
        difficultyFactor: habitat.difficultyFactor,
        spatialRisk: habitat.spatialRisk,
        parcels: 0,
        size: 0,
        HUs: 0,
      };
    }
    acc[key].subRows[subKey].parcels += 1;
    acc[key].subRows[subKey].size += habitat.size;
    acc[key].subRows[subKey].HUs += habitat.HUs;

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
