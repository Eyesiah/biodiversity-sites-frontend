import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    onSiteHedgerowEnhancementSchema,
    type OnSiteHedgerowEnhancementSchema
} from "./hedgerowEnhancement";
import type { OnSiteHedgerowBaseline } from "./hedgerowBaseline";

function createBaseline(overrides: Partial<OnSiteHedgerowBaseline> = {}): OnSiteHedgerowBaseline {
    return {
        habitatType: "Native hedgerow",
        length: 1,
        condition: "Poor",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        lengthRetained: 0,
        lengthEnhanced: 0.5,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
        distinctiveness: "Low",
        distinctivenessScore: 2,
        conditionScore: 1,
        strategicSignificanceCategory: "Area/compensation not in local strategy or undesignated",
        strategicSignificanceMultiplier: 1.1,
        tradingRules: "Same distinctiveness band or better",
        unitsRetained: 0,
        unitsEnhanced: 1.1, // 0.5 * 2 * 1 * 1.1
        totalHedgerowUnits: 2.2,
        lengthLost: 0.5,
        unitsLost: 1.1,
        ...overrides,
    } as OnSiteHedgerowBaseline;
}

export function fixture(overrides: Partial<OnSiteHedgerowEnhancementSchema> = {}): OnSiteHedgerowEnhancementSchema {
    return {
        baseline: createBaseline(),
        habitatType: "Native hedgerow",
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        hedgerowEnhancedInAdvance: 0,
        hedgerowEnhancedDelay: 0,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
        ...overrides,
    }
}

test("valid enhancement from Poor to Moderate", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture());
    expect(result.success).toBeTrue();
});

test("valid enhancement from Poor to Good", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Good"
    }));
    expect(result.success).toBeTrue();
});

test("valid enhancement from Moderate to Good", () => {
    const baseline = createBaseline({
        condition: "Moderate",
        conditionScore: 2,
    });
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        condition: "Good"
    }));
    expect(result.success).toBeTrue();
});

test("cannot reduce condition", () => {
    const baseline = createBaseline({
        condition: "Good",
        conditionScore: 3,
    });
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        condition: "Moderate" // Trying to reduce from Good to Moderate
    }));
    expect(result.success).toBeFalse();
});

test("cannot have same condition without distinctiveness improvement", () => {
    const baseline = createBaseline({
        condition: "Moderate",
        conditionScore: 2,
    });
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Native hedgerow", // Same distinctiveness
        condition: "Moderate" // Same condition
    }));
    expect(result.success).toBeFalse();
});

test("valid enhancement with distinctiveness improvement and same condition", () => {
    const baseline = createBaseline({
        habitatType: "Native hedgerow",
        condition: "Moderate",
        conditionScore: 2,
        distinctivenessScore: 2,
        distinctiveness: "Low",
    });
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Species-rich native hedgerow", // Medium distinctiveness
        condition: "Moderate" // Same condition but better distinctiveness
    }));
    expect(result.success).toBeTrue();
});

test("Non-native and ornamental hedgerow can only have Poor condition", () => {
    const baseline = createBaseline({
        habitatType: "Non-native and ornamental hedgerow",
        condition: "Poor",
        conditionScore: 1,
        distinctivenessScore: 1,
        distinctiveness: "V.Low",
        lengthEnhanced: 0.5,
    });

    // Cannot enhance Non-native hedgerow to same condition (no improvement)
    // This is expected to fail because it doesn't improve quality
    const resultSame = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Non-native and ornamental hedgerow",
        condition: "Poor"
    }));

    // Non-native to Non-native with same condition = no enhancement, should fail
    expect(resultSame.success).toBeFalse();

    // Should also fail with Moderate condition (Non-native can only be Poor)
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Non-native and ornamental hedgerow",
        condition: "Moderate"
    })).success).toBeFalse();

    // Valid enhancement: Non-native to Native hedgerow (distinctiveness upgrade)
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Native hedgerow",
        condition: "Poor"
    })).success).toBeTrue();
});

test("temporal adjustment validation - cannot have both advance and delay", () => {
    // Valid: only advance
    expect(v.safeParse(onSiteHedgerowEnhancementSchema,
        fixture({ hedgerowEnhancedInAdvance: 5, hedgerowEnhancedDelay: 0 })
    ).success).toBeTrue();

    // Valid: only delay
    expect(v.safeParse(onSiteHedgerowEnhancementSchema,
        fixture({ hedgerowEnhancedInAdvance: 0, hedgerowEnhancedDelay: 3 })
    ).success).toBeTrue();

    // Valid: neither
    expect(v.safeParse(onSiteHedgerowEnhancementSchema,
        fixture({ hedgerowEnhancedInAdvance: 0, hedgerowEnhancedDelay: 0 })
    ).success).toBeTrue();

    // Invalid: both advance and delay
    expect(v.safeParse(onSiteHedgerowEnhancementSchema,
        fixture({ hedgerowEnhancedInAdvance: 5, hedgerowEnhancedDelay: 3 })
    ).success).toBeFalse();
});

