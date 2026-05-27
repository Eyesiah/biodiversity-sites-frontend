import * as v from 'valibot';
import { broadHabitatSchema } from '../broadHabitats';
import { enhancedHabitatType } from '../habitatTypes';
import { conditionSchema } from '../conditions';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { enrichWithHabitatData, freeTextSchema, isValidCondition, isValidHabitat, safeTransform, yearsSchema } from '../schemaUtils';
import { offSiteHabitatBaselineSchema, offSiteHabitatBaselineUncheckedSchema } from './habitatBaseline';
import { habitatByBroadAndType } from '../habitats';
import { difficulty } from '../difficulty';
import { calculateFinalTimeToTargetCondition as calculateFinalTimeToTargetConditionCommon, lookupFinalTimeToTargetMultiplier, enrichWithSpatialRisk } from './common';
import { calculateEnhancementUnitsDelivered } from '../habitatCalc';
import { calculateEnhancementDifficulty as calculateEnhancementDifficultyShared } from '../enhancementDifficultyCalc';

const inputSchema = v.object({
    baseline: offSiteHabitatBaselineSchema,
    broadHabitat: broadHabitatSchema,
    habitatType: enhancedHabitatType,
    condition: conditionSchema,
    strategicSignificance: strategicSignificanceSchema,
    habitatEnhancedInAdvance: v.optional(yearsSchema, 0),
    habitatEnhancedDelay: v.optional(yearsSchema, 0),
    userComments: freeTextSchema,
    planningAuthorityComments: freeTextSchema,
    habitatReferenceNumber: freeTextSchema,
    offSiteReferenceNumber: freeTextSchema,
})

/**
 * Extract baseline habitat data including area
 * The baseline contains the area that is being enhanced
 */
/**
 * Pure restructure: extracts baseline-derived fields onto a flat object.
 */
export function calculateBaselineHabitatData(input: { baseline: any }) {
    return {
        area: input.baseline.areaEnhanced,
        _baselineHabitat: input.baseline._habitat,
        _baselineCondition: input.baseline.conditionScore,
    };
}

const enrichBaselineHabitatData = <Data extends {
    baseline: any
}>(data: Data) => {
    return { ...data, ...calculateBaselineHabitatData(data) };
}

/**
 * Calculate distinctiveness change label (Column T in Excel)
 * Format: "<baseline distinctiveness band> - <proposed distinctiveness band>"
 * Example: "Low - Medium", "High - High"
 */
const addDistinctivenessChange = <Data extends {
    _baselineHabitat: any,
    broadHabitat: string,
    habitatType: string
}>(data: Data) => {
    const baselineHabitat = data._baselineHabitat;
    const proposedHabitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;

    const baselineDistinctivenessCategory = baselineHabitat.distinctivenessCategory;
    const proposedDistinctivenessCategory = proposedHabitat.distinctivenessCategory;

    const distinctivenessChange = `${baselineDistinctivenessCategory} - ${proposedDistinctivenessCategory}`;

    return {
        ...data,
        distinctivenessChange
    };
}

/**
 * Calculate enhancement pathway label (Column U in Excel)
 * This determines the correct pathway for temporal multiplier lookup
 *
 * Format depends on distinctiveness change:
 * - If upgrading distinctiveness (baseline < proposed): "Lower Distinctiveness Habitat - <proposed condition>"
 * - Otherwise: "<baseline condition> - <proposed condition>"
 */
/**
 * Pure calculation: derives enhancementPathway/conditionChange labels.
 */
export function calculateEnhancementPathway(input: {
    baselineCondition: string,
    proposedCondition: string,
    baselineLabel: string,
    proposedLabel: string,
    baselineDistinctivenessScore: number,
    proposedDistinctivenessScore: number,
}) {
    const habitatChanged = input.baselineLabel !== input.proposedLabel;

    let conditionChange: string;
    if (habitatChanged && input.baselineDistinctivenessScore < input.proposedDistinctivenessScore) {
        conditionChange = `Lower Distinctiveness Habitat - ${input.proposedCondition}`;
    } else {
        conditionChange = `${input.baselineCondition} - ${input.proposedCondition}`;
    }

    return { enhancementPathway: conditionChange, conditionChange };
}

const addEnhancementPathway = <Data extends {
    baseline: any,
    broadHabitat: string,
    habitatType: string,
    condition: string,
    _baselineHabitat: any
}>(data: Data) => {
    const proposedHabitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;
    return {
        ...data,
        ...calculateEnhancementPathway({
            baselineCondition: data.baseline.condition,
            proposedCondition: data.condition,
            baselineLabel: data._baselineHabitat.label,
            proposedLabel: proposedHabitat.label,
            baselineDistinctivenessScore: data._baselineHabitat.distinctivenessScore,
            proposedDistinctivenessScore: proposedHabitat.distinctivenessScore,
        }),
    };
}

/**
 * Lookup enhancement time to target from habitat enhancement temporal multipliers (Column AD in Excel)
 *
 * Excel formula (AD12):
 * INDEX(EnhanceTemporal, MATCH(S12, EnhanceHabitat, 0), MATCH(U12, EnhanceCondition, 0))
 *
 * Where:
 * - S12 is the proposed habitat type (broadHabitat + habitatType)
 * - U12 is conditionChange (Column U) - the enhancement pathway
 *
 * This uses conditionChange to lookup the temporal multiplier from the habitat's enhancement temporal table.
 */
