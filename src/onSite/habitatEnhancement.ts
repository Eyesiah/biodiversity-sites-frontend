import * as v from 'valibot';
import { broadHabitatSchema } from '../broadHabitats';
import { enhancedHabitatType } from '../habitatTypes';
import { conditionSchema } from '../conditions';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { enrichWithHabitatData, freeTextSchema, isValidCondition, isValidHabitat, safeTransform, yearsSchema } from '../schemaUtils';
import { onSiteHabitatBaselineSchema, onSiteHabitatBaselineUncheckedSchema, type OnSiteHabitatBaseline } from './habitatBaseline';
import { habitatByBroadAndType, type Habitat } from '../habitats';
import { difficulty } from '../difficulty';
import { lookupFinalTimeToTargetMultiplier } from '../offSite/common';
import { Decimal } from '../decimal';
import { calculateEnhancementUnitsDelivered } from '../habitatCalc';
import { calculateEnhancementDifficulty as calculateEnhancementDifficultyShared } from '../enhancementDifficultyCalc';

const inputSchema = v.object({
    baseline: onSiteHabitatBaselineSchema,
    broadHabitat: broadHabitatSchema,
    habitatType: enhancedHabitatType,
    condition: conditionSchema,
    strategicSignificance: strategicSignificanceSchema,
    habitatEnhancedInAdvance: v.optional(yearsSchema, 0),
    habitatEnhancedDelay: v.optional(yearsSchema, 0),
    userComments: freeTextSchema,
    planningAuthorityComments: freeTextSchema,
    habitatReferenceNumber: freeTextSchema,
})

/**
 * Extract baseline habitat data including area
 * The baseline contains the area that is being enhanced
 */
const enrichBaselineHabitatData = <Data extends {
    baseline: OnSiteHabitatBaseline
}>(data: Data) => {
    const { baseline } = data;
    const baselineHabitat = habitatByBroadAndType(baseline.broadHabitat, baseline.habitatType)!

    return {
        ...data,
        area: baseline.areaEnhanced,
        _baselineHabitat: baselineHabitat,
        _baselineCondition: baseline.conditionScore,
    };
}

/**
 * Lookup enhancement time to target from habitat enhancement temporal multipliers
 * Uses the enhancement pathway (baseline→proposed condition) to find years to target
 */
/**
 * Pure calculation: resolves a pathway key against an enhancement-temporal map,
 * falling back to "Not Possible ▲" when the key is missing.
 */
export function calculateEnhancementTimeToTarget(input: {
    enhancementTemporalMultipliers: Habitat['enhancementTemporalMultipliers'],
    conditionChange: string,
}) {
    const value = input.enhancementTemporalMultipliers[input.conditionChange as keyof typeof input.enhancementTemporalMultipliers];
    const timeToTargetCondition: number | "30+" | "Not Possible ▲" = value ? value : "Not Possible ▲";
    return { timeToTargetCondition };
}

const lookupEnhancementTimeToTarget = <Data extends {
    _habitat: Habitat,
    conditionChange: ReturnType<typeof addDistinctivenessAndConditionChange>['conditionChange'],
}>(data: Data) => {
    return {
        ...data,
        ...calculateEnhancementTimeToTarget({
            enhancementTemporalMultipliers: data._habitat.enhancementTemporalMultipliers,
            conditionChange: data.conditionChange,
        }),
    };
}

/**
 * Calculate final time to target condition based on:
 * - Column AD: Standard enhancement time (from enhancement temporal multipliers)
 * - Column AE: Years of habitat enhanced in advance (input)
 * - Column AF: Years of delay in starting enhancement (input)
 * - Column AG: Standard or adjusted time to target condition
 * - Column AH: Final time to target condition (years)
 * - Column AI: Final time to target multiplier
 *
 * Matches Excel columns AD-AI in sheet A-3
 */
