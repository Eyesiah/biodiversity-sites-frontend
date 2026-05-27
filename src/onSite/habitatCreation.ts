import * as v from 'valibot';
import { Decimal } from '../decimal';
import { broadHabitatSchema } from '../broadHabitats';
import { creationHabitatType, type CreationHabitatType } from '../habitatTypes';
import { conditionSchema } from '../conditions';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { areaSchema, enrichWithCreationData, enrichWithHabitatData, freeTextSchema, isValidCondition, isValidHabitat, safeTransform, yearsSchema } from '../schemaUtils';
import { habitatByBroadAndType, type Habitat } from '../habitats';
import { difficulty } from '../difficulty';
import { lookupFinalTimeToTargetMultiplier } from '../offSite/common';
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
        userComments: freeTextSchema,
        planningAuthorityComments: freeTextSchema,
        habitatReferenceNumber: freeTextSchema,
    })

/**
 * Calculates the final time to target condition and its corresponding multiplier based on:
 * - Standard time to target condition (from habitat temporal multipliers)
 * - Years of habitat creation in advance
 * - Years of delay in starting habitat creation
 *
 * Formula: finalTime = standardTime - advance + delay
 * - Capped at "30+" if result > 30
 * - Returns 0 if advance >= standardTime
 * - Returns "Not Possible" if standardTime is "Not Possible ▲"
 *
 * Also calculates standardOrAdjustedTimeToTarget (column R) which provides validation messages
 * based on the habitat creation parameters.
 *
 * Also looks up the temporal multiplier for the calculated final time.
 *
 * Corresponds to formulas in Excel cells R12, S12, and T12 of sheet A-2
 */
/**
 * Pure calculation: derives standardOrAdjustedTimeToTarget and finalTimeToTargetCondition.
 *
 * Reads timeToPoorCondition from data._habitat.temporalMultipliers['Poor'] (already attached
 * by enrichWithHabitatData earlier in the pipeline).
 */
