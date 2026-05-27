import { Decimal } from './decimal';
import type { BespokeCompensation } from './bespokeCompensation';
import type { SuggestedTradingActions } from './distinctivenessCategories';

/**
 * Pure calculation: derives baseline units retained/enhanced and area habitat lost.
 *
 * Off-site enhancement of irreplaceable Individual trees is gated to 0; pass
 * `broadHabitat` to enable that branch. On-site callers omit it (the schema
 * already rejects this combination before the value is observed).
 */
export function calculateBaselineUnits(input: {
    irreplaceableHabitat: boolean;
    area: number;
    areaRetained: number;
    areaEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    broadHabitat?: string;
}) {
    const baselineUnitsRetained = input.irreplaceableHabitat
        ? 0
        : new Decimal(input.areaRetained)
            .mul(input.distinctivenessScore)
            .mul(input.conditionScore)
            .mul(input.strategicSignificanceMultiplier)
            .toNumber();

    const baselineUnitsEnhanced = (input.broadHabitat === "Individual trees" && input.areaEnhanced > 0 && input.irreplaceableHabitat)
        ? 0
        : new Decimal(input.areaEnhanced)
            .mul(input.distinctivenessScore)
            .mul(input.conditionScore)
            .mul(input.strategicSignificanceMultiplier)
            .toNumber();

    const areaHabitatLost = new Decimal(input.area)
        .minus(input.areaRetained)
        .minus(input.areaEnhanced)
        .toNumber();

    return { baselineUnitsRetained, baselineUnitsEnhanced, areaHabitatLost };
}

/**
 * Pure calculation of hidden cell AT/AS, used later in the headline results.
 */
export function calculateVhdhBespokeCompensationUnits(input: {
    bespokeCompensationAgreed: BespokeCompensation,
    requiredAction: SuggestedTradingActions,
    totalHabitatUnits: number,
    baselineUnitsRetained: number,
    baselineUnitsEnhanced: number,
}) {
    const vhdhBespokeCompensationUnits =
        (
            input.bespokeCompensationAgreed === "Yes"
            || input.bespokeCompensationAgreed === "Pending"
        ) && input.requiredAction === "Same habitat required – bespoke compensation option ⚠"
            ? new Decimal(input.totalHabitatUnits)
                .minus(input.baselineUnitsRetained)
                .minus(input.baselineUnitsEnhanced)
                .toNumber()
            : 0;

    return { vhdhBespokeCompensationUnits };
}

/**
 * Pure calculation: derives totalHabitatUnits.
 *
 * `irreplaceableHabitat` activates the irreplaceable branch (off-site behaviour).
 * Omit or pass `false` to skip it (on-site behaviour).
 */
export function calculateTotalHabitatUnits(input: {
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
    irreplaceableHabitat?: boolean,
}) {
    const bespokeRequired = input.requiredAction === "Bespoke compensation likely to be required";
    const hasRetention = input.areaRetained > 0;
    const hasEnhancement = input.areaEnhanced > 0;
    const hasBiodiversityGain = hasRetention || hasEnhancement;

    let totalHabitatUnits: number = 0;

    if (input.irreplaceableHabitat) {
        totalHabitatUnits = new Decimal(input.areaRetained)
            .plus(input.areaEnhanced)
            .mul(input.distinctivenessScore)
            .mul(input.conditionScore)
            .mul(input.strategicSignificanceMultiplier)
            .toNumber();
    } else if (bespokeRequired && !hasBiodiversityGain && input.bespokeCompensationAgreed === "Yes") {
        totalHabitatUnits = 0;
    } else if (bespokeRequired && hasBiodiversityGain) {
        totalHabitatUnits = new Decimal(input.baselineUnitsRetained).plus(input.baselineUnitsEnhanced).toNumber();
    } else {
        totalHabitatUnits = new Decimal(input.area)
            .mul(input.distinctivenessScore)
            .mul(input.conditionScore)
            .mul(input.strategicSignificanceMultiplier)
            .toNumber();
    }

    return { totalHabitatUnits };
}

/**
 * Pure calculation: derives habitatUnitsDelivered for habitat creation and (when
 * spatialRiskMultiplier is supplied) habitatUnitsDeliveredWithSpatialRisk.
 */
export function calculateHabitatUnitsDelivered(input: {
    area: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
    finalTimeToTargetMultiplier: number | undefined,
    difficultyMultiplierApplied: number,
    spatialRiskMultiplier?: number,
}) {
    const habitatUnitsDelivered = new Decimal(input.area)
        .mul(input.distinctivenessScore)
        .mul(input.conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(input.finalTimeToTargetMultiplier ?? 0)
        .mul(input.difficultyMultiplierApplied)
        .toNumber();

    const habitatUnitsDeliveredWithSpatialRisk = new Decimal(habitatUnitsDelivered)
        .mul(input.spatialRiskMultiplier ?? 1)
        .toNumber();

    return { habitatUnitsDelivered, habitatUnitsDeliveredWithSpatialRisk };
}

/**
 * Pure calculation: derives habitatUnitsDelivered for an enhancement and (when
 * spatialRiskMultiplier is supplied) habitatUnitsDeliveredWithSpatialRisk.
 */
export function calculateEnhancementUnitsDelivered(input: {
    area: number,
    baselineDistinctivenessScore: number,
    baselineConditionScore: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
    finalTimeToTargetMultiplier: number | undefined,
    difficultyMultiplierApplied: number,
    spatialRiskMultiplier?: number,
}) {
    const area = input.area;
    const baselineD = input.baselineDistinctivenessScore;
    const baselineC = input.baselineConditionScore;
    const proposedD = input.distinctivenessScore;
    const proposedC = input.conditionScore;
    const strategic = input.strategicSignificanceMultiplier;
    const difficulty = input.difficultyMultiplierApplied;
    const temporal = input.finalTimeToTargetMultiplier ?? 0;

    const effectiveBaselineC = baselineC > proposedC ? proposedC : baselineC;
    const proposedUnits = new Decimal(area).mul(proposedD).mul(proposedC);
    const baselineUnits = new Decimal(area).mul(baselineD).mul(effectiveBaselineC);
    const delta = proposedUnits.minus(baselineUnits).mul(difficulty).mul(temporal);
    const baseUnits = delta.plus(baselineUnits).mul(strategic);

    const habitatUnitsDelivered = baseUnits.toNumber();
    const habitatUnitsDeliveredWithSpatialRisk = baseUnits.mul(input.spatialRiskMultiplier ?? 1).toNumber();

    return { habitatUnitsDelivered, habitatUnitsDeliveredWithSpatialRisk };
}
