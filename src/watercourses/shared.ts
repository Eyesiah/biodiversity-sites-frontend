/**
 * Shared watercourse calculation functions
 *
 * This module contains calculation functions that are identical between
 * on-site and off-site watercourse modules (baseline, creation, enhancement).
 *
 * All functions use generics to work with both on-site and off-site types.
 */

import { Decimal } from '../decimal';
import { allWatercourses, type Watercourse, type WatercourseLabel } from '../watercourses';
import { getStrategicSignificance, type StrategicSignificanceDescription } from '../strategicSignificanceSchema';
import { yearsToTargetCondition, type WatercourseCondition } from '../watercourseCondition';
import {
    watercourseEncroachmentMultipliers,
    riparianEncroachmentMultipliers,
    type WatercourseEncroachment,
    type RiparianEncroachment
} from '../watercourseEncroachment';
import { getTemporalMultiplier, lookupTemporalMultiplier } from '../temporalMultipliers';
import { difficulty } from '../difficulty';
import { calculateEnhancementDifficulty as calculateEnhancementDifficultyShared } from '../enhancementDifficultyCalc';
import { watercourseEnhancementTemporalMatrix } from '../watercourseEnhancementTemporalMatrix';

// ============================================================================
// BASELINE FUNCTIONS
// ============================================================================

/**
 * Enrich data with watercourse properties from the watercourses lookup.
 * Used by baseline modules to add metadata and encroachment multipliers.
 */
export function enrichWithBaselineWatercourseData<Data extends {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    watercourseType: WatercourseLabel;
    condition: WatercourseCondition;
    strategicSignificance: StrategicSignificanceDescription;
    watercourseEncroachment: string;
    riparianEncroachment: string;
}>(data: Data) {
    const watercourse = allWatercourses[data.watercourseType];

    // Get condition score from watercourse lookup
    // Note: conditionScore can be 'Not possible' string or a number
    const conditionScore = watercourse.conditions[data.condition] as number | 'Not possible';

    const strategicSignificance = getStrategicSignificance(data.strategicSignificance);

    // Type-safe lookups with assertion since values are from picklist
    const watercourseEncroachmentMultiplier = watercourseEncroachmentMultipliers[data.watercourseEncroachment as keyof typeof watercourseEncroachmentMultipliers];
    const riparianEncroachmentMultiplier = riparianEncroachmentMultipliers[data.riparianEncroachment as keyof typeof riparianEncroachmentMultipliers];

    return {
        ...data,
        distinctiveness: watercourse.distinctivenessCategory,
        distinctivenessScore: watercourse.distinctivenessScore,
        conditionScore,
        strategicSignificanceCategory: strategicSignificance.significance,
        strategicSignificanceMultiplier: strategicSignificance.multiplier,
        watercourseEncroachmentMultiplier,
        riparianEncroachmentMultiplier,
        tradingRules: watercourse.tradingRules,
        irreplaceable: watercourse.irreplaceable,
    };
}

/**
 * Calculate baseline units for retained and enhanced portions.
 * Used by both on-site and off-site baseline calculations.
 */
/**
 * Pure calculation: derives baseline units retained and enhanced for watercourses.
 */
