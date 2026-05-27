import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    onSiteHedgerowCreationSchema,
    enrichWithHedgerowData,
    enrichWithTemporalData,
    enrichWithDifficultyData,
    enrichWithHedgerowUnitsDelivered,
    type OnSiteHedgerowCreationSchema
} from "./hedgerowCreation";

export function fixture(overrides: Partial<OnSiteHedgerowCreationSchema> = {}): OnSiteHedgerowCreationSchema {
    return {
        habitatType: "Native hedgerow",
        length: 1,
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
        ...overrides,
    }
}

test("valid hedgerow types", () => {
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ habitatType: "Native hedgerow" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ habitatType: "Species-rich native hedgerow" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Poor" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ habitatType: "Line of trees" })).success).toBeTrue();
});

test("condition validation for hedgerows", () => {
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ condition: "Good" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ condition: "Moderate" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ condition: "Poor" })).success).toBeTrue();

    // Hedgerows don't use "Fairly Good" or other habitat conditions
    expect(v.safeParse(onSiteHedgerowCreationSchema, fixture({ condition: "Fairly Good" })).success).toBeFalse();
});

test("Non-native and ornamental hedgerow can only have Poor condition", () => {
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Poor" })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Moderate" })
    ).success).toBeFalse();

    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Good" })
    ).success).toBeFalse();
});

test("temporal adjustment validation - cannot have both advance and delay", () => {
    // Valid: only advance
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: 5, delayInStartingHabitatCreation: 0 })
    ).success).toBeTrue();

    // Valid: only delay
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: 0, delayInStartingHabitatCreation: 3 })
    ).success).toBeTrue();

    // Valid: neither
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: 0, delayInStartingHabitatCreation: 0 })
    ).success).toBeTrue();

    // Valid: only advance with "30+"
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: "30+", delayInStartingHabitatCreation: 0 })
    ).success).toBeTrue();

    // Valid: only delay with "30+"
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: 0, delayInStartingHabitatCreation: "30+" })
    ).success).toBeTrue();

    // Invalid: both advance and delay
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: 5, delayInStartingHabitatCreation: 3 })
    ).success).toBeFalse();

    // Invalid: both advance and delay with "30+"
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: "30+", delayInStartingHabitatCreation: 3 })
    ).success).toBeFalse();

    // Invalid: both with "30+"
    expect(v.safeParse(onSiteHedgerowCreationSchema,
        fixture({ habitatCreatedInAdvance: "30+", delayInStartingHabitatCreation: "30+" })
    ).success).toBeFalse();
});

test("enrichWithHedgerowData calculations", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        condition: "Good" as const,
        strategicSignificance: "Formally identified in local strategy" as const,
    };

    const result = enrichWithHedgerowData(inputData);

    // Native hedgerow has Low distinctiveness (score = 2)
    expect(result.distinctiveness).toEqual("Low");
    expect(result.distinctivenessScore).toEqual(2);

    // Good condition = score 3
    expect(result.conditionScore).toEqual(3);

    // Formally identified = multiplier 1.15
    expect(result.strategicSignificanceMultiplier).toEqual(1.15);
    expect(result.strategicSignificanceCategory).toEqual("High strategic significance");

    expect(result.tradingRules).toEqual("Same distinctiveness band or better");
    expect(result.technicalDifficultyCreation).toEqual("Low");
    expect(result.technicalDifficultyCreationMultiplier).toEqual(1);
});

test("enrichWithHedgerowData for different conditions", () => {
    expect(enrichWithHedgerowData({
        habitatType: "Native hedgerow",
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
    }).conditionScore).toEqual(3);

    expect(enrichWithHedgerowData({
        habitatType: "Native hedgerow",
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
    }).conditionScore).toEqual(2);

    expect(enrichWithHedgerowData({
        habitatType: "Native hedgerow",
        condition: "Poor",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
    }).conditionScore).toEqual(1);
});

test("enrichWithTemporalData - basic calculation", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        condition: "Good" as const,
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
    };

    const result = enrichWithTemporalData(inputData);

    // Native hedgerow to Good = 12 years standard
    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(12);
    expect(result.temporalMultiplier).toBeCloseTo(0.6521203607, 5);
});

test("enrichWithTemporalData - with advance", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        condition: "Good" as const,
        habitatCreatedInAdvance: 5,
        delayInStartingHabitatCreation: 0,
    };

    const result = enrichWithTemporalData(inputData);

    // Standard 12 - 5 advance = 7 years final
    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(7);
    expect(result.temporalMultiplier).toBeCloseTo(0.7792758067, 5);
});