const calculateFinalTimeToTargetCondition = <Data extends {
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatEnhancedInAdvance: number | "30+",
    habitatEnhancedDelay: number | "30+"
}>(data: Data) => {
    const { timeToTargetCondition, habitatEnhancedInAdvance, habitatEnhancedDelay } = data;

    const standardTimeToTargetCondition = timeToTargetCondition;

    let standardOrAdjustedTimeToTargetCondition: string;
    const hasAdvance = typeof habitatEnhancedInAdvance === "string" || habitatEnhancedInAdvance > 0;
    const hasDelay = typeof habitatEnhancedDelay === "string" || habitatEnhancedDelay > 0;

    if (hasAdvance) {
        const normalisedAdvance = typeof habitatEnhancedInAdvance === "string" ? 30 : habitatEnhancedInAdvance;
        const normalisedStandardTime = typeof timeToTargetCondition === "string" ?
            (timeToTargetCondition === "30+" ? 30 : Infinity) : timeToTargetCondition;

        if (normalisedAdvance >= normalisedStandardTime) {
            standardOrAdjustedTimeToTargetCondition = "Check details - Is there evidence that habitat has reached target condition? ⚠";
        } else {
            standardOrAdjustedTimeToTargetCondition = "Check details - Is there evidence habitat creation started/in place? ⚠";
        }
    } else if (hasDelay) {
        standardOrAdjustedTimeToTargetCondition = "Check details- Delay in starting habitat in required condition? ⚠";
    } else {
        standardOrAdjustedTimeToTargetCondition = "Standard time to target condition applied";
    }

    let finalTimeToTargetCondition: number | "30+" | "Not Possible ▲";
    const normalisedHabitatEnhancedInAdvance = typeof habitatEnhancedInAdvance === "string" ? 30 : habitatEnhancedInAdvance;
    const normalisedHabitatEnhancedDelay = typeof habitatEnhancedDelay === "string" ? 30 : habitatEnhancedDelay;

    if (timeToTargetCondition === "Not Possible ▲") {
        finalTimeToTargetCondition = "Not Possible ▲";
    }
    else if (timeToTargetCondition === "30+") {
        if (habitatEnhancedInAdvance === 0) {
            finalTimeToTargetCondition = "30+";
        } else if (habitatEnhancedInAdvance === "30+") {
            finalTimeToTargetCondition = 0;
        } else if (normalisedHabitatEnhancedInAdvance < 30) {
            finalTimeToTargetCondition = new Decimal(30).minus(normalisedHabitatEnhancedInAdvance).toNumber();
        } else {
            finalTimeToTargetCondition = new Decimal(30).minus(normalisedHabitatEnhancedInAdvance).toNumber();
        }
    }
    else if (normalisedHabitatEnhancedInAdvance > timeToTargetCondition) {
        finalTimeToTargetCondition = 0;
    }
    else if (habitatEnhancedDelay === "30+") {
        finalTimeToTargetCondition = "30+";
    }
    else {
        const result = new Decimal(timeToTargetCondition).plus(normalisedHabitatEnhancedDelay).minus(normalisedHabitatEnhancedInAdvance).toNumber();

        if (result > 30) {
            finalTimeToTargetCondition = "30+";
        } else {
            finalTimeToTargetCondition = Decimal.max(0, result).toNumber();
        }
    }

    return {
        ...data,
        standardTimeToTargetCondition,
        standardOrAdjustedTimeToTargetCondition,
        finalTimeToTargetCondition,
    };
}

/**
 * Determine enhancement difficulty based on whether habitat reached target before losses
 * Simpler than creation difficulty logic
 */
export function calculateEnhancementDifficulty(input: {
    habitatEnhancedInAdvance: number | "30+",
    finalTimeToTargetCondition: number | "30+" | "Not Possible ▲",
    standardDifficultyOfEnhancement: keyof typeof difficulty,
}) {
    return calculateEnhancementDifficultyShared({
        enhancedInAdvance: input.habitatEnhancedInAdvance,
        finalTimeToTargetCondition: input.finalTimeToTargetCondition,
        standardDifficultyOfEnhancement: input.standardDifficultyOfEnhancement,
        lowDifficultyMessage: "Low Difficulty - only applicable if all habitat created before losses ⚠",
    });
}

const determineEnhancementDifficulty = <Data extends {
    broadHabitat: string,
    habitatType: string,
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatEnhancedInAdvance: number | "30+",
    finalTimeToTargetCondition: number | "30+" | "Not Possible ▲"
}>(data: Data) => {
    const habitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

    return {
        ...data,
        ...calculateEnhancementDifficulty({
            habitatEnhancedInAdvance: data.habitatEnhancedInAdvance,
            finalTimeToTargetCondition: data.finalTimeToTargetCondition,
            standardDifficultyOfEnhancement: habitat.technicalDifficultyEnhancement,
        }),
    };
}