test("trading rules - V.High and High distinctiveness require like for like", () => {
    const baseline = createBaseline({
        habitatType: "Species-rich native hedgerow with trees - associated with bank or ditch",
        distinctivenessScore: 8,
        distinctiveness: "V.High",
        condition: "Poor",
        conditionScore: 1,
    });

    // Should succeed with same habitat
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Species-rich native hedgerow with trees - associated with bank or ditch",
        condition: "Moderate"
    })).success).toBeTrue();

    // Should fail with different habitat
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Species-rich native hedgerow with trees",
        condition: "Moderate"
    })).success).toBeFalse();
});

test("trading rules - Medium distinctiveness allows same or higher distinctiveness", () => {
    const baseline = createBaseline({
        habitatType: "Native hedgerow with trees",
        distinctivenessScore: 4,
        distinctiveness: "Medium",
        condition: "Poor",
        conditionScore: 1,
    });

    // Should succeed with same distinctiveness
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Species-rich native hedgerow",
        condition: "Moderate"
    })).success).toBeTrue();

    // Should succeed with higher distinctiveness
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Species-rich native hedgerow with trees",
        condition: "Moderate"
    })).success).toBeTrue();

    // Should fail with lower distinctiveness
    expect(v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Native hedgerow",
        condition: "Moderate"
    })).success).toBeFalse();
});

test("enhancement pathway calculation", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate"
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.enhancementPathway).toEqual("Poor to Moderate");
    }
});

test("enhancement time to target condition lookup - Poor to Moderate", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate"
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.timeToTargetCondition).toBe(3);
        expect(result.output.finalTimeToTargetCondition).toBe(3);
    }
});

test("enhancement time to target condition lookup - Poor to Good", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Good"
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        // Native hedgerow Poor to Good = 5 years
        expect(result.output.timeToTargetCondition).toBe(5);
        expect(result.output.finalTimeToTargetCondition).toBe(5);
    }
});

test("enhancement time to target condition lookup - Moderate to Good", () => {
    const baseline = createBaseline({
        condition: "Moderate",
        conditionScore: 2,
    });
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        condition: "Good"
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        // Native hedgerow Moderate to Good = 2 years
        expect(result.output.timeToTargetCondition).toBe(2);
        expect(result.output.finalTimeToTargetCondition).toBe(2);
    }
});

test("enhancement with advance - reduces time to target", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate",
        hedgerowEnhancedInAdvance: 2
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        // Native hedgerow Poor to Moderate = 3 years
        // 3 - 2 advance = 1 year final
        expect(result.output.timeToTargetCondition).toBe(3);
        expect(result.output.finalTimeToTargetCondition).toBe(1);
    }
});

test("enhancement with delay - increases time to target", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate",
        hedgerowEnhancedDelay: 2
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        // Native hedgerow Poor to Moderate = 3 years
        // 3 + 2 delay = 5 years final
        expect(result.output.timeToTargetCondition).toBe(3);
        expect(result.output.finalTimeToTargetCondition).toBe(5);
    }
});

test("enhancement with sufficient advance - reaches target immediately", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate",
        hedgerowEnhancedInAdvance: 5
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        // Native hedgerow Poor to Moderate = 3 years
        // 3 - 5 advance = -2, capped at 0
        expect(result.output.timeToTargetCondition).toBe(3);
        expect(result.output.finalTimeToTargetCondition).toBe(0);
        expect(result.output.finalDifficultyOfEnhancement).toBe("Low"); // Low difficulty when reached target
    }
});

test("difficulty - standard difficulty when not enhanced in advance", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate"
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.standardDifficultyOfEnhancement).toBe("Low");
        expect(result.output.finalDifficultyOfEnhancement).toBe("Low");
        expect(result.output.difficultyMultiplierApplied).toBe(1);
        expect(result.output.appliedDifficultyMultiplier).toBe("Standard difficulty applied");
    }
});

