import * as v from 'valibot';
import { allWatercourses } from '../watercourses';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { freeTextSchema, safeTransform, yearsSchema } from '../schemaUtils';
import { watercourseConditionSchema } from '../watercourseCondition';
import { offSiteWatercourseBaselineSchema, offSiteWatercourseBaselineUncheckedSchema } from './watercourseBaseline';
import { watercourseTypeSchema } from '../watercourseType';
import { riparianEncroachmentSchema, watercourseEncroachmentSchema } from '../watercourseEncroachment';

import {
    enrichBaselineWatercourseData,
    enrichProposedWatercourseData,
    addEnhancementPathway,
    lookupEnhancementTimeToTarget,
    calculateFinalTimeToTargetValues,
    determineEnhancementDifficulty,
    enrichEnhancementWithEncroachmentData,
    calculateEnhancementUnitsDelivered
} from '../watercourses/shared';
import { enrichWithWatercourseSpatialRisk } from './common';
import { Decimal } from '../decimal';


const inputSchema = v.object({
    baseline: offSiteWatercourseBaselineSchema,
    watercourseType: watercourseTypeSchema,
    condition: watercourseConditionSchema,
    strategicSignificance: strategicSignificanceSchema,
    watercourseEnhancedInAdvance: v.optional(yearsSchema, 0),
    watercourseEnhancedDelay: v.optional(yearsSchema, 0),
    watercourseEncroachment: watercourseEncroachmentSchema,
    riparianEncroachment: riparianEncroachmentSchema,
    userComments: freeTextSchema,
    planningAuthorityComments: freeTextSchema,
    habitatReferenceNumber: freeTextSchema,
});

export const offSiteWatercourseEnhancementSchema = v.pipe(
    inputSchema,

    // Basic validations
    v.forward(v.check(s => !!allWatercourses[s.watercourseType], "Invalid watercourse type"), ['watercourseType']),
    v.check(
        s => !(
            (typeof s.watercourseEnhancedInAdvance === "string" || s.watercourseEnhancedInAdvance > 0)
            && (typeof s.watercourseEnhancedDelay === "string" || s.watercourseEnhancedDelay > 0)
        ),
        "Cannot have both watercourse enhanced in advance and delay in starting watercourse enhancement"
    ),

    // Extract baseline data and length
    v.transform(enrichBaselineWatercourseData),

    // Enrich proposed watercourse data
    v.transform(enrichProposedWatercourseData),

    // Validate that the condition is possible for this watercourse type
    v.forward(v.check(
        s => typeof s.conditionScore === 'number',
        "The selected condition is not possible for this watercourse type"
    ), ['condition']),

    // Validation checks for enhancement
    v.check(
        data => {
            const baseline = data._baselineWatercourse;
            const proposed = allWatercourses[data.watercourseType];

            // Cannot reduce distinctiveness (trading down)
            return proposed.distinctivenessScore >= baseline.distinctivenessScore;
        },
        "Trading rules not satisfied - watercourse distinctiveness cannot be reduced"
    ),
    v.check(
        data => {
            const baselineCondition = data._baselineCondition as number;
            const proposedCondition = data.conditionScore as number;
            const baselineD = data._baselineWatercourse.distinctivenessScore;
            const proposedD = data.distinctivenessScore;

            // Cannot reduce condition
            if (proposedCondition < baselineCondition) {
                return false;
            }

            // If same condition, must have distinctiveness upgrade
            if (proposedCondition === baselineCondition) {
                return proposedD > baselineD;
            }

            return true;
        },
        "Enhancement must improve condition or distinctiveness"
    ),

    // Validate encroachment consistency with watercourse type
    v.forward(v.check(
        s => s.watercourseType === 'Culvert' ? s.watercourseEncroachment === 'N/A - Culvert' : s.watercourseEncroachment !== 'N/A - Culvert',
        "Culvert watercourses must use 'N/A - Culvert' for watercourse encroachment"
    ), ['watercourseEncroachment']),
    v.forward(v.check(
        s => s.watercourseType === 'Culvert' ? s.riparianEncroachment === 'N/A - Culvert' : s.riparianEncroachment !== 'N/A - Culvert',
        "Culvert watercourses must use 'N/A - Culvert' for riparian encroachment"
    ), ['riparianEncroachment']),

    // Calculate enhancement pathway label
    v.transform(addEnhancementPathway),

    // Temporal calculation
    v.transform(lookupEnhancementTimeToTarget),
    v.transform(calculateFinalTimeToTargetValues),

    // Difficulty logic
    v.transform(determineEnhancementDifficulty),

    // Encroachment multipliers
    v.transform(enrichEnhancementWithEncroachmentData),

    // Final calculations
    v.transform(calculateEnhancementUnitsDelivered),
    v.transform(d => enrichWithWatercourseSpatialRisk({ ...d, spatialRiskCategory: d.baseline.spatialRiskCategory })),
    v.transform(enrichWithWatercourseUnitsDeliveredWithSpatialRisk),
)

export type OffSiteWatercourseEnhancementSchema = v.InferInput<typeof offSiteWatercourseEnhancementSchema>
export type OffSiteWatercourseEnhancement = v.InferOutput<typeof offSiteWatercourseEnhancementSchema>

const uncheckedInputSchema = v.object({
    ...inputSchema.entries,
    baseline: offSiteWatercourseBaselineUncheckedSchema,
})

export const offSiteWatercourseEnhancementUncheckedSchema = v.pipe(
    uncheckedInputSchema,
    safeTransform(enrichBaselineWatercourseData),
    safeTransform(enrichProposedWatercourseData),
    safeTransform(addEnhancementPathway),
    safeTransform(lookupEnhancementTimeToTarget),
    safeTransform(calculateFinalTimeToTargetValues),
    safeTransform(determineEnhancementDifficulty),
    safeTransform(enrichEnhancementWithEncroachmentData),
    safeTransform(calculateEnhancementUnitsDelivered),
    safeTransform(d => enrichWithWatercourseSpatialRisk({ ...d, spatialRiskCategory: d.baseline.spatialRiskCategory })),
    safeTransform(enrichWithWatercourseUnitsDeliveredWithSpatialRisk),
)

/**
 * Calculates SRM-adjusted watercourse units delivered for off-site watercourse enhancement
 * watercourseUnitsDeliveredWithSpatialRisk = watercourseUnitsDelivered * spatialRiskMultiplier
 */
/**
 * Pure calculation: derives watercourseUnitsDeliveredWithSpatialRisk.
 */
export function calculateWatercourseUnitsDeliveredWithSpatialRisk(input: {
    watercourseUnitsDelivered: number;
    spatialRiskMultiplier: number;
}) {
    const watercourseUnitsDeliveredWithSpatialRisk = new Decimal(input.watercourseUnitsDelivered).mul(input.spatialRiskMultiplier).toNumber();

    return { watercourseUnitsDeliveredWithSpatialRisk };
}

export function enrichWithWatercourseUnitsDeliveredWithSpatialRisk<Data extends {
    watercourseUnitsDelivered: number;
    spatialRiskMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateWatercourseUnitsDeliveredWithSpatialRisk(data) };
}


