"use server"

import { calcDifficultyFactor, calcTemporalRisk, getTimeToTarget, getEffectiveTimeToTarget, calculateBaselineHU, calculateImprovementHU, getConditionScore, getDistinctivenessScore, getHabitatDistinctiveness, calcSpatialRiskCategory } from "@/lib/habitat";

export async function calcHU(prevState, formData) {
    const size = formData.get("size");
    const habitat = formData.get("habitat");
    const condition = formData.get("condition");
    const improvementType = formData.get("improvementType");
    const strategicSignificance = formData.get("strategicSignificance");
    const spatialRisk = formData.get("spatialRisk");
    const timeToTargetOffset = Number(formData.get("timeToTargetOffset") || 0);

    const isBaseline = improvementType == "none" || improvementType == null || improvementType == '';

    let result = {
      hu: isBaseline ? calculateBaselineHU(Number(size), habitat, condition) : calculateImprovementHU(Number(size), habitat, condition, improvementType, timeToTargetOffset),
      distinctiveness: getHabitatDistinctiveness(habitat),
      distinctivenessScore: getDistinctivenessScore(habitat),
      conditionScore: getConditionScore(condition),
    }

    if (!isBaseline) {
      result.getTimeToTarget = getTimeToTarget(habitat, condition);
      result.effectiveTimeToTarget = getEffectiveTimeToTarget(habitat, condition, timeToTargetOffset);
      result.temporalRisk= calcTemporalRisk(habitat, condition, timeToTargetOffset);
      result.difficultyFactor = calcDifficultyFactor(habitat);
      result.spatialRisk = calcSpatialRiskCategory(spatialRisk);
    }

    const newState = {
        size: size,
        habitat: habitat,
        condition: condition,
        improvementType: improvementType,
        strategicSignificance: strategicSignificance,
        spatialRisk: spatialRisk,
        timeToTargetOffset: timeToTargetOffset,
        result: result
    };

    return newState;
}