const calculateFinalTimeToTargetCondition = <Data extends {
    broadHabitat: string,
    habitatType: string,
    distinctivenessScore: number,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatCreationInAdvance: number | "30+",
    habitatCreationDelay: number | "30+",
    _habitat: Habitat
}>(data: Data) => {
    const { timeToTargetCondition, habitatCreationInAdvance, habitatCreationDelay, distinctivenessScore } = data;

    const timeToPoorCondition = data._habitat.temporalMultipliers['Poor'];

    const normalisedHabitatCreationInAdvance = typeof habitatCreationInAdvance === "string" ? 30 : habitatCreationInAdvance;
    const normalisedHabitatCreationDelay = typeof habitatCreationDelay === "string" ? 30 : habitatCreationDelay;

    let standardOrAdjustedTimeToTarget = calculateStandardOrAdjustedTimeToTarget(
        normalisedHabitatCreationInAdvance,
        habitatCreationInAdvance,
        normalisedHabitatCreationDelay,
        habitatCreationDelay,
        distinctivenessScore,
        timeToTargetCondition,
        timeToPoorCondition
    );

    let finalTimeToTargetCondition: number | "30+" | "Not Possible ▲";

    if (timeToTargetCondition === "Not Possible ▲") {
        finalTimeToTargetCondition = "Not Possible ▲";
    }
    else if (timeToTargetCondition === "30+") {
        if (habitatCreationInAdvance === 0) {
            finalTimeToTargetCondition = "30+";
        } else {
            finalTimeToTargetCondition = Decimal.max(0, new Decimal(30).minus(normalisedHabitatCreationInAdvance)).toNumber();
        }
    }
    else if (normalisedHabitatCreationInAdvance >= timeToTargetCondition && normalisedHabitatCreationInAdvance !== 0 && timeToTargetCondition !== 0) {
        finalTimeToTargetCondition = 0;
    }
    else {
        const result = new Decimal(timeToTargetCondition).minus(normalisedHabitatCreationInAdvance).plus(normalisedHabitatCreationDelay).toNumber();

        if (result > 30) {
            finalTimeToTargetCondition = "30+";
        } else {
            finalTimeToTargetCondition = Decimal.max(0, result).toNumber();
        }
    }

    return {
        ...data,
        standardOrAdjustedTimeToTarget,
        finalTimeToTargetCondition,
    };
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
 * Corresponds to columns U-X in Excel sheet A-2
 */
/**
 * Pure calculation: derives all difficulty fields from resolved habitat difficulty values.
 */
export function calculateDifficultyData(input: {
    habitatType: CreationHabitatType,
    standardOrAdjustedTimeToTarget: ReturnType<typeof calculateStandardOrAdjustedTimeToTarget>,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatCreationInAdvance: number | "30+",
    standardDifficultyOfCreation: Habitat['technicalDifficultyCreation'],
    technicalDifficultyEnhancement: Habitat['technicalDifficultyEnhancement'],
}) {
    const appliedDifficultyMultiplier = calculateAppliedDifficultyMultiplier(
        input.standardOrAdjustedTimeToTarget,
        input.habitatType,
    );
    const finalDifficultyOfCreation = calculateFinalDifficultyOfCreation(
        appliedDifficultyMultiplier,
        input.timeToTargetCondition,
        input.habitatCreationInAdvance,
        input.standardDifficultyOfCreation,
        input.technicalDifficultyEnhancement,
    );
    const difficultyMultiplierApplied = calculateDifficultyMultiplierApplied(finalDifficultyOfCreation);

    return {
        standardDifficultyOfCreation: input.standardDifficultyOfCreation,
        appliedDifficultyMultiplier,
        finalDifficultyOfCreation,
        difficultyMultiplierApplied,
    };
}

export const enrichWithDifficultyData = <Data extends {
    broadHabitat: string,
    habitatType: CreationHabitatType,
    standardOrAdjustedTimeToTarget: ReturnType<typeof calculateStandardOrAdjustedTimeToTarget>,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatCreationInAdvance: number | "30+",
    finalTimeToTargetCondition: number | "30+" | "Not Possible ▲"
}>(data: Data) => {
    const habitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

    return {
        ...data,
        ...calculateDifficultyData({
            habitatType: data.habitatType,
            standardOrAdjustedTimeToTarget: data.standardOrAdjustedTimeToTarget,
            timeToTargetCondition: data.timeToTargetCondition,
            habitatCreationInAdvance: data.habitatCreationInAdvance,
            standardDifficultyOfCreation: habitat.technicalDifficultyCreation,
            technicalDifficultyEnhancement: habitat.technicalDifficultyEnhancement,
        }),
    };
}

export function calculateStandardOrAdjustedTimeToTarget(
    normalisedHabitatCreationInAdvance: number,
    habitatCreationInAdvance: "30+" | number,
    normalisedHabitatCreationDelay: number,
    habitatCreationDelay: "30+" | number,
    distinctivenessScore: number,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    timeToPoorCondition: Habitat['temporalMultipliers']['Poor'],
) {
    // Check for conflict: both advance and delay specified
    if ((normalisedHabitatCreationInAdvance > 0 || habitatCreationInAdvance === "30+") &&
        (normalisedHabitatCreationDelay > 0 || habitatCreationDelay === "30+")) {
        return "Error -both advance and delayed habitat creation ▲" as const;
    }

    // If distinctiveness score is 0, use standard time
    if (distinctivenessScore === 0) {
        return "Standard time to target condition applied" as const;
    }

    // Check if habitat has reached target condition (advance >= standard time)
    if (timeToTargetCondition !== "Not Possible ▲" &&
        timeToTargetCondition !== "30+" &&
        normalisedHabitatCreationInAdvance >= timeToTargetCondition) {
        return "Check details - Is there evidence that habitat has reached target condition? ⚠" as const;
    }

    // Check if standard time is empty (this shouldn't happen with our types, but for completeness)
    if (timeToTargetCondition === "Not Possible ▲" && normalisedHabitatCreationInAdvance > 0) {
        return "" as const;
    }

    // Check if Poor condition threshold reached
    if (timeToPoorCondition !== "Not Possible ▲" &&
        typeof timeToPoorCondition === 'number' &&
        normalisedHabitatCreationInAdvance >= timeToPoorCondition &&
        normalisedHabitatCreationInAdvance > 0) {
        return "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠" as const;
    }

    // Check if habitat creation is in advance but hasn't reached target
    if (timeToTargetCondition !== "Not Possible ▲" &&
        timeToTargetCondition !== "30+" &&
        normalisedHabitatCreationInAdvance < timeToTargetCondition &&
        normalisedHabitatCreationInAdvance > 0) {
        return "Check details - Is there evidence habitat creation in place? ⚠" as const;
    }

    // Check if there's a delay in starting
    if (normalisedHabitatCreationDelay > 0 || habitatCreationDelay === "30+") {
        return "Check details- Delay in starting habitat in required condition? ⚠" as const;
    }

    // Check if habitat creation started (but not in advance enough to trigger other conditions)
    if (normalisedHabitatCreationInAdvance > 0 || habitatCreationInAdvance === "30+") {
        return "Check details - Is there evidence habitat creation started/in place? ⚠" as const;
    }

    // Default: standard time applied
    return "Standard time to target condition applied" as const;
}

/*
    * Column W - Final difficulty of creation
*/
export function calculateFinalDifficultyOfCreation(
    appliedDifficultyMultiplier: ReturnType<typeof calculateAppliedDifficultyMultiplier>,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatCreationInAdvance: v.InferOutput<typeof yearsSchema>,
    standardDifficultyOfCreation: Habitat['technicalDifficultyCreation'],
    technicalDifficultyEnhancement: Habitat['technicalDifficultyEnhancement'],
) {
    if ((appliedDifficultyMultiplier === "Standard difficulty applied" && timeToTargetCondition > habitatCreationInAdvance)) {
        return standardDifficultyOfCreation;
    }
    if ((appliedDifficultyMultiplier === "Low Difficulty - only applicable if all habitat created before losses ⚠" && habitatCreationInAdvance >= timeToTargetCondition)) {
        return "Low"
    }

    return technicalDifficultyEnhancement;
}

/* Column V - applied difficulty multiplier
*/
export function calculateAppliedDifficultyMultiplier(
    standardOrAdjustedTimeToTarget: ReturnType<typeof calculateStandardOrAdjustedTimeToTarget>,
    type: CreationHabitatType,
) {
    if (standardOrAdjustedTimeToTarget === "Check details - Is there evidence that habitat has reached target condition? ⚠") {
        return "Low Difficulty - only applicable if all habitat created before losses ⚠"
    }

    if (
        standardOrAdjustedTimeToTarget === "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠"
        && ![
            "Traditional orchards", "Ornamental lake or pond", "Ponds (non-priority habitat)", "Ruderal/Ephemeral", "Tall forbs", "Developed land; sealed surface"
        ].includes(type)

    ) {
        return "Enhancement difficulty applied"
    }

    return "Standard difficulty applied"
}

/* Column X - Difficulty multiplier applied */
export function calculateDifficultyMultiplierApplied(finalDifficultyOfCreation: ReturnType<typeof calculateFinalDifficultyOfCreation>) {
    return difficulty[finalDifficultyOfCreation];
}

/**
 * Calculates habitat units delivered for on-site habitat creation.
 *
 * Formula: Area × Distinctiveness Score × Condition Score × Strategic Significance Multiplier
 *          × Final Time to Target Multiplier × Difficulty Multiplier
 *
 * If finalTimeToTargetMultiplier is undefined (e.g., "Not Possible ▲"), returns 0 units.
 *
 * Corresponds to column Y in Excel sheet A-2
 */
const enrichWithHabitatUnitsDelivered = <Data extends {
    area: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
    finalTimeToTargetMultiplier: number | undefined,
    difficultyMultiplierApplied: number
}>(data: Data) => {
    const { habitatUnitsDelivered } = calculateHabitatUnitsDelivered(data);
    return { ...data, habitatUnitsDelivered };
}

export const onSiteHabitatCreationSchema = v.pipe(
    inputSchema,
    v.forward(v.check(s => isValidHabitat(s.broadHabitat, s.habitatType), "The broad habitat and habitat type are incompatible"), ['habitatType']),
    v.forward(v.check(s => isValidCondition(s.broadHabitat, s.habitatType, s.condition), "The condition for this habitat is invalid"), ['condition']),
    v.check(
        s => !(
            (typeof s.habitatCreationInAdvance === "string" || s.habitatCreationInAdvance > 0)
            && (typeof s.habitatCreationDelay === "string" || s.habitatCreationDelay > 0)
        ),
        "Cannot have both habitat creation in advance and delay in starting habitat creation"
    ),
    v.transform(enrichWithHabitatData),
    v.transform(enrichWithCreationData),
    v.transform(calculateFinalTimeToTargetCondition),
    v.transform(lookupFinalTimeToTargetMultiplier),
    v.transform(enrichWithDifficultyData),
    v.transform(enrichWithHabitatUnitsDelivered)
)
export type OnSiteHabitatCreation = v.InferOutput<typeof onSiteHabitatCreationSchema>
export type OnSiteHabitatCreationSchema = v.InferInput<typeof onSiteHabitatCreationSchema>

export const onSiteHabitatCreationUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithHabitatData),
    safeTransform(enrichWithCreationData),
    safeTransform(calculateFinalTimeToTargetCondition),
    safeTransform(lookupFinalTimeToTargetMultiplier),
    safeTransform(enrichWithDifficultyData),
    safeTransform(enrichWithHabitatUnitsDelivered),
)

