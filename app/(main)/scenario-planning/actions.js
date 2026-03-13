"use server"

import { calculateImprovementHU, calculateBaselineHU, getConditionScore, getDistinctivenessScore, getHabitatGroup, getEffectiveTimeToTarget, getHabitatDistinctiveness, checkTradingRules, getOriginalCaseHabitatName } from "@/lib/habitat";

// Condition order from lowest to highest
const CONDITION_ORDER = ['Poor', 'Fairly Poor', 'Moderate', 'Fairly Good', 'Good'];

// Filter valid conditions (not N/A)
const VALID_CONDITIONS = CONDITION_ORDER.filter(c => c !== 'Condition Assessment N/A');

export async function calculateScenarios(prevState, formData) {
  const size = Number(formData.get("size")) || 0;
  const habitat = formData.get("habitat");
  const baselineHabitat = formData.get("baselineHabitat");
  const baselineCondition = formData.get("baselineCondition");
  const improvementType = formData.get("improvementType") || 'creation';
  const strategicSignificance = Number(formData.get("strategicSignificance")) || 1;
  const spatialRisk = Number(formData.get("spatialRisk")) || 1;

  // Number(null|undefined|'') all give NaN; NaN || 0 safely gives 0
  const timeToTargetOffset = Number(formData.get("timeToTargetOffset")) || 0;

  // Common fields shared by every return value — merge in overrides as needed
  const buildState = (overrides) => ({
    size,
    habitat: habitat || '',
    baselineHabitat: baselineHabitat || '',
    baselineCondition: baselineCondition || '',
    improvementType,
    strategicSignificance,
    spatialRisk,
    timeToTargetOffset,
    results: null,
    summary: null,
    habitatGroup: null,
    baselineDistinctiveness: null,
    targetDistinctiveness: null,
    error: null,
    ...overrides,
  });

  if (!habitat) {
    return buildState({
      baselineDistinctiveness: baselineHabitat ? getHabitatDistinctiveness(baselineHabitat) : null,
      error: 'Please select a habitat',
    });
  }

  // Pre-compute lookups used in multiple places below
  const habitatGroup = getHabitatGroup(habitat);
  const targetDistinctiveness = getHabitatDistinctiveness(habitat);
  const baselineDistinctiveness = baselineHabitat ? getHabitatDistinctiveness(baselineHabitat) : null;

  // For enhancement, require baseline habitat and condition
  if (improvementType === 'enhancement') {
    if (!baselineHabitat) {
      return buildState({
        habitatGroup,
        targetDistinctiveness,
        error: 'Please select a baseline habitat for enhancement',
      });
    }
    if (!baselineCondition) {
      return buildState({
        habitatGroup,
        baselineDistinctiveness,
        targetDistinctiveness,
        error: 'Please select a baseline condition for enhancement',
      });
    }

    // Check trading rules
    const tradingCheck = checkTradingRules(baselineHabitat, habitat);
    if (!tradingCheck.allowed) {
      return buildState({
        habitatGroup,
        baselineDistinctiveness,
        targetDistinctiveness,
        error: tradingCheck.reason,
      });
    }
  }

  // Convert habitat names to their original case from CSV
  const originalCaseHabitat = getOriginalCaseHabitatName(habitat);
  const originalCaseBaselineHabitat = baselineHabitat ? getOriginalCaseHabitatName(baselineHabitat) : null;

  // Hoist per-habitat values that are constant across all condition iterations
  const distinctivenessScore = getDistinctivenessScore(habitat);
  const baselineConditionScore = baselineCondition ? getConditionScore(baselineCondition) : 0;

  const scenarios = [];

  if (improvementType === 'baseline') {
    // Calculate HUs for target habitat at each condition using the baseline formula
    VALID_CONDITIONS.forEach(condition => {
      const HUs = calculateBaselineHU(size, habitat, condition, strategicSignificance) || 0;
      scenarios.push({
        habitat,
        condition,
        HUs,
        distinctivenessScore,
        conditionScore: getConditionScore(condition),
        timeToTarget: 'N/A',
        effectiveTimeToTarget: 'N/A',
      });
    });
  } else if (improvementType === 'creation') {
    // Calculate HUs for target habitat at each condition
    VALID_CONDITIONS.forEach(targetCondition => {
      const huData = calculateImprovementHU(
        size, habitat, targetCondition, 'creation',
        null, null,
        timeToTargetOffset, strategicSignificance, spatialRisk
      );
      const baseTimeToTarget = huData.timeToTarget;
      const effectiveTimeToTarget = getEffectiveTimeToTarget(baseTimeToTarget, timeToTargetOffset);
      const conditionScore = getConditionScore(targetCondition);
      scenarios.push({
        baselineHabitat: 'N/A (Creation)',
        baselineCondition: 'N/A (Creation)',
        targetCondition,
        baselineConditionScore: 0,
        targetConditionScore: conditionScore,
        HUs: huData.HUs || 0,
        baselineHUs: huData.baselineHUs || 0,
        distinctivenessScore,
        conditionScore,
        timeToTarget: baseTimeToTarget !== undefined ? String(baseTimeToTarget) : 'N/A',
        effectiveTimeToTarget: effectiveTimeToTarget !== undefined ? String(effectiveTimeToTarget) : 'N/A',
        temporalRisk: huData.temporalRisk,
      });
    });
  } else {
    // Enhancement: calculate for all target conditions >= baseline condition
    VALID_CONDITIONS.forEach(targetCondition => {
      const conditionScore = getConditionScore(targetCondition);
      if (conditionScore < baselineConditionScore) return;

      const huData = calculateImprovementHU(
        size, habitat, targetCondition, 'enhanced',
        baselineHabitat, baselineCondition,
        timeToTargetOffset, strategicSignificance, spatialRisk
      );
      const baseTimeToTarget = huData.timeToTarget;
      const effectiveTimeToTarget = getEffectiveTimeToTarget(baseTimeToTarget, timeToTargetOffset);
      scenarios.push({
        baselineHabitat: originalCaseBaselineHabitat,
        baselineCondition,
        targetCondition,
        baselineConditionScore,
        targetConditionScore: conditionScore,
        HUs: huData.HUs || 0,
        baselineHUs: huData.baselineHUs || 0,
        distinctivenessScore,
        conditionScore,
        timeToTarget: baseTimeToTarget !== undefined ? String(baseTimeToTarget) : 'N/A',
        effectiveTimeToTarget: effectiveTimeToTarget !== undefined ? String(effectiveTimeToTarget) : 'N/A',
        temporalRisk: huData.temporalRisk,
      });
    });
  }

  // Calculate summary stats
  const huValues = scenarios.map(r => r.HUs);
  const summary = {
    minHUs: Math.min(...huValues),
    maxHUs: Math.max(...huValues),
    avgHUs: huValues.reduce((a, b) => a + b, 0) / huValues.length,
  };

  return buildState({
    habitat: originalCaseHabitat,
    baselineHabitat: originalCaseBaselineHabitat,
    results: scenarios,
    summary,
    habitatGroup,
    baselineDistinctiveness,
    targetDistinctiveness,
  });
}
