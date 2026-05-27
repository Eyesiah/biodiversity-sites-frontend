import * as v from 'valibot';
import { broadHabitatSchema } from '../broadHabitats';
import { creationHabitatType } from '../habitatTypes';
import { conditionSchema } from '../conditions';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { areaSchema, enrichWithCreationData, enrichWithHabitatData, freeTextSchema, isValidCondition, isValidHabitat, safeTransform, yearsSchema } from '../schemaUtils';
import { spatialRiskCategorySchema } from '../spatialRisk';
import { habitatByBroadAndType } from '../habitats';
import { difficulty } from '../difficulty';
import { calculateFinalTimeToTargetCondition as calculateFinalTimeToTargetConditionCommon, lookupFinalTimeToTargetMultiplier, enrichWithSpatialRisk } from './common';
import { calculateHabitatUnitsDelivered } from '../habitatCalc';

const inputSchema =
    v.object({
        broadHabitat: broadHabitatSchema,
        habitatType: creationHabitatType,
        area: areaSchema,
        condition: conditionSchema,
        strategicSignificance: strategicSignificanceSchema,
        habitatCreationInAdvance: v.optional(yearsSchema, 0),
        habitatCreationDelay: v.optional(yearsSchema, 0),
        spatialRiskCategory: spatialRiskCategorySchema,
        userComments: freeTextSchema,
        planningAuthorityComments: freeTextSchema,
        habitatReferenceNumber: freeTextSchema,
        offSiteReferenceNumber: freeTextSchema,
        baselineReferenceNumber: freeTextSchema,
    })

/**
 * Calculates the final time to target condition and its corresponding multiplier based on:
 * - Standard time to target condition (from habitat temporal multipliers)
 * - Years of habitat creation in advance
 * - Years of delay in starting habitat creation
 *
 * Corresponds to formula in Excel cell S11 of sheet D-2
 */
const calculateFinalTimeToTargetCondition = <Data extends {
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatCreationInAdvance: number | "30+",
    habitatCreationDelay: number | "30+"
}>(data: Data) => {
    return calculateFinalTimeToTargetConditionCommon({
        ...data,
        advance: data.habitatCreationInAdvance,
        delay: data.habitatCreationDelay,
    });
}

/**
 * Enriches data with difficulty-related properties.
 *
 * Calculates:
 * - standardDifficultyOfCreation: The standard technical difficulty for habitat creation
 * - appliedDifficultyMultiplier: A message indicating which difficulty logic was applied
 * - finalDifficultyOfCreation: The actual difficulty level used for calculations
 * - difficultyMultiplierApplied: The numeric multiplier value
 *
 * Corresponds to columns U-X in Excel sheet D-2
 */
/**
 * Pure calculation: derives all difficulty fields from resolved habitat values.
 */
export function calculateDifficultyData(input: {
    habitatType: string,
    habitatCreationInAdvance: number | "30+",
    finalTimeToTargetCondition: number | "30+" | "Not Possible ▲",
    standardDifficultyOfCreation: keyof typeof difficulty,
    technicalDifficultyEnhancement: keyof typeof difficulty,
    timeToPoorCondition: number | "30+" | "Not Possible ▲",
}) {
    const normalisedHabitatCreationInAdvance = typeof input.habitatCreationInAdvance === "string" ? 30 : input.habitatCreationInAdvance;

    const excludedHabitats = [
        "Traditional orchards",
        "Ornamental lake or pond",
        "Ponds (non-priority habitat)",
        "Ruderal/Ephemeral",
        "Tall forbs",
        "Developed land; sealed surface"
    ];

    const hasReachedTargetCondition =
        normalisedHabitatCreationInAdvance > 0 &&
        input.finalTimeToTargetCondition === 0;

    const hasReachedPoorThreshold =
        normalisedHabitatCreationInAdvance > 0 &&
        input.timeToPoorCondition !== "Not Possible ▲" &&
        (input.timeToPoorCondition === 0 ||
            (typeof input.timeToPoorCondition === 'number' && normalisedHabitatCreationInAdvance >= input.timeToPoorCondition)) &&
        !hasReachedTargetCondition;

    let appliedDifficultyMultiplier: string;
    if (hasReachedTargetCondition) {
        appliedDifficultyMultiplier = "Low Difficulty - only applicable if all habitat created before losses ⚠";
    } else if (hasReachedPoorThreshold && !excludedHabitats.includes(input.habitatType)) {
        appliedDifficultyMultiplier = "Enhancement difficulty applied";
    } else {
        appliedDifficultyMultiplier = "Standard difficulty applied";
    }

    let finalDifficultyOfCreation: keyof typeof difficulty;
    if (appliedDifficultyMultiplier === "Low Difficulty - only applicable if all habitat created before losses ⚠") {
        finalDifficultyOfCreation = "Low";
    } else if (appliedDifficultyMultiplier === "Enhancement difficulty applied") {
        finalDifficultyOfCreation = input.technicalDifficultyEnhancement;
    } else {
        finalDifficultyOfCreation = input.standardDifficultyOfCreation;
    }

    const difficultyMultiplierApplied = difficulty[finalDifficultyOfCreation];

    return {
        standardDifficultyOfCreation: input.standardDifficultyOfCreation,
        appliedDifficultyMultiplier,
        finalDifficultyOfCreation,
        difficultyMultiplierApplied,
    };
}

