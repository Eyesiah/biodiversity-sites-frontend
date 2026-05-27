import { Decimal } from '../decimal';
import { getSpatialRiskMultiplier, getWatercourseSpatialRiskMultiplier } from '../spatialRisk';
import { getTemporalMultiplier, type TemporalMultiplierKey } from '../temporalMultipliers';

/**
 * Pure calculation: derives finalTimeToTargetCondition from standard time, advance and delay.
 *
 * Formula: finalTime = standardTime - advance + delay
 * - Capped at "30+" if result > 30
 * - Returns 0 if advance >= standardTime
 * - Returns "Not Possible" if standardTime is "Not Possible ▲"
 */
export function calculateFinalTimeToTargetCondition<Data extends {
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    advance: number | "30+",
    delay: number | "30+"
}>(data: Data) {
    const { timeToTargetCondition, advance, delay } = data;

    let finalTimeToTargetCondition: number | "30+" | "Not Possible ▲";
    const normalisedAdvance = typeof advance === "string" ? 30 : advance;
    const normalisedDelay = typeof delay === "string" ? 30 : delay;

    if (timeToTargetCondition === "Not Possible ▲") {
        finalTimeToTargetCondition = "Not Possible ▲";
    }
    else if (timeToTargetCondition === "30+") {
        if (advance === 0) {
            finalTimeToTargetCondition = "30+";
        } else {
            finalTimeToTargetCondition = Decimal.max(0, new Decimal(30).minus(normalisedAdvance)).toNumber();
        }
    }
    else if (normalisedAdvance >= timeToTargetCondition) {
        finalTimeToTargetCondition = 0;
    }
    else {
        const result = new Decimal(timeToTargetCondition).minus(normalisedAdvance).plus(normalisedDelay).toNumber();

        if (result > 30) {
            finalTimeToTargetCondition = "30+";
        } else {
            finalTimeToTargetCondition = Decimal.max(0, result).toNumber();
        }
    }

    return {
        ...data,
        finalTimeToTargetCondition
    };
}

/**
 * Lookup: attaches finalTimeToTargetMultiplier from the temporal multipliers table.
 */
export function lookupFinalTimeToTargetMultiplier<Data extends {
    finalTimeToTargetCondition: number | "30+" | "Not Possible ▲"
}>(data: Data) {
    const multiplierKey = String(data.finalTimeToTargetCondition) as TemporalMultiplierKey;
    const multiplierResult = getTemporalMultiplier(multiplierKey);

    const finalTimeToTargetMultiplier = multiplierResult === 'N/A' ? undefined : multiplierResult;

    return {
        ...data,
        finalTimeToTargetMultiplier
    };
}

/**
 * Backwards-compatible wrapper: pure calc followed by lookup.
 */
export function calculateFinalTimeToTargetValues<Data extends {
    timeToTargetCondition: number | "30+" | "Not Possible ▲",
    advance: number | "30+",
    delay: number | "30+"
}>(data: Data) {
    return lookupFinalTimeToTargetMultiplier(calculateFinalTimeToTargetCondition(data));
}

/**
 * Enriches data with spatial risk multiplier.
 *
 * Looks up the multiplier value based on the spatial risk category.
 */
export function enrichWithSpatialRisk<Data extends {
    spatialRiskCategory: string
}>(data: Data) {
    const spatialRiskMultiplier = getSpatialRiskMultiplier(data.spatialRiskCategory as any);

    return {
        ...data,
        spatialRiskMultiplier
    };
}

/**
 * Enriches watercourse data with spatial risk multiplier using the
 * watercourse-specific category list (catchment-based, not LPA/NCA).
 */
export function enrichWithWatercourseSpatialRisk<Data extends {
    spatialRiskCategory: string
}>(data: Data) {
    const spatialRiskMultiplier = getWatercourseSpatialRiskMultiplier(data.spatialRiskCategory as any);

    return {
        ...data,
        spatialRiskMultiplier
    };
}
