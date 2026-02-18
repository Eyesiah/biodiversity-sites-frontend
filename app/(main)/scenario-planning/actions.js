"use server"

import { calculateImprovementHU, calculateBaselineHU, getConditionScore, getDistinctivenessScore, getHabitatGroup } from "@/lib/habitat";

// Condition order from lowest to highest
const CONDITION_ORDER = ['Poor', 'Fairly Poor', 'Moderate', 'Fairly Good', 'Good'];

// Filter valid conditions (not N/A)
const VALID_CONDITIONS = CONDITION_ORDER.filter(c => c !== 'Condition Assessment N/A');

export async function calculateScenarios(prevState, formData) {
  const size = Number(formData.get("size")) || 1;
  const habitat = formData.get("habitat");
  const baselineHabitat = formData.get("baselineHabitat");
  const baselineCondition = formData.get("baselineCondition");
  const improvementType = formData.get("improvementType") || 'creation';
  const strategicSignificance = Number(formData.get("strategicSignificance")) || 1;
  const spatialRisk = Number(formData.get("spatialRisk")) || 1;
  const timeToTargetOffset = Number(formData.get("timeToTargetOffset")) || 0;

  // Check if this is a reset (empty habitat with no error flag)
  const isReset = formData.get("isReset") === "true";
  
  if (!habitat) {
    return {
      size: Number(size) || 1,
      habitat: '',
      baselineHabitat: '',
      baselineCondition: '',
      improvementType: improvementType || 'creation',
      strategicSignificance,
      spatialRisk,
      timeToTargetOffset,
      results: null,
      summary: null,
      habitatGroup: null,
      error: isReset ? null : 'Please select a habitat'
    };
  }

  // For enhancement, require baseline habitat and condition
  if (improvementType === 'enhancement') {
    if (!baselineHabitat) {
      return {
        ...prevState,
        results: null,
        error: 'Please select a baseline habitat for enhancement'
      };
    }
    if (!baselineCondition) {
      return {
        ...prevState,
        results: null,
        error: 'Please select a baseline condition for enhancement'
      };
    }
  }

  const scenarios = [];

  if (improvementType === 'creation') {
    // For creation: calculate HUs for target habitat at each condition
    VALID_CONDITIONS.forEach(targetCondition => {
      const huData = calculateImprovementHU(
        size,
        habitat,
        targetCondition,
        'creation',
        null, // baselineHabitat - null for creation
        null, // baselineCondition
        timeToTargetOffset,
        strategicSignificance,
        spatialRisk
      );
      
      scenarios.push({
        baselineHabitat: 'N/A (Creation)',
        baselineCondition: 'N/A (Creation)',
        targetCondition,
        HUs: huData.HUs || 0,
        baselineHUs: huData.baselineHUs || 0,
        distinctivenessScore: getDistinctivenessScore(habitat),
        conditionScore: getConditionScore(targetCondition),
        timeToTarget: huData.timeToTarget || 'N/A',
      });
    });
  } else {
    // For enhancement: use selected baseline habitat and condition, calculate for all better target conditions
    VALID_CONDITIONS.forEach(targetCondition => {
      // Only calculate if target condition is better than or equal to baseline
      if (getConditionScore(targetCondition) >= getConditionScore(baselineCondition)) {
        const huData = calculateImprovementHU(
          size,
          habitat,
          targetCondition,
          'enhanced',
          baselineHabitat,
          baselineCondition,
          timeToTargetOffset,
          strategicSignificance,
          spatialRisk
        );
        
        scenarios.push({
          baselineHabitat,
          baselineCondition,
          targetCondition,
          HUs: huData.HUs || 0,
          baselineHUs: huData.baselineHUs || 0,
          distinctivenessScore: getDistinctivenessScore(habitat),
          conditionScore: getConditionScore(targetCondition),
          timeToTarget: huData.timeToTarget || 'N/A',
        });
      }
    });
  }

  // Calculate summary stats
  const huValues = scenarios.map(r => r.HUs);
  const minHUs = Math.min(...huValues);
  const maxHUs = Math.max(...huValues);
  const avgHUs = huValues.reduce((a, b) => a + b, 0) / huValues.length;

  const summary = { minHUs, maxHUs, avgHUs };
  const habitatGroup = getHabitatGroup(habitat);

  return {
    size,
    habitat,
    baselineHabitat,
    baselineCondition,
    improvementType,
    strategicSignificance,
    spatialRisk,
    timeToTargetOffset,
    results: scenarios,
    summary,
    habitatGroup,
    error: null
  };
}
