import * as v from 'valibot';
import { Decimal } from '../decimal';
import { broadHabitatSchema } from '../broadHabitats';
import { baselineHabitatType } from '../habitatTypes';
import { conditionSchema } from '../conditions';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { areaSchema, enrichWithHabitatData, freeTextSchema, isValidCondition, isValidHabitat, isValidIrreplaceable, safeTransform } from '../schemaUtils';
import { spatialRiskCategorySchema } from '../spatialRisk';
import { bespokeCompensationSchema, type BespokeCompensation } from '../bespokeCompensation';
import { enrichWithSpatialRisk as enrichWithSpatialRiskMultiplier } from './common';
import type { SuggestedTradingActions } from '../distinctivenessCategories';
import { calculateBaselineUnits, calculateTotalHabitatUnits, calculateVhdhBespokeCompensationUnits } from '../habitatCalc';

const inputSchema =
    v.object({
        broadHabitat: broadHabitatSchema,
        habitatType: baselineHabitatType,
        irreplaceableHabitat: v.boolean(),
        area: areaSchema,
        condition: conditionSchema,
        strategicSignificance: strategicSignificanceSchema,
        spatialRiskCategory: spatialRiskCategorySchema,
        areaRetained: v.optional(areaSchema, 0),
        areaEnhanced: v.optional(areaSchema, 0),
        bespokeCompensationAgreed: v.optional(bespokeCompensationSchema, "No"),
        userComments: freeTextSchema,
        planningAuthorityComments: freeTextSchema,
        habitatReferenceNumber: freeTextSchema,
        offSiteReferenceNumber: freeTextSchema,
    })

export const offSiteHabitatBaselineSchema = v.pipe(
    inputSchema,
    v.forward(v.check(s => isValidHabitat(s.broadHabitat, s.habitatType), "The broad habitat and habitat type are incompatible"), ['habitatType']),
    v.forward(v.check(s => isValidIrreplaceable(s.broadHabitat, s.habitatType, s.irreplaceableHabitat), "This habitat cannot be irreplaceable"), ['irreplaceableHabitat']),
    v.forward(v.check(s => isValidCondition(s.broadHabitat, s.habitatType, s.condition), "The condition for this habitat is invalid"), ['condition']),
    v.transform(enrichWithHabitatData),
    v.transform(enrichWithSpatialRiskMultiplier),
    v.transform(enrichWithBaselineUnitsData),
    v.transform(enrichWithTotalHabitatUnitsSRM),
    // Initial validation checks
    v.forward(v.check(s => !(
        s.irreplaceableHabitat
        && new Decimal(s.areaRetained).plus(s.areaEnhanced).lessThan(s.area)
        && s.bespokeCompensationAgreed === "No"
    ), "Any loss unacceptable"), ['irreplaceableHabitat']),
    v.forward(v.check(s => !(
        s.requiredAction === "Bespoke compensation likely to be required"
        && !(s.areaRetained > 0 || s.areaEnhanced > 0)
        && s.bespokeCompensationAgreed === "No"
    ), "Any loss unacceptable"), ['bespokeCompensationAgreed']),
    v.forward(v.check(s => !(s.broadHabitat === "Individual trees" && s.areaEnhanced > 0 && s.irreplaceableHabitat), "Error - you cannot enhance irreplaceable individual trees ▲"), ['areaEnhanced']),
    v.forward(v.check(s => !(s.spatialRiskCategory && !s.offSiteReferenceNumber), "Off-site reference required ▲"), ['offSiteReferenceNumber']),
    v.transform(enrichWithTotalHabitatUnits),
    // Checks from within the units lost cell (AA)
    v.forward(v.check(s => new Decimal(s.area).minus(s.areaRetained).minus(s.areaEnhanced).greaterThanOrEqualTo(0), "Error in Areas ▲"), ['area']),
    v.transform(enrichWithUnitsLost),
    v.transform(enrichWithVhdhBespokeCompensationUnits),
    v.transform(enrichWithBaselineUnitsRetainedSRM),
)
export type OffSiteHabitatBaselineSchema = v.InferInput<typeof offSiteHabitatBaselineSchema>
export type OffSiteHabitatBaseline = v.InferOutput<typeof offSiteHabitatBaselineSchema>

export const offSiteHabitatBaselineUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithHabitatData),
    safeTransform(enrichWithSpatialRiskMultiplier),
    safeTransform(enrichWithBaselineUnitsData),
    safeTransform(enrichWithTotalHabitatUnitsSRM),
    safeTransform(enrichWithTotalHabitatUnits),
    safeTransform(enrichWithUnitsLost),
    safeTransform(enrichWithVhdhBespokeCompensationUnits),
    safeTransform(enrichWithBaselineUnitsRetainedSRM),
)

export function enrichWithBaselineUnitsData<Data extends {
    irreplaceableHabitat: boolean;
    area: number;
    areaRetained: number;
    areaEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    broadHabitat: string;
}>(data: Data) {
    return { ...data, ...calculateBaselineUnits(data) };
}

/**
 * Pure calculation: derives totalHabitatUnitsSRM.
 */
