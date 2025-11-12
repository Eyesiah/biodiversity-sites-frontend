"use server"

import { calcDifficultyFactor, calcTemporalRisk, getTimeToTarget, getEffectiveTimeToTarget, calculateBaselineHU, calculateImprovementHU, getConditionScore, getDistinctivenessScore, getHabitatDistinctiveness, calcSpatialRiskCategory } from "@/lib/habitat";

export async function calcHU(prevState, formData) {
    const size = formData.get("size");
    const habitat = formData.get("habitat");
    const condition = formData.get("condition");
    const improvementType = formData.get("improvementType");
    const strategicSignificance = Number(formData.get("strategicSignificance"));
    const spatialRisk = Number(formData.get("spatialRisk"));
    const timeToTargetOffset = Number(formData.get("timeToTargetOffset") || 0);

    const isBaseline = improvementType == "baseline" || improvementType == "none" || improvementType == null || improvementType == '';

    let result = {
      hu: isBaseline ? calculateBaselineHU(Number(size), habitat, condition, strategicSignificance) : calculateImprovementHU(Number(size), habitat, condition, improvementType, timeToTargetOffset, strategicSignificance, spatialRisk),
      distinctiveness: getHabitatDistinctiveness(habitat),
      distinctivenessScore: getDistinctivenessScore(habitat),
      conditionScore: getConditionScore(condition),
      strategicSignificance: strategicSignificance
    }

    if (!isBaseline) {
      result.getTimeToTarget = getTimeToTarget(habitat, condition);
      result.effectiveTimeToTarget = getEffectiveTimeToTarget(habitat, condition, timeToTargetOffset);
      result.temporalRisk= calcTemporalRisk(habitat, condition, timeToTargetOffset);
      result.difficultyFactor = calcDifficultyFactor(habitat);
      result.spatialRisk = spatialRisk;
      result.timeToTargetOffset = timeToTargetOffset;
    }

    if (result.distinctiveness && result.distinctiveness.toLowerCase() === 'v.low') {
      result.hu = 0;
      result.distinctivenessScore = 0;
      result.conditionScore = 0;
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
