import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

function loadHabitatData() {
    const habitatDataPath = path.join(process.cwd(), 'data', 'BNG-Habitat-Data.csv');
    const habitatDataCsv = fs.readFileSync(habitatDataPath, 'utf8');
    
    const habitatMap = new Map();
    const distinctivenessScoreMap = new Map();
    
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
            habitatMap.set(habitatType.trim().toLowerCase(), distinctiveness);

            const distinctivenessScore = row['Distinctiveness Score'];
            if (distinctivenessScore) {
                distinctivenessScoreMap.set(distinctiveness, distinctivenessScore)
            }
        }
    });

    console.log(`Loaded ${habitatMap.size} habitats and ${distinctivenessScoreMap.size} scores`)

    return {habitatMap: habitatMap, distinctivenessScoreMap: distinctivenessScoreMap};
}

const {habitatMap, distinctivenessScoreMap} = loadHabitatData();

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
    return habitatMap.get(habitat.toLowerCase()) || 'N/A';
}

/**
 * Get the score for a particular distinctiveness.
 * @param {string} distinctiveness The distinctiveness type.
 * @returns {number} The score.
 */
function getDistinctivenessScore(distinctiveness) {    
    return distinctivenessScoreMap.get(distinctiveness) || 0;
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
    return conditionScores[condition.trim()] || 0;
}

/**
 * Calculates the baseline Habitat Units (HU).
 * @param {number} size The area or length of the habitat parcel.
 * @param {string} habitat The type of habitat.
 * @param {string} condition The condition of the habitat parcel.
 * @returns {number} The calculated baseline Habitat Units.
 */
export function calculateBaselineHU(size, distinctiveness, condition) {
    if (typeof size !== 'number' || isNaN(size) ||
        typeof distinctiveness !== 'string' ||
        typeof condition !== 'string') {
        console.error('calculateBaselineHU: Invalid parameter type.', { size, habitat, condition });
        return 0;
    }

    //Baseline parcels is as per the standard formula
    // HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low).
    const strategicSignificanceScore = 1.0;
    return size * getDistinctivenessScore(distinctiveness) * getConditionScore(condition) * strategicSignificanceScore;
}