/**
 * Pure calculation: resolves the conditionChange pathway against an
 * enhancement-temporal map, falling back to "Not Possible ▲".
 */
export function calculateTimeToTargetCondition(input: {
    enhancementTemporalMultipliers: Record<string, any> | undefined,
    conditionChange: string,
}) {
    let timeToTargetCondition: number | "30+" | "Not Possible ▲" = "Not Possible ▲";

    if (input.enhancementTemporalMultipliers) {
        const pathway = input.conditionChange;
        if (pathway in input.enhancementTemporalMultipliers) {
            timeToTargetCondition = input.enhancementTemporalMultipliers[pathway];
        }
    }

    return { timeToTargetCondition };
}

const enrichWithTimeToTargetCondition = <Data extends {
    broadHabitat: string,
    habitatType: string,
    conditionChange: string
}>(data: Data) => {
    const habitat = habitatByBroadAndType(data.broadHabitat as any, data.habitatType as any)!;
    return {
        ...data,
        ...calculateTimeToTargetCondition({
            enhancementTemporalMultipliers: habitat.enhancementTemporalMultipliers,
            conditionChange: data.conditionChange,
        }),
    };
}

/**
 * Calculate final time to target condition based on:
 * - Standard enhancement time (from enhancement temporal multipliers)
 * - Years of habitat enhanced in advance
 * - Years of delay in starting enhancement
 */
const calculateFinalTimeToTargetCondition = <Data extends {
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    habitatEnhancedInAdvance: number | "30+",
    habitatEnhancedDelay: number | "30+"
}>(data: Data) => {
    return calculateFinalTimeToTargetConditionCommon({
        ...data,
        advance: data.habitatEnhancedInAdvance,
        delay: data.habitatEnhancedDelay,
    });
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
 * Enriches data with spatial risk multiplier from baseline.
 */
const enrichWithSpatialRiskData = <Data extends {
    baseline: any
}>(data: Data) => {
    return enrichWithSpatialRisk({
        ...data,
        spatialRiskCategory: data.baseline.spatialRiskCategory
    });
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
 * For off-site, calculates two values:
 * 1. habitatUnitsDeliveredWithSpatialRisk: includes spatial risk multiplier (column AP in Excel)
 * 2. habitatUnitsDelivered: without spatial risk multiplier (column AQ in Excel)
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
    difficultyMultiplierApplied: number,
    spatialRiskMultiplier: number
}>(data: Data) => {
    return {
        ...data,
        ...calculateEnhancementUnitsDelivered({
            area: data.area,
            baselineDistinctivenessScore: data._baselineHabitat.distinctivenessScore,
            baselineConditionScore: data._baselineCondition,
            distinctivenessScore: data.distinctivenessScore,
            conditionScore: data.conditionScore,
            strategicSignificanceMultiplier: data.strategicSignificanceMultiplier,
            finalTimeToTargetMultiplier: data.finalTimeToTargetMultiplier,
            difficultyMultiplierApplied: data.difficultyMultiplierApplied,
            spatialRiskMultiplier: data.spatialRiskMultiplier,
        })
    };
}

export const offSiteHabitatEnhancementSchema = v.pipe(
    inputSchema,
    v.forward(v.check(s => isValidHabitat(s.broadHabitat, s.habitatType), "The broad habitat and habitat type are incompatible"), ['habitatType']),
    v.forward(v.check(s => isValidCondition(s.broadHabitat, s.habitatType, s.condition), "The condition for this habitat is invalid"), ['condition']),
    v.check(
        s => !(
            (s.habitatEnhancedInAdvance === "30+" || s.habitatEnhancedInAdvance > 0)
            && (s.habitatEnhancedDelay === "30+" || s.habitatEnhancedDelay > 0)
        ),
        "Cannot have both habitat enhanced in advance and delay in starting habitat enhancement"
    ),
    v.transform(enrichBaselineHabitatData),
    v.transform(enrichWithHabitatData),
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
    v.transform(addDistinctivenessChange),
    v.transform(addEnhancementPathway),
    v.transform(enrichWithTimeToTargetCondition),
    v.transform(calculateFinalTimeToTargetCondition),
    v.transform(lookupFinalTimeToTargetMultiplier),
    v.transform(determineEnhancementDifficulty),
    v.transform(enrichWithSpatialRiskData),
    v.transform(enrichWithEnhancementUnitsDelivered),
)

export type OffSiteHabitatEnhancementSchema = v.InferInput<typeof offSiteHabitatEnhancementSchema>
export type OffSiteHabitatEnhancement = v.InferOutput<typeof offSiteHabitatEnhancementSchema>

const uncheckedInputSchema = v.object({
    ...inputSchema.entries,
    baseline: offSiteHabitatBaselineUncheckedSchema,
})

export const offSiteHabitatEnhancementUncheckedSchema = v.pipe(
    uncheckedInputSchema,
    safeTransform(enrichBaselineHabitatData),
    safeTransform(enrichWithHabitatData),
    safeTransform(addDistinctivenessChange),
    safeTransform(addEnhancementPathway),
    safeTransform(enrichWithTimeToTargetCondition),
    safeTransform(calculateFinalTimeToTargetCondition),
    safeTransform(lookupFinalTimeToTargetMultiplier),
    safeTransform(determineEnhancementDifficulty),
    safeTransform(enrichWithSpatialRiskData),
    safeTransform(enrichWithEnhancementUnitsDelivered),
)