test("enrichWithTemporalData - with delay", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        condition: "Good" as const,
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 3,
    };

    const result = enrichWithTemporalData(inputData);

    // Standard 12 + 3 delay = 15 years final
    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(15);
    expect(result.temporalMultiplier).toBeCloseTo(0.5860163055000001, 5);
});

test("enrichWithTemporalData - handles 30+ scenario", () => {
    const inputData = {
        habitatType: "Ecologically valuable line of trees" as const,
        condition: "Good" as const,
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 5,
    };

    const result = enrichWithTemporalData(inputData);

    // Ecologically valuable line of trees to Good = "30+"
    // "30+" (31) + 5 delay = 36, which remains "30+"
    expect(result.standardTimeToTargetCondition).toBe('30+');
    expect(result.finalTimeToTargetCondition).toBe('30+');
    expect(result.temporalMultiplier).toBeCloseTo(0.3197967361, 5);
});

test("enrichWithTemporalData - advance can result in negative or zero", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        condition: "Poor" as const,
        habitatCreatedInAdvance: 5,
        delayInStartingHabitatCreation: 0,
    };

    const result = enrichWithTemporalData(inputData);

    // Standard 1 - 5 advance = -4 years final (habitat already established)
    expect(result.standardTimeToTargetCondition).toBe(1);
    expect(result.finalTimeToTargetCondition).toBe(-4);
    // Negative years will lookup, but might not have a multiplier
});

test("enrichWithTemporalData - with '30+' advance", () => {
    const inputData = {
        habitatType: "Ecologically valuable line of trees" as const,
        condition: "Good" as const,
        habitatCreatedInAdvance: "30+" as const,
        delayInStartingHabitatCreation: 0,
    };

    const result = enrichWithTemporalData(inputData);

    // Standard "30+" - 31 (for "30+" in advance) = 0 years final (30 - 31 + 1 for base)
    expect(result.standardTimeToTargetCondition).toBe('30+');
    expect(result.finalTimeToTargetCondition).toBe(0);
});

test("enrichWithTemporalData - with '30+' delay", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        condition: "Good" as const,
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: "30+" as const,
    };

    const result = enrichWithTemporalData(inputData);

    // Standard 12 + 31 (for "30+") = 43 years, which becomes "30+"
    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe('30+');
    expect(result.temporalMultiplier).toBeCloseTo(0.3197967361, 5);
});

test("enrichWithDifficultyData - standard difficulty", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        habitatCreatedInAdvance: 0,
        standardTimeToTargetCondition: 12,
        finalTimeToTargetCondition: 12,
        technicalDifficultyCreation: "Low",
        technicalDifficultyCreationMultiplier: 1,
    };

    const result = enrichWithDifficultyData(inputData);

    expect(result.standardDifficulty).toEqual("Low");
    expect(result.finalDifficulty).toEqual("Low");
    expect(result.difficultyMultiplier).toEqual(1);
});

test("enrichWithDifficultyData - low difficulty when created in advance", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        habitatCreatedInAdvance: 15,
        standardTimeToTargetCondition: 12,
        finalTimeToTargetCondition: -3, // Created well in advance
        technicalDifficultyCreation: "Low",
        technicalDifficultyCreationMultiplier: 1,
    };

    const result = enrichWithDifficultyData(inputData);

    // When created in advance and final time <= 0, use Low difficulty
    expect(result.standardDifficulty).toEqual("Low");
    expect(result.finalDifficulty).toEqual("Low");
    expect(result.difficultyMultiplier).toEqual(1);
});

test("enrichWithDifficultyData - maintains standard when advance not sufficient", () => {
    const inputData = {
        habitatType: "Native hedgerow" as const,
        habitatCreatedInAdvance: 5,
        standardTimeToTargetCondition: 12,
        finalTimeToTargetCondition: 7, // Still positive
        technicalDifficultyCreation: "Low",
        technicalDifficultyCreationMultiplier: 1,
    };

    const result = enrichWithDifficultyData(inputData);

    // When advance exists but final time > 0, use standard difficulty
    expect(result.standardDifficulty).toEqual("Low");
    expect(result.finalDifficulty).toEqual("Low");
    expect(result.difficultyMultiplier).toEqual(1);
});