test("difficulty - low difficulty when enhanced sufficiently in advance", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate",
        hedgerowEnhancedInAdvance: 5
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.standardDifficultyOfEnhancement).toBe("Low");
        expect(result.output.finalDifficultyOfEnhancement).toBe("Low");
        expect(result.output.difficultyMultiplierApplied).toBe(1);
        expect(result.output.appliedDifficultyMultiplier).toBe("Low Difficulty - only applicable if all hedgerow enhanced before losses ⚠");
    }
});

test("full schema validation - Native hedgerow Poor to Moderate", () => {
    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        condition: "Moderate"
    }));

    expect(result.success).toBeTrue();

    if (result.success) {
        // Verify calculated values
        expect(result.output.length).toEqual(0.5);
        expect(result.output.distinctivenessScore).toEqual(2); // Native hedgerow = Low = 2
        expect(result.output.conditionScore).toEqual(2); // Moderate = 2
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);
        expect(result.output.timeToTargetCondition).toBe(3);
        expect(result.output.finalTimeToTargetCondition).toBe(3);
        expect(result.output.temporalMultiplier).toBeCloseTo(0.898632125, 5);
        expect(result.output.difficultyMultiplierApplied).toEqual(1);

        // Calculate expected units:
        // Baseline: 0.5 * 2 * 1 = 1.0
        // Proposed: 0.5 * 2 * 2 = 2.0
        // Delta: (2.0 - 1.0) * 1 * 0.898632125 = 0.898632125
        // Final: (0.898632125 + 1.0) * 1.1 = 2.088495
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(2.088495, 3);
    }
});

test("full schema validation - Native hedgerow to Species-rich (distinctiveness upgrade)", () => {
    const baseline = createBaseline({
        habitatType: "Native hedgerow",
        condition: "Moderate",
        conditionScore: 2,
        distinctivenessScore: 2,
        distinctiveness: "Low",
        lengthEnhanced: 0.3,
    });

    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Species-rich native hedgerow",
        condition: "Good",
        hedgerowEnhancedInAdvance: 0,
        hedgerowEnhancedDelay: 0,
    }));

    expect(result.success).toBeTrue();

    if (result.success) {
        // Verify calculated values
        expect(result.output.length).toEqual(0.3);
        expect(result.output.distinctivenessScore).toEqual(4); // Species-rich = Medium = 4
        expect(result.output.conditionScore).toEqual(3); // Good = 3
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);

        // Native hedgerow - Species-rich native hedgerow 
        expect(result.output.timeToTargetCondition).toBe(5);
        expect(result.output.finalTimeToTargetCondition).toBe(5);
        expect(result.output.temporalMultiplier).toBeCloseTo(0.837);

        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(3.53);
    }
});

test("full schema validation - with advance and strategic significance", () => {
    const baseline = createBaseline({
        condition: "Poor",
        conditionScore: 1,
        lengthEnhanced: 0.2,
        strategicSignificance: "Formally identified in local strategy",
        strategicSignificanceMultiplier: 1.15,
    });

    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        hedgerowEnhancedInAdvance: 3,
    }));

    expect(result.success).toBeTrue();

    if (result.success) {
        // Native hedgerow Poor to Good = 5 years
        // 5 - 3 advance = 2 years final
        expect(result.output.timeToTargetCondition).toBe(5);
        expect(result.output.finalTimeToTargetCondition).toBe(2);
        expect(result.output.temporalMultiplier).toBeCloseTo(0.931225, 5);
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.15);

        // Calculate expected units:
        // Baseline: 0.2 * 2 * 1 = 0.4
        // Proposed: 0.2 * 2 * 3 = 1.2
        // Delta: (1.2 - 0.4) * 1 * 0.931225 = 0.74498
        // Final: (0.74498 + 0.4) * 1.15 = 1.31672
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(1.31672, 3);
    }
});

test("handles '30+' time to target correctly", () => {
    const baseline = createBaseline({
        habitatType: "Line of trees",
        condition: "Poor",
        conditionScore: 1,
        distinctivenessScore: 2,
        distinctiveness: "Low",
        lengthEnhanced: 0.1,
    });

    const result = v.safeParse(onSiteHedgerowEnhancementSchema, fixture({
        baseline,
        habitatType: "Line of trees",
        condition: "Good",
        hedgerowEnhancedDelay: 5,
    }));

    expect(result.success).toBeTrue();

    if (result.success) {
        // Line of trees Poor to Good = 30 years
        // 30 + 5 delay = 35 years, which becomes "30+"
        expect(result.output.timeToTargetCondition).toBe(30);
        expect(result.output.finalTimeToTargetCondition).toBe("30+");
        expect(result.output.temporalMultiplier).toBeCloseTo(0.3197967361, 5);
    }
});
