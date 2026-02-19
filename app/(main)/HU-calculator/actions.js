"use server"

import { getEffectiveTimeToTarget, calculateBaselineHU, calculateImprovementHU, getConditionScore, getDistinctivenessScore, getHabitatDistinctiveness } from "@/lib/habitat";

export async function calcHU(prevState, formData) {
    const size = formData.get("size");
    const habitat = formData.get("habitat");
    const condition = formData.get("condition");
    const improvementType = formData.get("improvementType");
    const strategicSignificance = Number(formData.get("strategicSignificance"));
    const spatialRisk = Number(formData.get("spatialRisk"));
    const timeToTargetOffset = Number(formData.get("timeToTargetOffset") || 0);
    const baselineHabitat = formData.get("baselineHabitat");
    const baselineCondition = formData.get("baselineCondition");

    // Validate required fields
    if (!habitat) {
        return {
            size: size,
            habitat: '',
            condition: condition,
            improvementType: improvementType,
            strategicSignificance: strategicSignificance,
            spatialRisk: spatialRisk,
            timeToTargetOffset: timeToTargetOffset,
            baselineHabitat: baselineHabitat,
            baselineCondition: baselineCondition,
            result: null,
            error: 'Please select a habitat'
        };
    }

    // For enhancement, require baseline habitat and condition
    if (improvementType === 'enhanced') {
        if (!baselineHabitat) {
            return {
                ...prevState,
                result: null,
                error: 'Please select a baseline habitat for enhancement'
            };
        }
        if (!baselineCondition) {
            return {
                ...prevState,
                result: null,
                error: 'Please select a baseline condition for enhancement'
            };
        }
    }

    const isBaseline = improvementType == "baseline" || improvementType == "none" || improvementType == null || improvementType == '';

    const result = {
      distinctiveness: getHabitatDistinctiveness(habitat),
      distinctivenessScore: getDistinctivenessScore(habitat),
      conditionScore: getConditionScore(condition),
      strategicSignificance: strategicSignificance
    }

    if (isBaseline) {
      // just get the base HUs
      result.HUs = calculateBaselineHU(Number(size), habitat, condition, strategicSignificance);
    } else {
      if (improvementType == 'creation') {
        // these aren't used/included in the calculateImprovementHU result so add them too
        result.effectiveTimeToTarget = getEffectiveTimeToTarget(habitat, condition, timeToTargetOffset);
        result.timeToTargetOffset = timeToTargetOffset;
      } else {
        result.baselineDistinctiveness = getHabitatDistinctiveness(baselineHabitat);
        result.baselineDistinctivenessScore = getDistinctivenessScore(baselineHabitat);
        result.baselineConditionScore = getConditionScore(baselineCondition);
        // Add effective time to target for enhancement
        result.effectiveTimeToTarget = getEffectiveTimeToTarget(habitat, condition, timeToTargetOffset);
        result.timeToTargetOffset = timeToTargetOffset;
      }

      // the calculateImprovementHU returns also the values used for the final calculation, so use those
      Object.assign(result, calculateImprovementHU(Number(size), habitat, condition, improvementType, baselineHabitat, baselineCondition, timeToTargetOffset, strategicSignificance, spatialRisk));
    }

    if (result.distinctiveness && result.distinctiveness.toLowerCase() === 'v.low') {
      result.HUs = 0;
      result.distinctivenessScore = 0;
      result.conditionScore = 0;
    }

    if (result.HUs > 0) {
      result.HUs = Number(result.HUs.toFixed(4));
    }

    const newState = {
        size: size,
        habitat: habitat,
        condition: condition,
        improvementType: improvementType,
        strategicSignificance: strategicSignificance,
        spatialRisk: spatialRisk,
        timeToTargetOffset: timeToTargetOffset,
        baselineHabitat: baselineHabitat,
        baselineCondition: baselineCondition,
        result: result
    };

    return newState;
}
