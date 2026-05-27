import * as v from 'valibot';
import { allHedgerows, type HedgerowLabel } from '../hedgerows';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { freeTextSchema, lengthSchema, safeTransform, yearsSchema } from '../schemaUtils';
import { getStrategicSignificance, type StrategicSignificanceDescription } from '../strategicSignificanceSchema';
import { hedgerowConditionSchema, type HedgerowCondition } from '../hedgerowCondition';
import { spatialRiskCategorySchema, getSpatialRiskMultiplier } from '../spatialRisk';
import { lookupTemporalMultiplier } from '../temporalMultipliers';
import { difficulty } from '../difficulty';
import { hedgerowTypeSchema } from '../hedgerowType';
import {
    calculateFinalTimeToTargetCondition as calculateFinalTimeToTargetConditionPure,
    calculateHedgerowUnitsDelivered,
} from '../hedgerowCalc';

const inputSchema = v.object({
    habitatType: hedgerowTypeSchema,
    length: lengthSchema,
    condition: hedgerowConditionSchema,
    strategicSignificance: strategicSignificanceSchema,
    spatialRiskCategory: v.optional(spatialRiskCategorySchema),
    habitatCreatedInAdvance: v.optional(yearsSchema, 0),
    delayInStartingHabitatCreation: v.optional(yearsSchema, 0),
    userComments: freeTextSchema,
    planningAuthorityComments: freeTextSchema,
    habitatReferenceNumber: freeTextSchema,
    offSiteReferenceNumber: freeTextSchema,
    baselineReferenceNumber: freeTextSchema,
});

export const offSiteHedgerowCreationSchema = v.pipe(
    inputSchema,
    // Validate that the habitat type is valid
    v.forward(v.check(s => !!allHedgerows[s.habitatType], "Invalid hedgerow habitat type"), ['habitatType']),
    // Check if Non-native and ornamental hedgerow has only Poor condition
    v.forward(v.check(
        s => !(s.habitatType === "Non-native and ornamental hedgerow" && s.condition !== "Poor"),
        "Non-native and ornamental hedgerow can only have Poor condition"
    ), ['condition']),
    // Check that both advance and delay are not both > 0 (invalid scenario)
    v.check(
        s => {
            const hasAdvance = s.habitatCreatedInAdvance === "30+" || (typeof s.habitatCreatedInAdvance === "number" && s.habitatCreatedInAdvance > 0);
            const hasDelay = s.delayInStartingHabitatCreation === "30+" || (typeof s.delayInStartingHabitatCreation === "number" && s.delayInStartingHabitatCreation > 0);
            return !(hasAdvance && hasDelay);
        },
        "Cannot have both habitat created in advance and delay in starting creation"
    ),
    // Enrich with hedgerow data
    v.transform(enrichWithHedgerowData),
    // Enrich with spatial risk multiplier
    v.transform(enrichWithSpatialRiskMultiplier),
    // Calculate temporal data
    v.transform(lookupStandardTimeToTargetCondition),
    v.transform(calculateFinalTimeToTargetCondition),
    v.transform(lookupTemporalMultiplierStep),
    // Calculate difficulty data
    v.transform(enrichWithDifficultyData),
    // Check that off-site reference is required when spatial risk is set
    v.forward(v.check(
        s => !(s.spatialRiskCategory && !s.offSiteReferenceNumber),
        "Off-site reference required ▲"
    ), ['offSiteReferenceNumber']),
    // Calculate hedgerow units delivered (with and without spatial risk)
    v.transform(enrichWithHedgerowUnitsDelivered),
);

export type OffSiteHedgerowCreationSchema = v.InferInput<typeof offSiteHedgerowCreationSchema>;
export type OffSiteHedgerowCreation = v.InferOutput<typeof offSiteHedgerowCreationSchema>;

export const offSiteHedgerowCreationUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithHedgerowData),
    safeTransform(enrichWithSpatialRiskMultiplier),
    safeTransform(lookupStandardTimeToTargetCondition),
    safeTransform(calculateFinalTimeToTargetCondition),
    safeTransform(lookupTemporalMultiplierStep),
    safeTransform(enrichWithDifficultyData),
    safeTransform(enrichWithHedgerowUnitsDelivered),
);

/**
 * Enrich data with hedgerow properties from the hedgerows lookup
 */
export function enrichWithHedgerowData<Data extends {
    habitatType: HedgerowLabel;
    condition: HedgerowCondition;
    strategicSignificance: StrategicSignificanceDescription;
}>(data: Data) {
    const hedgerow = allHedgerows[data.habitatType];

    // Get condition score - hedgerows use simplified scoring
    // Based on the metric: Good = 3, Moderate = 2, Poor = 1
    const conditionScoreMap: Record<HedgerowCondition, number> = {
        "Good": 3,
        "Moderate": 2,
        "Poor": 1,
    };

    const strategicSignificance = getStrategicSignificance(data.strategicSignificance);

    return {
        ...data,
        distinctiveness: hedgerow.distinctivenessCategory,
        distinctivenessScore: hedgerow.distinctivenessScore,
        conditionScore: conditionScoreMap[data.condition],
        strategicSignificanceCategory: strategicSignificance.significance,
        strategicSignificanceMultiplier: strategicSignificance.multiplier,
        tradingRules: hedgerow.tradingRules,
        technicalDifficultyCreation: hedgerow.technicalDifficultyCreation,
        technicalDifficultyCreationMultiplier: hedgerow.technicalDifficultyCreationMultiplier,
    };
}