/**
 * Add distinctiveness and condition change labels
 * Matches Excel columns T and U
 */
/**
 * Pure calculation: derives distinctivenessChange and conditionChange labels.
 */
export function calculateDistinctivenessAndConditionChange(input: {
    baselineDistinctivenessCategory: string,
    baselineLabel: string,
    baselineCondition: string,
    baselineDistinctivenessScore: number,
    proposedLabel: string,
    proposedDistinctiveness: string,
    proposedDistinctivenessScore: number,
    condition: string,
}) {
    const distinctivenessChange = `${input.baselineDistinctivenessCategory} - ${input.proposedDistinctiveness}`;

    const isHabitatChange = input.baselineLabel !== input.proposedLabel;
    const isDistinctivenessUpgrade = input.proposedDistinctivenessScore > input.baselineDistinctivenessScore;

    let conditionChange: string;
    if (isHabitatChange && isDistinctivenessUpgrade) {
        conditionChange = `Lower Distinctiveness Habitat - ${input.condition}`;
    } else {
        conditionChange = `${input.baselineCondition} - ${input.condition}`;
    }

    return { distinctivenessChange, conditionChange };
}

const addDistinctivenessAndConditionChange = <Data extends {
    baseline: any,
    _baselineHabitat: any,
    broadHabitat: string,
    habitatType: string,
    condition: string,
    distinctiveness: string,
    distinctivenessScore: number
}>(data: Data) => {
    const proposedHabitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;
    return {
        ...data,
        ...calculateDistinctivenessAndConditionChange({
            baselineDistinctivenessCategory: data._baselineHabitat.distinctivenessCategory,
            baselineLabel: data._baselineHabitat.label,
            baselineCondition: data.baseline.condition,
            baselineDistinctivenessScore: data._baselineHabitat.distinctivenessScore,
            proposedLabel: proposedHabitat.label,
            proposedDistinctiveness: data.distinctiveness,
            proposedDistinctivenessScore: data.distinctivenessScore,
            condition: data.condition,
        }),
    };
}

/**
 * Calculate habitat units delivered from enhancement as NET GAIN over baseline
 *
 * Formula:
 * - Calculate proposed units: Area × Proposed Distinctiveness × Proposed Condition
 * - Calculate baseline units: Area × Baseline Distinctiveness × Baseline Condition
 * - Calculate delta with multipliers: (Proposed - Baseline) × Difficulty × Temporal
 * - Add back baseline units: Delta + Baseline
 * - Apply strategic significance: Result × Strategic
 *
 * Special case: If baseline condition > proposed condition (condition reduced),
 * use proposed condition as baseline condition for calculation
 */
const enrichWithEnhancementUnitsDelivered = <Data extends {
    area: number,
    _baselineHabitat: any,
    _baselineCondition: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
    finalTimeToTargetMultiplier: number | undefined,
    difficultyMultiplierApplied: number
}>(data: Data) => {
    const { habitatUnitsDelivered } = calculateEnhancementUnitsDelivered({
        area: data.area,
        baselineDistinctivenessScore: data._baselineHabitat.distinctivenessScore,
        baselineConditionScore: data._baselineCondition,
        distinctivenessScore: data.distinctivenessScore,
        conditionScore: data.conditionScore,
        strategicSignificanceMultiplier: data.strategicSignificanceMultiplier,
        finalTimeToTargetMultiplier: data.finalTimeToTargetMultiplier,
        difficultyMultiplierApplied: data.difficultyMultiplierApplied,
    });
    return { ...data, habitatUnitsDelivered };
}