test("enrichWithHedgerowUnitsDelivered - basic calculation", () => {
    const inputData = {
        length: 0.5,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 0.7002822741999999, // 10 years
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 0.5 * 2 * 3 * 1.15 * 0.7002822741999999 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(2.4159738, 3);
});

test("enrichWithHedgerowUnitsDelivered - with string temporal multiplier", () => {
    const inputData = {
        length: 0.5,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: "Check Data ⚠" as string,
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // When temporal multiplier is not a number, result should be 0
    expect(result.hedgerowUnitsDelivered).toEqual(0);
});

test("enrichWithHedgerowUnitsDelivered - with N/A temporal multiplier", () => {
    const inputData = {
        length: 0.5,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: "N/A" as string,
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // When temporal multiplier is "N/A", result should be 0
    expect(result.hedgerowUnitsDelivered).toEqual(0);
});

test("enrichWithHedgerowUnitsDelivered - with undefined temporal multiplier", () => {
    const inputData = {
        length: 0.5,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: undefined,
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // When temporal multiplier is undefined, result should be 0
    expect(result.hedgerowUnitsDelivered).toEqual(0);
});

test("enrichWithHedgerowUnitsDelivered - with zero length", () => {
    const inputData = {
        length: 0,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 0.7002822741999999,
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // When length is 0, result should be 0
    expect(result.hedgerowUnitsDelivered).toEqual(0);
});

test("enrichWithHedgerowUnitsDelivered - with maximum temporal multiplier", () => {
    const inputData = {
        length: 1.0,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 1.0, // Maximum multiplier (0 years)
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 1.0 * 2 * 3 * 1.15 * 1.0 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(6.9, 2);
});

test("enrichWithHedgerowUnitsDelivered - with high difficulty multiplier", () => {
    const inputData = {
        length: 0.5,
        distinctivenessScore: 4, // Species-rich hedgerow
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 0.7002822741999999,
        difficultyMultiplier: 1.5, // Very High difficulty
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 0.5 * 4 * 3 * 1.15 * 0.7002822741999999 * 1.5
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(7.247847, 3);
});

test("enrichWithHedgerowUnitsDelivered - with poor condition", () => {
    const inputData = {
        length: 1.0,
        distinctivenessScore: 2,
        conditionScore: 1, // Poor condition
        strategicSignificanceMultiplier: 1.0,
        temporalMultiplier: 0.898632125, // 3 years
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 1.0 * 2 * 1 * 1.0 * 0.898632125 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(1.79726425, 5);
});

test("enrichWithHedgerowUnitsDelivered - with low temporal multiplier (30+ years)", () => {
    const inputData = {
        length: 0.5,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 0.3197967361, // 30+ years
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 0.5 * 2 * 3 * 1.15 * 0.3197967361 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(1.1033595, 3);
});

test("enrichWithHedgerowUnitsDelivered - with high distinctiveness score", () => {
    const inputData = {
        length: 0.3,
        distinctivenessScore: 6, // High distinctiveness
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 0.7002822741999999,
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 0.3 * 6 * 3 * 1.15 * 0.7002822741999999 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(4.348753, 3);
});

test("enrichWithHedgerowUnitsDelivered - with very large length", () => {
    const inputData = {
        length: 100.0,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
        temporalMultiplier: 0.7002822741999999,
        difficultyMultiplier: 1,
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 100.0 * 2 * 3 * 1.15 * 0.7002822741999999 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(483.19476, 2);
});

test("enrichWithHedgerowUnitsDelivered - with all minimum non-zero values", () => {
    const inputData = {
        length: 0.01,
        distinctivenessScore: 2, // Minimum distinctiveness
        conditionScore: 1, // Minimum condition
        strategicSignificanceMultiplier: 1.0, // Minimum strategic significance
        temporalMultiplier: 0.3197967361, // Minimum temporal multiplier (30+)
        difficultyMultiplier: 1, // Minimum difficulty
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 0.01 * 2 * 1 * 1.0 * 0.3197967361 * 1
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(0.006395935, 6);
});

test("enrichWithHedgerowUnitsDelivered - with all maximum values", () => {
    const inputData = {
        length: 10.0,
        distinctivenessScore: 6, // Maximum distinctiveness
        conditionScore: 3, // Maximum condition
        strategicSignificanceMultiplier: 1.15, // Maximum strategic significance
        temporalMultiplier: 1.0, // Maximum temporal multiplier (0 years)
        difficultyMultiplier: 1.5, // Maximum difficulty
    };

    const result = enrichWithHedgerowUnitsDelivered(inputData);

    // 10.0 * 6 * 3 * 1.15 * 1.0 * 1.5
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(310.5, 1);
});

test("full schema validation - Native hedgerow to Good", () => {
    const result = v.safeParse(onSiteHedgerowCreationSchema, {
        habitatType: "Native hedgerow",
        length: 0.5,
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Verify calculated values
        expect(result.output.distinctivenessScore).toEqual(2); // Native hedgerow = Low = 2
        expect(result.output.conditionScore).toEqual(3); // Good = 3
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.15);
        expect(result.output.standardTimeToTargetCondition).toBe(12);
        expect(result.output.finalTimeToTargetCondition).toBe(12);
        expect(result.output.temporalMultiplier).toBeCloseTo(0.6521203607, 5);
        expect(result.output.difficultyMultiplier).toEqual(1);
        // 0.5 * 2 * 3 * 1.15 * 0.6521203607 * 1
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(2.2498152, 3);
    }
});

test("full schema validation - Species-rich hedgerow with advance", () => {
    const result = v.safeParse(onSiteHedgerowCreationSchema, {
        habitatType: "Species-rich native hedgerow",
        length: 0.2,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        habitatCreatedInAdvance: 3,
        delayInStartingHabitatCreation: 0,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Species-rich native hedgerow = Medium = 4
        // Moderate condition = 2
        // Strategic significance = 1.1
        // Standard time to Moderate = 5 years
        // With 3 years advance = 2 years final
        expect(result.output.distinctivenessScore).toEqual(4);
        expect(result.output.conditionScore).toEqual(2);
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);
        expect(result.output.standardTimeToTargetCondition).toEqual(5);
        expect(result.output.finalTimeToTargetCondition).toEqual(2);
        expect(result.output.temporalMultiplier).toBeCloseTo(0.931225, 5);
        expect(result.output.difficultyMultiplier).toEqual(1);
        // 0.2 * 4 * 2 * 1.1 * 0.931225 * 1
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(1.638956, 3);
    }
});

test("full schema validation - with delay", () => {
    const result = v.safeParse(onSiteHedgerowCreationSchema, {
        habitatType: "Native hedgerow",
        length: 0.1,
        condition: "Poor",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 2,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Native hedgerow = Low = 2
        // Poor condition = 1
        // Strategic significance = 1.1
        // Standard time to Poor = 1 year
        // With 2 years delay = 3 years final
        expect(result.output.distinctivenessScore).toEqual(2);
        expect(result.output.conditionScore).toEqual(1);
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);
        expect(result.output.standardTimeToTargetCondition).toEqual(1);
        expect(result.output.finalTimeToTargetCondition).toEqual(3);
        expect(result.output.temporalMultiplier).toBeCloseTo(0.898632125, 5);
        expect(result.output.difficultyMultiplier).toEqual(1);
        // 0.1 * 2 * 1 * 1.1 * 0.898632125 * 1
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(0.19769906, 5);
    }
});

test("full schema validation - with '30+' delay", () => {
    const result = v.safeParse(onSiteHedgerowCreationSchema, {
        habitatType: "Native hedgerow",
        length: 0.15,
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: "30+",
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Native hedgerow = Low = 2
        // Good condition = 3
        // Strategic significance = 1.1
        // Standard time to Good = 12 years
        // With "30+" delay (31) = 43 years, which becomes "30+"
        expect(result.output.distinctivenessScore).toEqual(2);
        expect(result.output.conditionScore).toEqual(3);
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);
        expect(result.output.standardTimeToTargetCondition).toEqual(12);
        expect(result.output.finalTimeToTargetCondition).toEqual('30+');
        expect(result.output.temporalMultiplier).toBeCloseTo(0.3197967361, 5);
        expect(result.output.difficultyMultiplier).toEqual(1);
        // 0.15 * 2 * 3 * 1.1 * 0.3197967361 * 1
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(0.316598768, 3);
    }
});

test("full schema validation - with '30+' advance", () => {
    const result = v.safeParse(onSiteHedgerowCreationSchema, {
        habitatType: "Ecologically valuable line of trees",
        length: 0.2,
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        habitatCreatedInAdvance: "30+",
        delayInStartingHabitatCreation: 0,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Ecologically valuable line of trees = Medium = 4
        // Good condition = 3
        // Strategic significance = 1.1
        // Standard time to Good = "30+"
        // With "30+" advance (31) = 0 years (30 represented as 31 internally, so 31 - 31 = 0)
        expect(result.output.distinctivenessScore).toEqual(4);
        expect(result.output.conditionScore).toEqual(3);
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);
        expect(result.output.standardTimeToTargetCondition).toEqual('30+');
        expect(result.output.finalTimeToTargetCondition).toEqual(0);
        expect(result.output.difficultyMultiplier).toEqual(1); // Low difficulty when created in advance
        // 0 years uses temporal multiplier of 1.0
        // 0.2 * 4 * 3 * 1.1 * 1.0 * 1 = 2.64
        expect(result.output.hedgerowUnitsDelivered).toBeCloseTo(2.64, 2);
    }
});

