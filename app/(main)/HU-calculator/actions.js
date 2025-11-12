"use server"

import { calcDifficultyFactor, calcTemporalRisk, getTimeToTarget, calculateBaselineHU, calculateImprovementHU, getConditionScore, getDistinctivenessScore, getHabitatDistinctiveness } from "@/lib/habitat";

export async function calcHU(prevState, formData) {
    const size = formData.get("size");
    const habitat = formData.get("habitat");
    const condition = formData.get("condition");
    const improvementType = formData.get("improvementType");
    const strategicSignificance = formData.get("strategicSignificance");
    const spatialRisk = formData.get("spatialRisk");

    const isBaseline = improvementType == "none" || improvementType == null || improvementType == '';

    let result = {
      hu: isBaseline ? calculateBaselineHU(Number(size), habitat, condition) : calculateImprovementHU(Number(size), habitat, condition, improvementType),        
      distinctiveness: getHabitatDistinctiveness(habitat),
      distinctivenessScore: getDistinctivenessScore(habitat),
      conditionScore: getConditionScore(condition),
    }
    
    if (!isBaseline) {
      result.getTimeToTarget = getTimeToTarget(habitat, condition);
      result.temporalRisk= calcTemporalRisk(habitat, condition);
      result.difficultyFactor = calcDifficultyFactor(habitat);
    }

    const newState = {
        size: size,
        habitat: habitat,
        condition: condition,
        improvementType: improvementType,
        strategicSignificance: strategicSignificance,
        spatialRisk: spatialRisk,
        result: result
    };

    return newState;
}
