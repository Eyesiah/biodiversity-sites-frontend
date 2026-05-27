import { Decimal } from './decimal';
import type { HedgerowCondition } from './hedgerowCondition';
import type { Hedgerow, HedgerowLabel } from './hedgerows';

/**
 * Pure calculation: derives unitsRetained and unitsEnhanced for a hedgerow baseline.
 */
export function calculateBaselineUnits(input: {
    lengthRetained: number;
    lengthEnhanced: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
}) {
    const unitsRetained = new Decimal(input.lengthRetained)
        .mul(input.distinctivenessScore)
        .mul(input.conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .toNumber();

    const unitsEnhanced = new Decimal(input.lengthEnhanced)
        .mul(input.distinctivenessScore)
        .mul(input.conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .toNumber();

    return { unitsRetained, unitsEnhanced };
}

/**
 * Pure calculation: derives totalHedgerowUnits.
 */
export function calculateTotalHedgerowUnits(input: {
    length: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
}) {
    const totalHedgerowUnits = new Decimal(input.length)
        .mul(input.distinctivenessScore)
        .mul(input.conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .toNumber();

    return { totalHedgerowUnits };
}

/**
 * Pure calculation: derives lengthLost and unitsLost.
 */
export function calculateUnitsLost(input: {
    length: number;
    lengthRetained: number;
    lengthEnhanced: number;
    totalHedgerowUnits: number;
    unitsRetained: number;
    unitsEnhanced: number;
}) {
    const lengthLost = new Decimal(input.length)
        .minus(input.lengthRetained)
        .minus(input.lengthEnhanced)
        .toNumber();
    const unitsLost = lengthLost === 0 ? 0 : new Decimal(input.totalHedgerowUnits)
        .minus(input.unitsRetained)
        .minus(input.unitsEnhanced)
        .toNumber();

    return { lengthLost, unitsLost };
}

/**
 * Pure calculation: derives the enhancementPathway label "<baseline> to <proposed>".
 */
export function calculateEnhancementPathway(input: {
    baselineCondition: HedgerowCondition,
    proposedCondition: HedgerowCondition
}) {
    return { enhancementPathway: `${input.baselineCondition} to ${input.proposedCondition}` };
}

function yearsToNumber(years: number | "30+"): number {
    return years === "30+" ? 31 : years;
}

/**
 * Pure calculation: derives finalTimeToTargetCondition for hedgerow creation
 * from standard time, advance and delay.
 */
export function calculateFinalTimeToTargetCondition(input: {
    standardTimeToTargetCondition: number | string | undefined;
    habitatCreatedInAdvance: number | "30+";
    delayInStartingHabitatCreation: number | "30+";
}) {
    const standardTimeToTarget = input.standardTimeToTargetCondition;
    let finalTimeToTarget: number | string | undefined = undefined;

    if (typeof standardTimeToTarget === 'string') {
        if (standardTimeToTarget === '30+') {
            const advanceYears = yearsToNumber(input.habitatCreatedInAdvance);
            const delayYears = yearsToNumber(input.delayInStartingHabitatCreation);

            finalTimeToTarget = new Decimal(31).minus(advanceYears).plus(delayYears).toNumber();

            if (finalTimeToTarget >= 30) {
                finalTimeToTarget = '30+';
            }
        } else {
            finalTimeToTarget = standardTimeToTarget;
        }
    } else {
        if (!standardTimeToTarget) {
            finalTimeToTarget = undefined;
        } else {
            const advanceYears = yearsToNumber(input.habitatCreatedInAdvance);
            const delayYears = yearsToNumber(input.delayInStartingHabitatCreation);

            finalTimeToTarget = new Decimal(standardTimeToTarget).minus(advanceYears).plus(delayYears).toNumber();

            if (standardTimeToTarget >= 30 && finalTimeToTarget >= 30) {
                finalTimeToTarget = '30+';
            } else if (finalTimeToTarget >= 30) {
                finalTimeToTarget = '30+';
            }
        }
    }

    return { finalTimeToTargetCondition: finalTimeToTarget };
}

/**
 * Pure calculation: resolves the enhancement time-to-target by branching on
 * distinctiveness then doing a key lookup into the appropriate pathway map.
 */
export function calculateEnhancementTimeToTarget(input: {
    baselineDistinctivenessScore: Hedgerow['distinctivenessScore'],
    distinctivenessScore: Hedgerow['distinctivenessScore'],
    yearsToTargetConditionViaDistinctiveness: Hedgerow['yearsToTargetConditionViaDistinctiveness'] | undefined,
    yearsToTargetConditionViaEnhancement: Hedgerow['yearsToTargetConditionViaEnhancement'] | undefined,
    habitatType: HedgerowLabel,
    enhancementPathway: string,
}): { timeToTargetCondition: number | "30+" | "Not possible ▲" } {
    const notPossible = { timeToTargetCondition: "Not possible ▲" as const };

    if (input.baselineDistinctivenessScore < input.distinctivenessScore) {
        const pathways = input.yearsToTargetConditionViaDistinctiveness;
        if (!pathways) return notPossible;

        const value = pathways[input.habitatType as keyof typeof pathways] as number | "30+" | undefined;
        if (!value) return notPossible;
        return { timeToTargetCondition: value };
    }

    const enhancementTemporal = input.yearsToTargetConditionViaEnhancement;
    if (!enhancementTemporal) return notPossible;

    const pathway = input.enhancementPathway as keyof typeof enhancementTemporal;
    if (!(pathway in enhancementTemporal)) return notPossible;

    return { timeToTargetCondition: enhancementTemporal[pathway] as number | "30+" | "Not possible ▲" };
}

/**
 * Pure calculation: derives hedgerowUnitsDelivered and (when spatialRiskMultiplier is
 * supplied) hedgerowUnitsDeliveredWithSpatialRisk.
 */
export function calculateHedgerowUnitsDelivered(input: {
    length: number;
    distinctivenessScore: number;
    conditionScore: number;
    strategicSignificanceMultiplier: number;
    temporalMultiplier: number | string | undefined;
    difficultyMultiplier: number;
    spatialRiskMultiplier?: number;
}) {
    const temporalMultiplierValue = typeof input.temporalMultiplier === 'number'
        ? input.temporalMultiplier
        : 0;

    const hedgerowUnitsDelivered = new Decimal(input.length)
        .mul(input.distinctivenessScore)
        .mul(input.conditionScore)
        .mul(input.strategicSignificanceMultiplier)
        .mul(temporalMultiplierValue)
        .mul(input.difficultyMultiplier)
        .toNumber();

    const hedgerowUnitsDeliveredWithSpatialRisk = new Decimal(hedgerowUnitsDelivered)
        .mul(input.spatialRiskMultiplier ?? 1)
        .toNumber();

    return { hedgerowUnitsDelivered, hedgerowUnitsDeliveredWithSpatialRisk };
}

/**
 * Pure calculation: derives hedgerowUnitsDelivered for an enhancement and (when
 * spatialRiskMultiplier is supplied) hedgerowUnitsDeliveredWithSpatialRisk.
 */
export function calculateEnhancementUnitsDelivered(input: {
    length: number,
    baselineDistinctivenessScore: number,
    baselineConditionScore: number,
    distinctivenessScore: number,
    conditionScore: number,
    strategicSignificanceMultiplier: number,
    temporalMultiplier: number | string | undefined,
    difficultyMultiplierApplied: number,
    spatialRiskMultiplier?: number,
}) {
    const length = input.length;
    const baselineD = input.baselineDistinctivenessScore;
    const baselineC = input.baselineConditionScore;
    const proposedD = input.distinctivenessScore;
    const proposedC = input.conditionScore;
    const strategic = input.strategicSignificanceMultiplier;
    const difficulty = input.difficultyMultiplierApplied;
    const temporal = typeof input.temporalMultiplier === 'number' ? input.temporalMultiplier : 0;

    const effectiveBaselineC = baselineC > proposedC ? proposedC : baselineC;
    const proposedUnits = new Decimal(length).mul(proposedD).mul(proposedC);
    const baselineUnits = new Decimal(length).mul(baselineD).mul(effectiveBaselineC);
    const delta = proposedUnits.minus(baselineUnits).mul(difficulty).mul(temporal);
    const baseUnits = delta.plus(baselineUnits).mul(strategic);

    const hedgerowUnitsDelivered = baseUnits.toNumber();
    const hedgerowUnitsDeliveredWithSpatialRisk = baseUnits.mul(input.spatialRiskMultiplier ?? 1).toNumber();

    return { hedgerowUnitsDelivered, hedgerowUnitsDeliveredWithSpatialRisk };
}