export function calculateTotalHabitatUnitsSRM(input: {
    requiredAction: string;
    area: number;
    areaRetained: number;
    areaEnhanced: number;
    baselineUnitsRetained: number;
    baselineUnitsEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    spatialRiskMultiplier: number;
}) {
    const bespokeRequired = input.requiredAction === "Bespoke compensation likely to be required";
    const hasRetention = input.areaRetained > 0;
    const hasEnhancement = input.areaEnhanced > 0;
    const hasBiodiversityGain = hasRetention || hasEnhancement;

    let totalHabitatUnitsSRM: number = 0;

    if (bespokeRequired && !hasBiodiversityGain) {
        totalHabitatUnitsSRM = new Decimal(input.area).mul(input.spatialRiskMultiplier).toNumber();
    } else if (bespokeRequired && hasBiodiversityGain) {
        totalHabitatUnitsSRM = new Decimal(input.baselineUnitsRetained)
            .plus(input.baselineUnitsEnhanced)
            .mul(input.spatialRiskMultiplier)
            .toNumber();
    } else {
        totalHabitatUnitsSRM = new Decimal(input.area)
            .mul(input.distinctivenessScore)
            .mul(input.conditionScore)
            .mul(input.strategicSignificanceMultiplier)
            .mul(input.spatialRiskMultiplier)
            .toNumber();
    }

    return { totalHabitatUnitsSRM };
}

export function enrichWithTotalHabitatUnitsSRM<Data extends {
    requiredAction: SuggestedTradingActions;
    area: number;
    areaRetained: number;
    areaEnhanced: number;
    baselineUnitsRetained: number;
    baselineUnitsEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    spatialRiskMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateTotalHabitatUnitsSRM(data) };
}

export function enrichWithTotalHabitatUnits<Data extends {
    irreplaceableHabitat: boolean;
    area: number;
    areaRetained: number;
    areaEnhanced: number;
    bespokeCompensationAgreed: BespokeCompensation;
    baselineUnitsRetained: number;
    baselineUnitsEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    requiredAction: SuggestedTradingActions;
    areaHabitatLost: number;
}>(data: Data) {
    return { ...data, ...calculateTotalHabitatUnits(data) };
}

/**
 * Pure calculation: derives unitsLost.
 */
export function calculateUnitsLost(input: {
    areaHabitatLost: number;
    totalHabitatUnits: number;
    baselineUnitsRetained: number;
    baselineUnitsEnhanced: number;
    bespokeCompensationAgreed: string;
    requiredAction: string;
}) {
    let unitsLost: number = 0;

    if (input.areaHabitatLost === 0) {
        unitsLost = 0;
    } else if (
        (input.requiredAction === "Same habitat required – bespoke compensation option ⚠" ||
            input.requiredAction === "Bespoke compensation likely to be required") &&
        input.bespokeCompensationAgreed === "Yes"
    ) {
        unitsLost = 0;
    } else {
        unitsLost = new Decimal(input.totalHabitatUnits)
            .minus(input.baselineUnitsRetained)
            .minus(input.baselineUnitsEnhanced)
            .toNumber();
    }

    return { unitsLost };
}

export function enrichWithUnitsLost<Data extends {
    areaHabitatLost: number;
    totalHabitatUnits: number;
    baselineUnitsRetained: number;
    baselineUnitsEnhanced: number;
    bespokeCompensationAgreed: string;
    requiredAction: string;
}>(data: Data) {
    return { ...data, ...calculateUnitsLost(data) };
}

export function enrichWithVhdhBespokeCompensationUnits<Data extends {
    bespokeCompensationAgreed: BespokeCompensation,
    requiredAction: SuggestedTradingActions,
    totalHabitatUnits: number,
    baselineUnitsRetained: number,
    baselineUnitsEnhanced: number,
}>(data: Data) {
    return { ...data, ...calculateVhdhBespokeCompensationUnits(data) };
}

/**
 * Pure calculation of hidden cell AY, used later in headline SRM results.
 */
export function calculateBaselineUnitsRetainedSRM(input: {
    irreplaceableHabitat: boolean,
    areaRetained: number,
    distinctivenessScore: number,
    conditionScore: number,
    vhdhBespokeCompensationUnits: number,
    strategicSignificanceMultiplier: number,
    spatialRiskMultiplier: number,
}) {
    if (input.irreplaceableHabitat) return { baselineUnitsRetainedWithSRM: 0 };

    const baselineUnitsRetainedWithSRM =
        new Decimal(input.areaRetained)
            .mul(input.distinctivenessScore)
            .mul(input.conditionScore)
            .mul(input.strategicSignificanceMultiplier)
            .mul(input.spatialRiskMultiplier)
            .plus(new Decimal(input.vhdhBespokeCompensationUnits).mul(input.spatialRiskMultiplier))
            .toNumber()

    return { baselineUnitsRetainedWithSRM };
}

export function enrichWithBaselineUnitsRetainedSRM<Data extends {
    irreplaceableHabitat: boolean,
    areaRetained: number,
    distinctivenessScore: number,
    conditionScore: number,
    vhdhBespokeCompensationUnits: number,
    strategicSignificanceMultiplier: number,
    spatialRiskMultiplier: number,
}>(data: Data) {
    return { ...data, ...calculateBaselineUnitsRetainedSRM(data) };
}
