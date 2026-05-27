import * as v from 'valibot';
import { allWatercourses } from '../watercourses';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { freeTextSchema, lengthSchema, safeTransform } from '../schemaUtils';
import { watercourseConditionSchema } from '../watercourseCondition';
import { watercourseTypeSchema } from '../watercourseType';
import { watercourseSpatialRiskCategorySchema } from '../spatialRisk';
import { enrichWithWatercourseSpatialRisk } from './common';
import { Decimal } from '../decimal';
import {
    enrichWithBaselineWatercourseData,
    enrichWithBaselineUnitsData,
    enrichWithTotalWatercourseUnits,
    enrichWithUnitsLost
} from '../watercourses/shared';
import { riparianEncroachmentSchema, watercourseEncroachmentSchema } from '../watercourseEncroachment';
import { fuzzyPicklist } from '../valibotPipes';

const inputSchema = v.object({
    watercourseType: watercourseTypeSchema,
    length: lengthSchema,
    condition: watercourseConditionSchema,
    strategicSignificance: strategicSignificanceSchema,
    watercourseEncroachment: watercourseEncroachmentSchema,
    riparianEncroachment: riparianEncroachmentSchema,
    spatialRiskCategory: watercourseSpatialRiskCategorySchema,
    lengthRetained: v.optional(lengthSchema, 0),
    lengthEnhanced: v.optional(lengthSchema, 0),
    bespokeCompensation: v.optional(fuzzyPicklist(["Yes", "No", "Pending"] as const), "No"),
    userComments: freeTextSchema,
    planningAuthorityComments: freeTextSchema,
    habitatReferenceNumber: freeTextSchema,
    offSiteReferenceNumber: freeTextSchema,
});

export const offSiteWatercourseBaselineSchema = v.pipe(
    inputSchema,
    v.forward(v.check(s => !!allWatercourses[s.watercourseType], "Invalid watercourse type"), ['watercourseType']),
    v.forward(v.check(
        s => new Decimal(s.lengthRetained).plus(s.lengthEnhanced).lessThanOrEqualTo(s.length),
        "Retained and enhanced lengths cannot exceed total length"
    ), ['length']),
    // Validate encroachment consistency with watercourse type
    v.forward(v.check(
        s => s.watercourseType === 'Culvert' ? s.watercourseEncroachment === 'N/A - Culvert' : s.watercourseEncroachment !== 'N/A - Culvert',
        "Culvert watercourses must use 'N/A - Culvert' for watercourse encroachment"
    ), ['watercourseEncroachment']),
    v.forward(v.check(
        s => s.watercourseType === 'Culvert' ? s.riparianEncroachment === 'N/A - Culvert' : s.riparianEncroachment !== 'N/A - Culvert',
        "Culvert watercourses must use 'N/A - Culvert' for riparian encroachment"
    ), ['riparianEncroachment']),
    // Enrich with watercourse data
    v.transform(enrichWithBaselineWatercourseData),
    // Validate that the condition is possible for this watercourse type
    v.forward(v.check(
        s => typeof s.conditionScore === 'number',
        "The selected condition is not possible for this watercourse type"
    ), ['condition']),
    // Enrich with spatial risk multiplier
    v.transform(enrichWithWatercourseSpatialRisk),
    // Check that off-site reference is provided when spatial risk is present
    v.forward(v.check(
        s => !(s.spatialRiskCategory && !s.offSiteReferenceNumber),
        "Off-site reference required ▲"
    ), ['offSiteReferenceNumber']),
    // Calculate baseline units
    v.transform(enrichWithBaselineUnitsData),
    // Calculate total watercourse units (SRM)
    v.transform(enrichWithTotalWatercourseUnitsSRM),
    // Calculate total watercourse units (without spatial risk)
    v.transform(enrichWithTotalWatercourseUnits),
    // Calculate units lost
    v.transform(enrichWithUnitsLost),
);

export type OffSiteWatercourseBaselineSchema = v.InferInput<typeof offSiteWatercourseBaselineSchema>;
export type OffSiteWatercourseBaseline = v.InferOutput<typeof offSiteWatercourseBaselineSchema>;

export const offSiteWatercourseBaselineUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithBaselineWatercourseData),
    safeTransform(enrichWithWatercourseSpatialRisk),
    safeTransform(enrichWithBaselineUnitsData),
    safeTransform(enrichWithTotalWatercourseUnitsSRM),
    safeTransform(enrichWithTotalWatercourseUnits),
    safeTransform(enrichWithUnitsLost),
);

/**
 * Calculate total watercourse units (SRM) - includes spatial risk multiplier
 * This is the "Total river units (SRM)" column in the Excel sheet
 */
/**
 * Pure calculation: derives totalWatercourseUnitsSRM.
 */
export function calculateTotalWatercourseUnitsSRM(input: {
    length: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
    spatialRiskMultiplier: number;
}) {
    const conditionScore = input.conditionScore as number;

    const totalWatercourseUnitsSRM = new Decimal(input.length)
        .mul(input.distinctivenessScore)
        .mul(conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(input.watercourseEncroachmentMultiplier)
        .mul(input.riparianEncroachmentMultiplier)
        .mul(input.spatialRiskMultiplier)
        .toNumber();

    return { totalWatercourseUnitsSRM };
}

export function enrichWithTotalWatercourseUnitsSRM<Data extends {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number | 'Not possible';
    strategicSignificanceMultiplier: number;
    watercourseEncroachmentMultiplier: number;
    riparianEncroachmentMultiplier: number;
    spatialRiskMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateTotalWatercourseUnitsSRM(data) };
}

