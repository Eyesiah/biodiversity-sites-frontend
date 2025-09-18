"use server"

import { calcDifficultyFactor, calcTemporalRisk, calculateBaselineHU, calculateImprovementHU, getConditionScore, getDistinctivenessScore, getHabitatDistinctiveness } from "@/lib/habitat";
import { formatNumber } from "@/lib/format";

export async function calcHU(prevState, formData) {
    const size = formData.get("size");
    const habitat = formData.get("habitat");
    const condition = formData.get("condition");
    const improvementType = formData.get("improvementType");

    const isBaseline = improvementType == "none" || improvementType == null || improvementType == '';

    let result = {
      hu: isBaseline ? calculateBaselineHU(Number(size), habitat, condition) : calculateImprovementHU(Number(size), habitat, condition, improvementType),        
      distinctiveness: getHabitatDistinctiveness(habitat),
      distinctivenessScore: getDistinctivenessScore(habitat),
      conditionScore: getConditionScore(condition),
    }
    
    if (!isBaseline) {
      result.temporalRisk= calcTemporalRisk(habitat, condition);
      result.difficultyFactor = calcDifficultyFactor(habitat);
    }

    const newState = {
        size: size,
        habitat: habitat,
        condition: condition,
        improvementType: improvementType,
        result: result
    };

    return newState;
}