/**
 * Enrich data with spatial risk multiplier.
 * If spatialRiskCategory is not provided, defaults to 1.0 (no spatial risk adjustment)
 */
export function enrichWithSpatialRiskMultiplier<Data extends {
    spatialRiskCategory?: string;
}>(data: Data) {
    const spatialRiskMultiplier = data.spatialRiskCategory
        ? getSpatialRiskMultiplier(data.spatialRiskCategory as any)
        : 1.0;

    return {
        ...data,
        spatialRiskMultiplier,
    };
}

/**
 * Lookup: attaches standardTimeToTargetCondition from hedgerow.yearsToTargetConditionViaCreation.
 */
export function lookupStandardTimeToTargetCondition<Data extends {
    habitatType: HedgerowLabel;
    condition: HedgerowCondition;
}>(data: Data) {
    const hedgerow = allHedgerows[data.habitatType];
    const yearsMap = hedgerow.yearsToTargetConditionViaCreation;
    const standardTimeToTargetCondition = yearsMap[data.condition as keyof typeof yearsMap];

    return {
        ...data,
        standardTimeToTargetCondition,
    };
}

/**
 * Pipeline transform: calls the pure final-time calculation and merges into data.
 */
export function calculateFinalTimeToTargetCondition<Data extends {
    standardTimeToTargetCondition: number | string | undefined;
    habitatCreatedInAdvance: number | "30+";
    delayInStartingHabitatCreation: number | "30+";
}>(data: Data) {
    return { ...data, ...calculateFinalTimeToTargetConditionPure(data) };
}

/**
 * Lookup: attaches temporalMultiplier from finalTimeToTargetCondition.
 */
export function lookupTemporalMultiplierStep<Data extends {
    finalTimeToTargetCondition: number | string | undefined;
}>(data: Data) {
    const finalTimeToTarget = data.finalTimeToTargetCondition;
    const temporalMultiplier = typeof finalTimeToTarget === 'number' || finalTimeToTarget === '30+'
        ? lookupTemporalMultiplier(finalTimeToTarget)
        : finalTimeToTarget;

    return {
        ...data,
        temporalMultiplier,
    };
}

/**
 * Backwards-compatible composed transform: lookup → calc → lookup.
 */
export function enrichWithTemporalData<Data extends {
    habitatType: HedgerowLabel;
    condition: HedgerowCondition;
    habitatCreatedInAdvance: number | "30+";
    delayInStartingHabitatCreation: number | "30+";
}>(data: Data) {
    return lookupTemporalMultiplierStep(
        calculateFinalTimeToTargetCondition(
            lookupStandardTimeToTargetCondition(data)
        )
    );
}

/**
 * Calculate difficulty data: determine final difficulty and multiplier
 */
export function enrichWithDifficultyData<Data extends {
    habitatType: HedgerowLabel;
    habitatCreatedInAdvance: number | "30+";
    standardTimeToTargetCondition: number | string | undefined;
    finalTimeToTargetCondition: number | string | undefined;
    technicalDifficultyCreation: string;
    technicalDifficultyCreationMultiplier: number;
}>(data: Data) {
    const hedgerow = allHedgerows[data.habitatType];
    const standardDifficulty = hedgerow.technicalDifficultyCreation;

    // Determine final difficulty
    // Logic from Excel: If habitat created in advance and final time <= 0, use "Low" difficulty
    // Otherwise, use standard difficulty
    let finalDifficulty = standardDifficulty;
    let difficultyMultiplier = hedgerow.technicalDifficultyCreationMultiplier;

    const isCreatedInAdvance = data.habitatCreatedInAdvance === "30+" ||
        (typeof data.habitatCreatedInAdvance === "number" && data.habitatCreatedInAdvance > 0);
    const finalTime = typeof data.finalTimeToTargetCondition === 'number'
        ? data.finalTimeToTargetCondition
        : 999; // Large number for non-numeric values

    if (isCreatedInAdvance && finalTime <= 0) {
        finalDifficulty = 'Low';
        difficultyMultiplier = difficulty['Low'];
    }

    return {
        ...data,
        standardDifficulty,
        finalDifficulty,
        difficultyMultiplier,
    };
}

/**
 * Pipeline transform: calls the shared pure units-delivered calculation and merges
 * both with-spatial-risk and without into data.
 */
export function enrichWithHedgerowUnitsDelivered<Data extends {
    length: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    temporalMultiplier: number | string | undefined;
    difficultyMultiplier: number;
    spatialRiskMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateHedgerowUnitsDelivered(data) };
}