const enrichWithDifficultyData = <Data extends {
    broadHabitat: string,
    habitatType: string,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatCreationInAdvance: number | "30+",
    finalTimeToTargetCondition: number | "30+" | "Not Possible ▲"
}>(data: Data) => {
    const habitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

    return {
        ...data,
        ...calculateDifficultyData({
            habitatType: data.habitatType,
            habitatCreationInAdvance: data.habitatCreationInAdvance,
            finalTimeToTargetCondition: data.finalTimeToTargetCondition,
            standardDifficultyOfCreation: habitat.technicalDifficultyCreation,
            technicalDifficultyEnhancement: habitat.technicalDifficultyEnhancement,
            timeToPoorCondition: habitat.temporalMultipliers['Poor'],
        }),
    };
}

/**
 * Enriches data with spatial risk multiplier.
 *
 * Corresponds to column Z in Excel sheet D-2
 */
const enrichWithSpatialRiskData = enrichWithSpatialRisk;

/**
 * Calculates habitat units delivered for off-site habitat creation.
 *
 * Two calculations:
 * 1. habitatUnitsDeliveredWithSpatialRisk: Area × Distinctiveness Score × Condition Score ×
 *    Strategic Significance Multiplier × Final Time to Target Multiplier × Difficulty Multiplier ×
 *    Spatial Risk Multiplier
 * 2. habitatUnitsDelivered: Same as above but without Spatial Risk Multiplier
 *
 * If finalTimeToTargetMultiplier is undefined (e.g., "Not Possible ▲"), returns 0 units.
 *
 * Corresponds to columns AA and AB in Excel sheet D-2
 */
const enrichWithHabitatUnitsDelivered = <Data extends {
    area: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
    finalTimeToTargetMultiplier: number | undefined,
    difficultyMultiplierApplied: number,
    spatialRiskMultiplier: number
}>(data: Data) => {
    return { ...data, ...calculateHabitatUnitsDelivered(data) };
}

export const offSiteHabitatCreationSchema = v.pipe(
    inputSchema,
    v.forward(v.check(s => isValidHabitat(s.broadHabitat, s.habitatType), "The broad habitat and habitat type are incompatible"), ['habitatType']),
    v.forward(v.check(s => isValidCondition(s.broadHabitat, s.habitatType, s.condition), "The condition for this habitat is invalid"), ['condition']),
    v.check(
        s => !(
            (s.habitatCreationInAdvance === "30+" || s.habitatCreationInAdvance > 0)
            && (s.habitatCreationDelay === "30+" || s.habitatCreationDelay > 0)
        ),
        "Cannot have both habitat creation in advance and delay in starting habitat creation"
    ),
    v.transform(enrichWithHabitatData),
    v.transform(enrichWithCreationData),
    v.transform(calculateFinalTimeToTargetCondition),
    v.transform(lookupFinalTimeToTargetMultiplier),
    v.transform(enrichWithDifficultyData),
    v.transform(enrichWithSpatialRiskData),
    v.transform(enrichWithHabitatUnitsDelivered)
)

export type OffSiteHabitatCreationSchema = v.InferInput<typeof offSiteHabitatCreationSchema>
export type OffSiteHabitatCreation = v.InferOutput<typeof offSiteHabitatCreationSchema>

export const offSiteHabitatCreationUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithHabitatData),
    safeTransform(enrichWithCreationData),
    safeTransform(calculateFinalTimeToTargetCondition),
    safeTransform(lookupFinalTimeToTargetMultiplier),
    safeTransform(enrichWithDifficultyData),
    safeTransform(enrichWithSpatialRiskData),
    safeTransform(enrichWithHabitatUnitsDelivered),
)

