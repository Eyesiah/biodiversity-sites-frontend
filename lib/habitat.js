import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const TEMPORAL_RISK_DISCOUNT = 0.035; // 3.5%
const TEMPORAL_RISK_MAX_YEARS = 30;

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

            const timeToTargetMap = new Map();
            timeToTargetMap.set('good', row['Good Time To Target']);
            timeToTargetMap.set('fairly good', row['Fairly Good Time To Target']);
            timeToTargetMap.set('moderate', row['Moderate Time To Target']);
            timeToTargetMap.set('fairly poor', row['Fairly Poor Time To Target']);
            timeToTargetMap.set('poor', row['Poor Time To Target']);

            const difficultyCreationMultiplier = row['Technical Difficulty Creation Multiplier'];

            habitatMap.set(habitatType.trim().toLowerCase(), {
                distinctiveness: distinctiveness,
                score: distinctivenessScore,
                timeToTarget : timeToTargetMap,
                difficultyCreationMultiplier: difficultyCreationMultiplier
            });
        }
    });

    console.log(`Loaded ${habitatMap.size} habitats`)

    return habitatMap;
}

function calculateRiskMultipliers() {
    // each year's multiplier is the previous year reduced by the discount
    const multipliers = [1];
    while (multipliers.length < TEMPORAL_RISK_MAX_YEARS+2)
    {
        const prevVal = multipliers[multipliers.length - 1];
        const nextVal = prevVal - (prevVal * TEMPORAL_RISK_DISCOUNT);
        multipliers.push(nextVal);
    }
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
 * Get the score for a particular distinctiveness.
 * @param {string} distinctiveness The distinctiveness type.
 * @returns {number} The score.
 */
function getDistinctivenessScore(habitat) {    
    if (typeof habitat !== 'string') {
        console.error('getHabitatDistinctiveness: "habitat" must be a string.');
        return 'N/A'; 
    }
    return habitatMap.get(habitat.toLowerCase())?.score || 'N/A';
}

const conditionScores = {
    'Good'                      : 3,
    'Fairly Good'               : 2.5,
    'Moderate'                  : 2,
    'Fairly Poor'               : 1.5,
    'Poor'                      : 1,
    'Condition Assessment N/A'  : 1,
    'N/A – Other'               : 0,
    'N/A - Other'               : 0,
}

/**
 * Get the score for a particular habitat's condition.
 * @param {string} condition The condition of the habitat parcel.
 * @returns {number} The score.
 */
function getConditionScore(condition) {
    if (typeof condition !== 'string') {
        console.error('getConditionScore: "condition" must be a string.');
        return 1; 
    }

    return conditionScores[condition.trim()] || 0;
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

function calcTemporalRisk(habitat, condition) {

    // first find the "time-to-target condition" for this habitat and condition
    // then if its a valid time, look it up in the pre-calculated riskMultipliers to apply the discount
    
    const timeToTargetData = habitatMap.get(habitat.toLowerCase())?.timeToTarget;
    const timeToTarget = timeToTargetData?.get(condition.toLowerCase().trim());
    if (timeToTarget == "Not Possible") {
        return 0;
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

function calcDifficultyFactor(habitat) {    
    return habitatMap.get(habitat.toLowerCase())?.difficultyCreationMultiplier ?? 1;
}

export function calculateImprovementHU(size, habitat, condition, improvementType) {
    if (typeof size !== 'number' || isNaN(size) ||
        typeof habitat !== 'string' ||
        typeof condition !== 'string' ||
        typeof improvementType !== 'string') {
        console.error('calculateBaselineHU: Invalid parameter type.', { size, habitat, condition });
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