export function calculateBaselineUnits(input: {
    lengthRetained: number;
    lengthEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}) {
    const conditionScore = input.conditionScore as number;
    const unitsRetained = new Decimal(input.lengthRetained)
        .mul(input.distinctivenessScore)
        .mul(conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(input.watercourseEncroachmentMultiplier)
        .mul(input.riparianEncroachmentMultiplier)
        .toNumber();

    const unitsEnhanced = new Decimal(input.lengthEnhanced)
        .mul(input.distinctivenessScore)
        .mul(conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(input.watercourseEncroachmentMultiplier)
        .mul(input.riparianEncroachmentMultiplier)
        .toNumber();

    return { unitsRetained, unitsEnhanced };
}

export function enrichWithBaselineUnitsData<Data extends {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateBaselineUnits(data) };
}

/**
 * Calculate total watercourse units.
 * Used by both on-site and off-site baseline calculations.
 */
/**
 * Pure calculation: derives totalWatercourseUnits.
 */
export function calculateTotalWatercourseUnits(input: {
    length: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}) {
    const conditionScore = input.conditionScore as number;

    const totalWatercourseUnits = new Decimal(input.length)
        .mul(input.distinctivenessScore)
        .mul(conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(input.watercourseEncroachmentMultiplier)
        .mul(input.riparianEncroachmentMultiplier)
        .toNumber();

    return { totalWatercourseUnits };
}

export function enrichWithTotalWatercourseUnits<Data extends {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateTotalWatercourseUnits(data) };
}

/**
 * Calculate length lost and units lost.
 * Used by both on-site and off-site baseline calculations.
 */
/**
 * Pure calculation: derives lengthLost and unitsLost.
 */
export function calculateUnitsLost(input: {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    totalWatercourseUnits: number;
    unitsRetained: number;
    unitsEnhanced: number;
}) {
    const lengthLost = new Decimal(input.length)
        .minus(input.lengthRetained)
        .minus(input.lengthEnhanced)
        .toNumber();
    const unitsLost = lengthLost === 0 ? 0 : new Decimal(input.totalWatercourseUnits)
        .minus(input.unitsRetained)
        .minus(input.unitsEnhanced)
        .toNumber();

    return { lengthLost, unitsLost };
}

export function enrichWithUnitsLost<Data extends {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    totalWatercourseUnits: number;
    unitsRetained: number;
    unitsEnhanced: number;
}>(data: Data) {
    return { ...data, ...calculateUnitsLost(data) };
}

// ============================================================================
// CREATION FUNCTIONS
// ============================================================================

/**
 * Enrich data with watercourse properties from the watercourses lookup.
 * Used by creation modules to add metadata and time to target.
 */
export function enrichWithCreationWatercourseData<Data extends {
    watercourseType: WatercourseLabel;
    condition: WatercourseCondition;
    strategicSignificance: StrategicSignificanceDescription;
}>(data: Data) {
    const watercourse = allWatercourses[data.watercourseType];

    // Get condition score from watercourse lookup
    const conditionScore = watercourse.conditions[data.condition] as number | 'Not possible';
    const strategicSignificance = getStrategicSignificance(data.strategicSignificance);
    const standardTimeToTarget = yearsToTargetCondition[data.condition];

    return {
        ...data,
        distinctiveness: watercourse.distinctivenessCategory,
        distinctivenessScore: watercourse.distinctivenessScore,
        conditionScore,
        strategicSignificanceCategory: strategicSignificance.significance,
        strategicSignificanceMultiplier: strategicSignificance.multiplier,
        standardTimeToTarget,
        standardDifficulty: watercourse.technicalDifficultyOfCreation,
        tradingRules: watercourse.tradingRules,
        irreplaceable: watercourse.irreplaceable,
    };
}

/**
 * Pure calculation: computes the standardOrAdjusted message, finalTimeToTarget,
 * and isDitchFairlyCategory flag from input data.
 */
export function calculateTemporalAdjustments<Data extends {
    watercourseType: WatercourseLabel;
    condition: WatercourseCondition;
    habitatCreatedInAdvance: number | "30+";
    delayInStarting: number | "30+";
    standardTimeToTarget: number;
}>(data: Data) {
    // "30+" picklist entries are treated as 30 years for arithmetic.
    const habitatCreatedInAdvance = data.habitatCreatedInAdvance === "30+" ? 30 : data.habitatCreatedInAdvance;
    const delayInStarting = data.delayInStarting === "30+" ? 30 : data.delayInStarting;

    const standardOrAdjustedTimeToTargetCondition =
        (data.standardTimeToTarget <= habitatCreatedInAdvance && delayInStarting === 0)
            ? "Check details - Is there evidence that habitat has reached target condition? ⚠" as const
            : habitatCreatedInAdvance > 0
                ? "Check details - Is there evidence habitat creation started/in place? ⚠" as const
                : delayInStarting > 0
                    ? "Check details- Delay in starting habitat in required condition? ⚠" as const
                    : "Standard time to target condition applied" as const;

    let finalTimeToTarget = new Decimal(data.standardTimeToTarget).plus(delayInStarting).minus(habitatCreatedInAdvance).toNumber();

    if (finalTimeToTarget > 30) {
        finalTimeToTarget = 30;
    }

    if (finalTimeToTarget < 0) {
        finalTimeToTarget = 0;
    }

    const isDitchFairlyCategory = data.watercourseType === 'Ditches' &&
        (data.condition === 'Fairly Poor' || data.condition === 'Fairly Good');

    return {
        ...data,
        standardOrAdjustedTimeToTargetCondition,
        finalTimeToTarget,
        isDitchFairlyCategory,
    };
}

/**
 * Lookup: attaches temporalMultiplier from finalTimeToTarget.
 */
export function lookupTemporalMultiplierFromFinalTime<Data extends {
    finalTimeToTarget: number;
}>(data: Data) {
    const temporalMultiplier = getTemporalMultiplier(data.finalTimeToTarget as any) as number;

    return {
        ...data,
        temporalMultiplier,
    };
}

/**
 * Backwards-compatible composed transform: pure calc → lookup.
 */
export function enrichWithTemporalData<Data extends {
    watercourseType: WatercourseLabel;
    condition: WatercourseCondition;
    habitatCreatedInAdvance: number | "30+";
    delayInStarting: number | "30+";
    standardTimeToTarget: number;
}>(data: Data) {
    return lookupTemporalMultiplierFromFinalTime(calculateTemporalAdjustments(data));
}

/**
 * Calculate difficulty multiplier.
 * Used by both on-site and off-site creation calculations.
 */
/**
 * Pure calculation: derives appliedDifficulty, finalDifficultyOfCreation and
 * difficultyMultiplier for watercourse creation.
 */
export function calculateDifficultyData(input: {
    standardOrAdjustedTimeToTargetCondition: ReturnType<typeof calculateTemporalAdjustments>['standardOrAdjustedTimeToTargetCondition'],
    standardTimeToTarget: ReturnType<typeof enrichWithCreationWatercourseData>['standardTimeToTarget'],
    standardDifficulty: ReturnType<typeof enrichWithCreationWatercourseData>['standardDifficulty'],
    habitatCreatedInAdvance: number | "30+";
}) {
    const habitatCreatedInAdvance = input.habitatCreatedInAdvance === "30+" ? 30 : input.habitatCreatedInAdvance;
    const standardDifficultyOfCreation = input.standardDifficulty;
    const appliedDifficulty =
        input.standardOrAdjustedTimeToTargetCondition === "Check details - Is there evidence that habitat has reached target condition? ⚠"
            ? "Low Difficulty - only applicable if all habitat created before losses ⚠" as const
            : "Standard difficulty applied" as const;

    const finalDifficultyOfCreation =
        (appliedDifficulty === "Standard difficulty applied"
            && (typeof input.standardTimeToTarget === "number" && input.standardTimeToTarget > habitatCreatedInAdvance))
            ? standardDifficultyOfCreation
            : (appliedDifficulty === "Low Difficulty - only applicable if all habitat created before losses ⚠"
                && (typeof input.standardTimeToTarget === "number"
                    && habitatCreatedInAdvance >= input.standardTimeToTarget))
                ? "Low"
                : standardDifficultyOfCreation;

    const difficultyMultiplier = difficulty[finalDifficultyOfCreation];

    return {
        appliedDifficulty,
        finalDifficultyOfCreation,
        difficultyMultiplier,
    };
}

export function enrichWithDifficultyData<Data extends {
    standardOrAdjustedTimeToTargetCondition: ReturnType<typeof enrichWithTemporalData>['standardOrAdjustedTimeToTargetCondition'],
    standardTimeToTarget: ReturnType<typeof enrichWithCreationWatercourseData>['standardTimeToTarget'],
    standardDifficulty: ReturnType<typeof enrichWithCreationWatercourseData>['standardDifficulty'],
    isDitchFairlyCategory: boolean;
    habitatCreatedInAdvance: number | "30+";
}>(data: Data) {
    return { ...data, ...calculateDifficultyData(data) };
}

/**
 * Calculate encroachment multipliers for creation.
 * Used by both on-site and off-site creation calculations.
 */
export function enrichCreationWithEncroachmentData<Data extends {
    watercourseType: WatercourseLabel;
    watercourseEncroachment: WatercourseEncroachment;
    riparianEncroachment: RiparianEncroachment;
}>(data: Data) {
    const watercourseEncroachmentMultiplier = watercourseEncroachmentMultipliers[data.watercourseEncroachment];
    const riparianEncroachmentMultiplier = riparianEncroachmentMultipliers[data.riparianEncroachment];

    return {
        ...data,
        watercourseEncroachmentMultiplier,
        riparianEncroachmentMultiplier,
    };
}

/**
 * Calculate final net unit change for creation.
 * Used by both on-site and off-site creation calculations.
 */
/**
 * Pure calculation: derives unitsDelivered for a watercourse creation.
 */
export function calculateUnitsDelivered(input: {
    length: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    temporalMultiplier: number;
    difficultyMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}) {
    const conditionScore = input.conditionScore as number;

    const unitsDelivered = new Decimal(input.length)
        .mul(input.distinctivenessScore)
        .mul(conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(input.temporalMultiplier)
        .mul(input.difficultyMultiplier)
        .mul(input.watercourseEncroachmentMultiplier)
        .mul(input.riparianEncroachmentMultiplier)
        .toNumber();

    return { unitsDelivered };
}

export function enrichWithUnitsDelivered<Data extends {
    length: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    temporalMultiplier: number;
    difficultyMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateUnitsDelivered(data) };
}

// ============================================================================
// ENHANCEMENT FUNCTIONS
// ============================================================================

/**
 * Fallback years when baseline distinctiveness < proposed distinctiveness
 * (i.e., when upgrading to a rarer habitat type)
 */
export const DISTINCTIVENESS_UPGRADE_YEARS = 10;

/**
 * Helper to convert years value to number for arithmetic.
 * Used in enhancement calculations.
 */
export function yearsToNumber(years: number | "30+"): number {
    return years === "30+" ? 31 : years;
}

/**
 * Extract baseline watercourse data including length.
 * The baseline contains the length that is being enhanced.
 * Generic to work with both OnSiteWatercourseBaseline and OffSiteWatercourseBaseline.
 */
/**
 * Pure restructure: extracts baseline-derived fields onto a flat object.
 */
export function calculateBaselineWatercourseData<
    Baseline extends {
        lengthEnhanced: number;
        watercourseType: WatercourseLabel;
        distinctivenessScore: number;
        distinctiveness: string;
        conditionScore: number | 'Not possible';
        condition: WatercourseCondition;
    }
>(input: { baseline: Baseline }) {
    const { baseline } = input;
    return {
        length: baseline.lengthEnhanced,
        _baselineWatercourse: {
            label: baseline.watercourseType,
            distinctivenessScore: baseline.distinctivenessScore,
            distinctivenessCategory: baseline.distinctiveness,
        },
        _baselineCondition: baseline.conditionScore,
        _baselineConditionLabel: baseline.condition,
    };
}

export function enrichBaselineWatercourseData<
    Baseline extends {
        lengthEnhanced: number;
        watercourseType: WatercourseLabel;
        distinctivenessScore: number;
        distinctiveness: string;
        conditionScore: number | 'Not possible';
        condition: WatercourseCondition;
    },
    Data extends { baseline: Baseline }
>(data: Data) {
    return { ...data, ...calculateBaselineWatercourseData(data) };
}

/**
 * Enrich data with proposed watercourse properties from the watercourses lookup.
 * Used by enhancement modules.
 */
export function enrichProposedWatercourseData<Data extends {
    watercourseType: WatercourseLabel;
    condition: WatercourseCondition;
    strategicSignificance: StrategicSignificanceDescription;
}>(data: Data) {
    const watercourse = allWatercourses[data.watercourseType];

    // Get condition score from watercourse lookup
    const conditionScore = watercourse.conditions[data.condition] as number | 'Not possible';

    const strategicSignificance = getStrategicSignificance(data.strategicSignificance);

    return {
        ...data,
        distinctiveness: watercourse.distinctivenessCategory,
        distinctivenessScore: watercourse.distinctivenessScore,
        conditionScore,
        strategicSignificanceCategory: strategicSignificance.significance,
        strategicSignificanceMultiplier: strategicSignificance.multiplier,
        tradingRules: watercourse.tradingRules,
        technicalDifficulty: watercourse.technicalDifficultyOfEnhancement,
        irreplaceable: watercourse.irreplaceable,
    };
}

/**
 * Add enhancement pathway label.
 * Format: "baseline condition to proposed condition"
 */
/**
 * Pure calculation: derives enhancementPathway label.
 */
export function calculateEnhancementPathway(input: {
    baselineConditionLabel: WatercourseCondition;
    condition: WatercourseCondition;
}) {
    return { enhancementPathway: `${input.baselineConditionLabel} to ${input.condition}` };
}

export function addEnhancementPathway<Data extends {
    _baselineConditionLabel: WatercourseCondition;
    condition: WatercourseCondition;
}>(data: Data) {
    return {
        ...data,
        ...calculateEnhancementPathway({
            baselineConditionLabel: data._baselineConditionLabel,
            condition: data.condition
        })
    };
}

/**
 * Lookup enhancement time to target from watercourse enhancement temporal data.
 * Uses the enhancement pathway (baseline→proposed condition) to find years to target.
 * Special case: If baseline distinctiveness < proposed distinctiveness, use fallback (10 years).
 */
/**
 * Pure calculation: branches on distinctiveness; for upgrades returns the
 * fixed upgrade years, otherwise resolves the pathway against the matrix.
 */
export function calculateEnhancementTimeToTarget(input: {
    baselineDistinctivenessScore: number;
    distinctivenessScore: number;
    enhancementPathway: string;
    enhancementTemporalMatrix: typeof watercourseEnhancementTemporalMatrix;
}) {
    let timeToTargetCondition: number | "N/A";

    if (input.baselineDistinctivenessScore < input.distinctivenessScore) {
        timeToTargetCondition = DISTINCTIVENESS_UPGRADE_YEARS;
    } else {
        const pathwayValue = input.enhancementTemporalMatrix[input.enhancementPathway];
        timeToTargetCondition = pathwayValue !== undefined ? pathwayValue : "N/A";
    }

    return { timeToTargetCondition };
}

export function lookupEnhancementTimeToTarget<Data extends {
    _baselineWatercourse: { distinctivenessScore: number };
    distinctivenessScore: number;
    enhancementPathway: string;
}>(data: Data) {
    return {
        ...data,
        ...calculateEnhancementTimeToTarget({
            baselineDistinctivenessScore: data._baselineWatercourse.distinctivenessScore,
            distinctivenessScore: data.distinctivenessScore,
            enhancementPathway: data.enhancementPathway,
            enhancementTemporalMatrix: watercourseEnhancementTemporalMatrix,
        }),
    };
}

/**
 * Calculate final time to target condition based on:
 * - Standard enhancement time (from enhancement temporal data)
 * - Years of watercourse enhanced in advance
 * - Years of delay in starting enhancement
 */
/**
 * Pure calculation: derives finalTimeToTargetCondition for enhancement.
 */
export function calculateEnhancementFinalTimeToTargetCondition<Data extends {
    timeToTargetCondition: number | "N/A";
    watercourseEnhancedInAdvance: number | "30+";
    watercourseEnhancedDelay: number | "30+";
}>(data: Data) {
    const { timeToTargetCondition, watercourseEnhancedInAdvance, watercourseEnhancedDelay } = data;

    let finalTimeToTargetCondition: number | "30+" | "N/A";
    const normalisedEnhancedInAdvance = yearsToNumber(watercourseEnhancedInAdvance);
    const normalisedEnhancedDelay = yearsToNumber(watercourseEnhancedDelay);

    if (timeToTargetCondition === "N/A") {
        finalTimeToTargetCondition = "N/A";
    }
    else if (normalisedEnhancedInAdvance >= timeToTargetCondition) {
        finalTimeToTargetCondition = 0;
    }
    else {
        const result = new Decimal(timeToTargetCondition).minus(normalisedEnhancedInAdvance).plus(normalisedEnhancedDelay).toNumber();

        if (result > 30) {
            finalTimeToTargetCondition = "30+";
        } else {
            finalTimeToTargetCondition = Decimal.max(0, result).toNumber();
        }
    }

    return {
        ...data,
        finalTimeToTargetCondition,
    };
}

/**
 * Lookup: attaches temporalMultiplier from finalTimeToTargetCondition.
 */
export function lookupEnhancementTemporalMultiplier<Data extends {
    finalTimeToTargetCondition: number | "30+" | "N/A";
}>(data: Data) {
    const finalTimeToTargetCondition = data.finalTimeToTargetCondition;
    const temporalMultiplier = typeof finalTimeToTargetCondition === 'number' || finalTimeToTargetCondition === '30+'
        ? lookupTemporalMultiplier(finalTimeToTargetCondition)
        : finalTimeToTargetCondition;

    return {
        ...data,
        temporalMultiplier,
    };
}

/**
 * Backwards-compatible composed transform: pure calc → lookup.
 */
export function calculateFinalTimeToTargetValues<Data extends {
    timeToTargetCondition: number | "N/A";
    watercourseEnhancedInAdvance: number | "30+";
    watercourseEnhancedDelay: number | "30+";
}>(data: Data) {
    return lookupEnhancementTemporalMultiplier(calculateEnhancementFinalTimeToTargetCondition(data));
}

/**
 * Determine enhancement difficulty based on whether watercourse reached target before losses.
 */
export function calculateEnhancementDifficulty(input: {
    watercourseEnhancedInAdvance: number | "30+";
    finalTimeToTargetCondition: number | "30+" | "N/A";
    standardDifficultyOfEnhancement: Watercourse['technicalDifficultyOfEnhancement'];
}) {
    return calculateEnhancementDifficultyShared({
        enhancedInAdvance: input.watercourseEnhancedInAdvance,
        finalTimeToTargetCondition: input.finalTimeToTargetCondition,
        standardDifficultyOfEnhancement: input.standardDifficultyOfEnhancement as keyof typeof difficulty,
        lowDifficultyMessage: "Low Difficulty - only applicable if all watercourse enhanced before losses ⚠",
    });
}

export function determineEnhancementDifficulty<Data extends {
    watercourseEnhancedInAdvance: number | "30+";
    finalTimeToTargetCondition: number | "30+" | "N/A";
    technicalDifficulty: Watercourse['technicalDifficultyOfEnhancement'];
}>(data: Data) {
    return {
        ...data,
        ...calculateEnhancementDifficulty({
            watercourseEnhancedInAdvance: data.watercourseEnhancedInAdvance,
            finalTimeToTargetCondition: data.finalTimeToTargetCondition,
            standardDifficultyOfEnhancement: data.technicalDifficulty,
        }),
    };
}

/**
 * Calculate encroachment multipliers for enhancement.
 * Used by both on-site and off-site enhancement calculations.
 */
export function enrichEnhancementWithEncroachmentData<Data extends {
    watercourseEncroachment: WatercourseEncroachment;
    riparianEncroachment: RiparianEncroachment;
}>(data: Data) {
    const watercourseEncroachmentMultiplier = watercourseEncroachmentMultipliers[data.watercourseEncroachment];
    const riparianEncroachmentMultiplier = riparianEncroachmentMultipliers[data.riparianEncroachment];

    return {
        ...data,
        watercourseEncroachmentMultiplier,
        riparianEncroachmentMultiplier,
    };
}

/**
 * Calculate watercourse units delivered from enhancement as NET GAIN over baseline.
 *
 * Formula (Delta Method):
 * - If proposed length > baseline length:
 *   ((proposedLength × proposedD × proposedC) - (baselineLength × baselineD × baselineC)) × difficulty × temporal
 *   + (baselineLength × baselineD × baselineC)
 *   then apply: × strategic × watercourseEncroachment × riparianEncroachment
 *
 * - If proposed length <= baseline length:
 *   ((proposedLength × proposedD × proposedC) - (proposedLength × baselineD × baselineC)) × difficulty × temporal
 *   + (proposedLength × baselineD × baselineC)
 *   then apply: × strategic × watercourseEncroachment × riparianEncroachment
 *
 * This accounts for partial enhancement scenarios where only part of baseline is enhanced.
 */
/**
 * Pure calculation: derives watercourseUnitsDelivered for an enhancement.
 */
export function calculateEnhancementUnitsDeliveredPure(input: {
    proposedLength: number;
    baselineLength: number;
    baselineDistinctivenessScore: number;
    baselineConditionScore: number | 'Not possible';
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    temporalMultiplier: number | string;
    difficultyMultiplierApplied: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
}) {
    const proposedLength = input.proposedLength;
    const baselineLength = input.baselineLength;
    const baselineD = input.baselineDistinctivenessScore;
    const baselineC = input.baselineConditionScore as number;
    const proposedD = input.distinctivenessScore;
    const proposedC = input.conditionScore as number;
    const strategic = input.strategicSignificanceMultiplier;
    const difficultyMult = input.difficultyMultiplierApplied;
    const temporal = typeof input.temporalMultiplier === 'number' ? input.temporalMultiplier : 0;
    const watercourseEncroachment = input.watercourseEncroachmentMultiplier;
    const riparianEncroachment = input.riparianEncroachmentMultiplier;

    let watercourseUnitsDelivered: number;

    if (proposedLength > baselineLength) {
        const proposedUnits = new Decimal(proposedLength).mul(proposedD).mul(proposedC);
        const baselineUnits = new Decimal(baselineLength).mul(baselineD).mul(baselineC);
        const delta = proposedUnits.minus(baselineUnits).mul(difficultyMult).mul(temporal);
        watercourseUnitsDelivered = delta.plus(baselineUnits).mul(strategic).mul(watercourseEncroachment).mul(riparianEncroachment).toNumber();
    } else {
        const proposedUnits = new Decimal(proposedLength).mul(proposedD).mul(proposedC);
        const baselineUnits = new Decimal(proposedLength).mul(baselineD).mul(baselineC);
        const delta = proposedUnits.minus(baselineUnits).mul(difficultyMult).mul(temporal);
        watercourseUnitsDelivered = delta.plus(baselineUnits).mul(strategic).mul(watercourseEncroachment).mul(riparianEncroachment).toNumber();
    }

    return { watercourseUnitsDelivered };
}

export function calculateEnhancementUnitsDelivered<
    Baseline extends {
        lengthEnhanced: number;
    },
    Data extends {
        length: number;
        _baselineWatercourse: any;
        _baselineCondition: number | 'Not possible';
        distinctivenessScore: number;
        conditionScore: number | 'Not possible';
        strategicSignificanceMultiplier: number;
        temporalMultiplier: number | string;
        difficultyMultiplierApplied: number;
        watercourseEncroachmentMultiplier: number;
        riparianEncroachmentMultiplier: number;
        baseline: Baseline;
    }
>(data: Data) {
    return {
        ...data,
        ...calculateEnhancementUnitsDeliveredPure({
            proposedLength: data.length,
            baselineLength: data.baseline.lengthEnhanced,
            baselineDistinctivenessScore: data._baselineWatercourse.distinctivenessScore,
            baselineConditionScore: data._baselineCondition,
            distinctivenessScore: data.distinctivenessScore,
            conditionScore: data.conditionScore,
            strategicSignificanceMultiplier: data.strategicSignificanceMultiplier,
            temporalMultiplier: data.temporalMultiplier,
            difficultyMultiplierApplied: data.difficultyMultiplierApplied,
            watercourseEncroachmentMultiplier: data.watercourseEncroachmentMultiplier,
            riparianEncroachmentMultiplier: data.riparianEncroachmentMultiplier,
        })
    };
}
