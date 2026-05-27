import * as v from 'valibot';
import { habitatByBroadAndType, type Habitat } from './habitats';
import { type BroadHabitat } from './broadHabitats';
import { type BaselineHabitatType, type CreationHabitatType, type EnhancedHabitatType } from './habitatTypes';
import type { Condition } from './conditions';
import { getStrategicSignificance, type StrategicSignificance, type StrategicSignificanceDescription } from './strategicSignificanceSchema';
import { distinctivenessCategories, type SuggestedTradingActions } from './distinctivenessCategories';
import type { BespokeCompensation } from './bespokeCompensation';
import { calculateTotalHabitatUnits } from './habitatCalc';

/**
 * Like `v.transform`, but silently passes the input through unchanged if the
 * callback throws. Used by the *UncheckedSchema variants so that a row with a
 * missing lookup (e.g. an unknown habitat type) yields `undefined` derived
 * fields instead of failing the whole row.
 */
export function safeTransform<I, O>(fn: (input: I) => O) {
    return v.transform((input: I) => {
        try { return fn(input); }
        catch { return input as unknown as O; }
    });
}

export const areaSchema = v.pipe(
    v.number(),
    v.toMinValue(0),
)

// Length schema for hedgerows and watercourses (in kilometers)
export const lengthSchema = v.pipe(
    v.number(),
    v.toMinValue(0),
);

export const freeTextSchema = v.optional(v.string());

export const yearsSchema =
    v.union([
        v.pipe(
            v.number(),
            v.integer(),
            v.toMinValue(0),
            v.toMaxValue(30),
        ),
        v.literal("30+")
    ])

export function isValidHabitat(broadHabitat: BroadHabitat, habitatType: BaselineHabitatType | CreationHabitatType | EnhancedHabitatType): boolean {
    return !!habitatByBroadAndType(broadHabitat, habitatType);
}

export function isValidIrreplaceable(broadHabitat: BroadHabitat, habitatType: BaselineHabitatType | CreationHabitatType | EnhancedHabitatType, irreplaceable: boolean): boolean {
    const habitat = habitatByBroadAndType(broadHabitat, habitatType);
    if (!habitat) return false

    if (!habitat.irreplaceable) return true
    return irreplaceable === habitat.irreplaceable;
}

export function isValidCondition(broadHabitat: BroadHabitat, habitatType: BaselineHabitatType | CreationHabitatType | EnhancedHabitatType, condition: Condition): boolean {
    const habitat = habitatByBroadAndType(broadHabitat, habitatType);
    if (!habitat) return false

    return Object.keys(habitat.conditions).includes(condition);
}

type EnrichedHabitatData = {
    _habitat: Habitat,
    distinctiveness: Habitat['distinctivenessCategory'],
    distinctivenessScore: Habitat['distinctivenessScore'],
    // @ts-ignore-line
    conditionScore: Habitat['conditions'][Condition],
    strategicSignificanceCategory: StrategicSignificance['significance'],
    strategicSignificanceMultiplier: StrategicSignificance['multiplier'],
    requiredAction: SuggestedTradingActions,
}

export const enrichWithHabitatData = <Data extends { broadHabitat: BroadHabitat, habitatType: BaselineHabitatType | CreationHabitatType | EnhancedHabitatType, strategicSignificance: StrategicSignificanceDescription, irreplaceableHabitat?: boolean }>(data: Data): Data & EnrichedHabitatData => {
    const habitat = habitatByBroadAndType(data.broadHabitat, data.habitatType)!;

    return {
        ...data,
        _habitat: habitat,
        distinctiveness: habitat.distinctivenessCategory,
        distinctivenessScore: habitat.distinctivenessScore,

        // @ts-ignore-line This is covered by the isValidCondition check above
        conditionScore: habitat.conditions[data.condition],

        strategicSignificanceCategory: getStrategicSignificance(data.strategicSignificance).significance,
        strategicSignificanceMultiplier: getStrategicSignificance(data.strategicSignificance).multiplier,

        requiredAction: data.irreplaceableHabitat ? distinctivenessCategories['Irreplaceable'].suggestedAction : habitat.distinctivenessTradingRules,
    }
}

export const enrichWithCreationData = <Data extends { broadHabitat: BroadHabitat; habitatType: BaselineHabitatType | CreationHabitatType | EnhancedHabitatType; condition: string; }>(data: Data) => {
    const habitat = habitatByBroadAndType(data.broadHabitat, data.habitatType)!;

    return {
        ...data,

        // @ts-ignore-line This is covered by the isValidCondition check above
        timeToTargetCondition: habitat.temporalMultipliers[data.condition],
    }
}

export function addTotalHabitatUnits<Data extends {
    irreplaceableHabitat: boolean,
    requiredAction: SuggestedTradingActions,
    area: number,
    areaRetained: number,
    areaEnhanced: number,
    bespokeCompensationAgreed: BespokeCompensation,
    baselineUnitsRetained: number,
    baselineUnitsEnhanced: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
}>(data: Data) {
    // On-site Excel zeros total habitat units for irreplaceable habitats
    // ("Irreplaceable habitat - no units generated ⚠"). Off-site has its own
    // enrichment path that uses calculateTotalHabitatUnits's irreplaceable branch.
    if (data.irreplaceableHabitat) {
        return { ...data, totalHabitatUnits: 0 };
    }
    return { ...data, ...calculateTotalHabitatUnits(data) };
};
