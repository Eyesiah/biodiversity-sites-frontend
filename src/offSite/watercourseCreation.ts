import * as v from 'valibot';
import { allWatercourses } from '../watercourses';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { freeTextSchema, lengthSchema, safeTransform, yearsSchema } from '../schemaUtils';
import { watercourseConditionSchema } from '../watercourseCondition';
import { watercourseTypeSchema } from '../watercourseType';
import { riparianEncroachmentSchema, watercourseEncroachmentSchema } from '../watercourseEncroachment';
import { watercourseSpatialRiskCategorySchema, getWatercourseSpatialRiskMultiplier } from '../spatialRisk';
import { Decimal } from '../decimal';
import {
    enrichWithCreationWatercourseData,
    enrichWithTemporalData,
    enrichWithDifficultyData,
    enrichCreationWithEncroachmentData,
    enrichWithUnitsDelivered
} from '../watercourses/shared';

const inputSchema = v.object({
    watercourseType: watercourseTypeSchema,
    length: lengthSchema,
    condition: watercourseConditionSchema,
    strategicSignificance: strategicSignificanceSchema,
    habitatCreatedInAdvance: v.optional(yearsSchema, 0),
    delayInStarting: v.optional(yearsSchema, 0),
    watercourseEncroachment: watercourseEncroachmentSchema,
    riparianEncroachment: riparianEncroachmentSchema,
    spatialRiskCategory: watercourseSpatialRiskCategorySchema,
    userComments: freeTextSchema,
    planningAuthorityComments: freeTextSchema,
    habitatReferenceNumber: freeTextSchema,
});

/**
 * Enriches watercourse creation data with spatial risk multiplier
 * Looks up the multiplier based on the spatial risk category
 */
export function enrichWithSpatialRiskMultiplier<Data extends {
    spatialRiskCategory: string;
}>(data: Data) {
    const spatialRiskMultiplier = getWatercourseSpatialRiskMultiplier(data.spatialRiskCategory as any);

    return {
        ...data,
        spatialRiskMultiplier,
    };
}

/**
 * Calculates SRM-adjusted net unit change for off-site watercourse creation
 * netUnitChangeWithSpatialRisk = netUnitChange * spatialRiskMultiplier
 */
/**
 * Pure calculation: derives netUnitChangeWithSpatialRisk.
 */
export function calculateNetUnitChangeWithSpatialRisk(input: {
    unitsDelivered: number;
    spatialRiskMultiplier: number;
}) {
    const netUnitChangeWithSpatialRisk = new Decimal(input.unitsDelivered).mul(input.spatialRiskMultiplier).toNumber();

    return { netUnitChangeWithSpatialRisk };
}

export function enrichWithWatercourseUnitsDeliveredWithSpatialRisk<Data extends {
    unitsDelivered: number;
    spatialRiskMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateNetUnitChangeWithSpatialRisk(data) };
}

export const offSiteWatercourseCreationSchema = v.pipe(
    inputSchema,
    // Validate that the watercourse type is valid
    v.forward(v.check(s => !!allWatercourses[s.watercourseType], "Invalid watercourse type"), ['watercourseType']),
    // Validate temporal inputs - can't have both advance and delay
    v.check(
        s => !(
            (typeof s.habitatCreatedInAdvance === "string" || s.habitatCreatedInAdvance > 0)
            && (typeof s.delayInStarting === "string" || s.delayInStarting > 0)
        ),
        "Cannot have both habitat created in advance and delay in starting"
    ),
    // Enrich with watercourse data
    v.transform(enrichWithCreationWatercourseData),
    // Validate that the condition is possible for this watercourse type
    v.forward(v.check(
        s => typeof s.conditionScore === 'number',
        "The selected condition is not possible for this watercourse type"
    ), ['condition']),
    // Validate encroachment consistency with watercourse type
    v.forward(v.check(
        s => s.watercourseType === 'Culvert' ? s.watercourseEncroachment === 'N/A - Culvert' : s.watercourseEncroachment !== 'N/A - Culvert',
        "Culvert watercourses must use 'N/A - Culvert' for watercourse encroachment"
    ), ['watercourseEncroachment']),
    v.forward(v.check(
        s => s.watercourseType === 'Culvert' ? s.riparianEncroachment === 'N/A - Culvert' : s.riparianEncroachment !== 'N/A - Culvert',
        "Culvert watercourses must use 'N/A - Culvert' for riparian encroachment"
    ), ['riparianEncroachment']),
    // Enrich with spatial risk multiplier
    v.transform(enrichWithSpatialRiskMultiplier),
    // Calculate temporal adjustments
    v.transform(enrichWithTemporalData),
    // Calculate difficulty multiplier
    v.transform(enrichWithDifficultyData),
    // Calculate encroachment multipliers
    v.transform(enrichCreationWithEncroachmentData),
    // Calculate final net unit change
    v.transform(enrichWithUnitsDelivered),
    // Calculate SRM-adjusted net unit change
    v.transform(enrichWithWatercourseUnitsDeliveredWithSpatialRisk),
);

export type OffSiteWatercourseCreationSchema = v.InferInput<typeof offSiteWatercourseCreationSchema>;
export type OffSiteWatercourseCreation = v.InferOutput<typeof offSiteWatercourseCreationSchema>;

export const offSiteWatercourseCreationUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithCreationWatercourseData),
    safeTransform(enrichWithSpatialRiskMultiplier),
    safeTransform(enrichWithTemporalData),
    safeTransform(enrichWithDifficultyData),
    safeTransform(enrichCreationWithEncroachmentData),
    safeTransform(enrichWithUnitsDelivered),
    safeTransform(enrichWithWatercourseUnitsDeliveredWithSpatialRisk),
);
