import * as v from 'valibot';
import { Decimal } from '../decimal';
import { broadHabitatSchema } from '../broadHabitats';
import { baselineHabitatType } from '../habitatTypes';
import { conditionSchema } from '../conditions';
import { strategicSignificanceSchema } from '../strategicSignificanceSchema';
import { addTotalHabitatUnits as enrichWithTotalHabitatUnits, areaSchema, enrichWithHabitatData, freeTextSchema, isValidCondition, isValidHabitat, isValidIrreplaceable, safeTransform } from '../schemaUtils';
import { calculateBaselineUnits, calculateVhdhBespokeCompensationUnits } from '../habitatCalc';
import { bespokeCompensationSchema, type BespokeCompensation } from '../bespokeCompensation';
import type { SuggestedTradingActions } from '../distinctivenessCategories';

const inputSchema =
    v.object({
        broadHabitat: broadHabitatSchema,
        habitatType: baselineHabitatType,
        irreplaceableHabitat: v.boolean(),
        area: areaSchema,
        condition: conditionSchema,
        strategicSignificance: strategicSignificanceSchema,
        areaRetained: v.optional(areaSchema, 0),
        areaEnhanced: v.optional(areaSchema, 0),
        bespokeCompensationAgreed: v.optional(bespokeCompensationSchema, "No"),
        userComments: freeTextSchema,
        planningAuthorityComments: freeTextSchema,
        habitatReferenceNumber: freeTextSchema,
    })

export const onSiteHabitatBaselineSchema = v.pipe(
    inputSchema,
    v.forward(v.check(s => isValidHabitat(s.broadHabitat, s.habitatType), "The broad habitat and habitat type are incompatible"), ['habitatType']),
    v.forward(v.check(s => isValidIrreplaceable(s.broadHabitat, s.habitatType, s.irreplaceableHabitat), "This habitat cannot be irreplaceable"), ['irreplaceableHabitat']),
    v.forward(v.check(s => isValidCondition(s.broadHabitat, s.habitatType, s.condition), "The condition for this habitat is invalid"), ['condition']),
    v.transform(enrichWithHabitatData),
    v.transform(enrichWithBaselineUnitsData),
    // Checks from within the total habitat units cell (Q)
    // See https://opncd.ai/share/5IiLnaI4 for translation
    v.forward(v.check(s => !(s.broadHabitat === "Individual trees" && s.areaEnhanced > 0 && s.irreplaceableHabitat), "You cannot enhance irreplaceable individual trees ▲"), ['areaEnhanced']),
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
    v.transform(enrichWithTotalHabitatUnits),
    // Checks from within the units lost cell (X)
    // See https://opncd.ai/share/4Z0sTzAw for translation
    v.forward(v.check(s => new Decimal(s.area).minus(s.areaRetained).minus(s.areaEnhanced).greaterThanOrEqualTo(0), "Area sums do not add up"), ['area']),
    v.transform(enrichWithUnitsLost),
    v.transform(enrichWithVhdhBespokeCompensationUnits),
)

export type OnSiteHabitatBaselineSchema = v.InferInput<typeof onSiteHabitatBaselineSchema>
export type OnSiteHabitatBaseline = v.InferOutput<typeof onSiteHabitatBaselineSchema>

export const onSiteHabitatBaselineUncheckedSchema = v.pipe(
    inputSchema,
    safeTransform(enrichWithHabitatData),
    safeTransform(enrichWithBaselineUnitsData),
    safeTransform(enrichWithTotalHabitatUnits),
    safeTransform(enrichWithUnitsLost),
    safeTransform(enrichWithVhdhBespokeCompensationUnits),
)

export function enrichWithBaselineUnitsData<Data extends {
    irreplaceableHabitat: boolean; area: number; areaRetained: number; areaEnhanced: number; distinctivenessScore: number; conditionScore: number; strategicSignificanceMultiplier: number;
}>(data: Data) {
    return { ...data, ...calculateBaselineUnits(data) };
}

/**
 * Pure calculation: derives units lost. Returns only the computed value.
 */
export function calculateUnitsLost(input: {
    areaHabitatLost: number,
    totalHabitatUnits: number,
    baselineUnitsRetained: number,
    baselineUnitsEnhanced: number,
}) {
    const unitsLost = input.areaHabitatLost === 0 ? 0 : new Decimal(input.totalHabitatUnits)
        .minus(input.baselineUnitsRetained)
        .minus(input.baselineUnitsEnhanced)
        .toNumber();
    return { unitsLost };
}

// See https://opncd.ai/share/4Z0sTzAw for translation
export function enrichWithUnitsLost<Data extends {
    areaHabitatLost: number,
    totalHabitatUnits: number,
    baselineUnitsRetained: number,
    baselineUnitsEnhanced: number,
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