export const onSiteHabitatEnhancementSchema = v.pipe(
    inputSchema,

    // Basic validations
    v.forward(v.check(s => isValidHabitat(s.broadHabitat, s.habitatType), "The broad habitat and habitat type are incompatible"), ['habitatType']),
    v.forward(v.check(s => isValidCondition(s.broadHabitat, s.habitatType, s.condition), "The condition for this habitat is invalid"), ['condition']),
    v.check(
        s => !(
            (typeof s.habitatEnhancedInAdvance === "string" || s.habitatEnhancedInAdvance > 0)
            && (typeof s.habitatEnhancedDelay === "string" || s.habitatEnhancedDelay > 0)
        ),
        "Cannot have both habitat enhanced in advance and delay in starting habitat enhancement"
    ),

    // Extract baseline data and area
    v.transform(enrichBaselineHabitatData),

    // Enrich proposed habitat data
    v.transform(enrichWithHabitatData),

    // Add distinctiveness and condition change labels
    v.transform(addDistinctivenessAndConditionChange),

    // Validation checks for enhancement
    v.check(
        data => {
            const baseline = data._baselineHabitat;
            const proposed = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

            // V.High/High: Same habitat required
            if (['V.High', 'High'].includes(baseline.distinctivenessCategory)) {
                return baseline.label === proposed.label;
            }

            // Medium: Same broad habitat or higher distinctiveness
            if (baseline.distinctivenessCategory === 'Medium') {
                return baseline.broadHabitat === proposed.broadHabitat
                    || proposed.distinctivenessScore >= baseline.distinctivenessScore;
            }

            // Low: Same distinctiveness or better
            if (baseline.distinctivenessCategory === 'Low') {
                return proposed.distinctivenessScore >= baseline.distinctivenessScore;
            }

            return true;
        },
        "Trading rules not satisfied - habitat distinctiveness mismatch"
    ),
    v.check(
        data => {
            const baselineCondition = data._baselineCondition;
            const proposedCondition = data.conditionScore;
            const baselineD = data._baselineHabitat.distinctivenessScore;
            const proposedD = data.distinctivenessScore;

            // Cannot reduce condition
            if (baselineCondition > proposedCondition) {
                return false;
            }

            // If same condition, must have distinctiveness upgrade
            if (baselineCondition === proposedCondition) {
                return proposedD > baselineD;
            }

            return true;
        },
        "Enhancement does not improve habitat quality"
    ),
    v.check(
        data => {
            const baseline = data._baselineHabitat;
            const proposed = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

            // Cannot replace irreplaceable habitat with different habitat
            if (baseline.irreplaceable && baseline.label !== proposed.label) {
                return false;
            }

            return true;
        },
        "Cannot replace an irreplaceable habitat with a different habitat"
    ),
    v.check(
        data => {
            const baseline = data._baselineHabitat;
            const proposed = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

            // Special habitat validation: Littoral seagrass
            if (proposed.type === "Littoral seagrass") {
                const allowedBaselines = [
                    "Intertidal sediment - Littoral seagrass",
                    "Intertidal sediment - Littoral sand"
                ];
                return allowedBaselines.includes(baseline.label);
            }

            // Special habitat validation: IGGI (Integrated Greening of Grey Infrastructure)
            if (proposed.type === "Artificial hard structures with integrated greening of grey infrastructure (IGGI)") {
                const allowedBaselines = [
                    "Intertidal hard structures - Artificial hard structures with integrated greening of grey infrastructure (IGGI)",
                    "Intertidal hard structures - Artificial hard structures",
                    "Intertidal hard structures - Artificial features of hard structures"
                ];
                return allowedBaselines.includes(baseline.label);
            }

            return true;
        },
        "Enhancement not possible for this habitat type from the selected baseline"
    ),

    // Temporal calculation
    v.transform(lookupEnhancementTimeToTarget),
    v.transform(calculateFinalTimeToTargetCondition),
    v.transform(lookupFinalTimeToTargetMultiplier),

    // Difficulty logic
    v.transform(determineEnhancementDifficulty),

    // Final calculation
    v.transform(enrichWithEnhancementUnitsDelivered),
)

export type OnSiteHabitatEnhancementSchema = v.InferInput<typeof onSiteHabitatEnhancementSchema>
export type OnSiteHabitatEnhancement = v.InferOutput<typeof onSiteHabitatEnhancementSchema>

const uncheckedInputSchema = v.object({
    ...inputSchema.entries,
    baseline: onSiteHabitatBaselineUncheckedSchema,
})

export const onSiteHabitatEnhancementUncheckedSchema = v.pipe(
    uncheckedInputSchema,
    safeTransform(enrichBaselineHabitatData),
    safeTransform(enrichWithHabitatData),
    safeTransform(addDistinctivenessAndConditionChange),
    safeTransform(lookupEnhancementTimeToTarget),
    safeTransform(calculateFinalTimeToTargetCondition),
    safeTransform(lookupFinalTimeToTargetMultiplier),
    safeTransform(determineEnhancementDifficulty),
    safeTransform(enrichWithEnhancementUnitsDelivered),
)
