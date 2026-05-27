import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    onSiteHedgerowBaselineSchema,
    enrichWithHedgerowData,
    enrichWithBaselineUnitsData,
    enrichWithTotalHedgerowUnits,
    enrichWithUnitsLost,
    type OnSiteHedgerowBaselineSchema
} from "./hedgerowBaseline";

export function fixture(overrides: Partial<OnSiteHedgerowBaselineSchema> = {}): OnSiteHedgerowBaselineSchema {
    return {
        habitatType: "Native hedgerow",
        length: 1,
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        condition: "Good",
        lengthRetained: 1,
        lengthEnhanced: 0,
        ...overrides,
    }
}

test("valid hedgerow types", () => {
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ habitatType: "Native hedgerow" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ habitatType: "Species-rich native hedgerow" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Poor" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ habitatType: "Line of trees" })).success).toBeTrue();
});

test("condition validation for hedgerows", () => {
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ condition: "Good" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ condition: "Moderate" })).success).toBeTrue();
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ condition: "Poor" })).success).toBeTrue();

    // Hedgerows don't use "Fairly Good" or other habitat conditions
    expect(v.safeParse(onSiteHedgerowBaselineSchema, fixture({ condition: "Fairly Good" })).success).toBeFalse();
});

test("Non-native and ornamental hedgerow can only have Poor condition", () => {
    expect(v.safeParse(onSiteHedgerowBaselineSchema,
        fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Poor" })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteHedgerowBaselineSchema,
        fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Moderate" })
    ).success).toBeFalse();

    expect(v.safeParse(onSiteHedgerowBaselineSchema,
        fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Good" })
    ).success).toBeFalse();
});

test("length arithmetic validation", () => {
    // Valid: retained + enhanced = total
    expect(v.safeParse(onSiteHedgerowBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.6, lengthEnhanced: 0.4 })
    ).success).toBeTrue();

    // Valid: retained + enhanced < total
    expect(v.safeParse(onSiteHedgerowBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.5, lengthEnhanced: 0.3 })
    ).success).toBeTrue();

    // Invalid: retained + enhanced > total
    expect(v.safeParse(onSiteHedgerowBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.7, lengthEnhanced: 0.5 })
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

test("enrichWithBaselineUnitsData calculations", () => {
    const inputData = {
        lengthRetained: 0.03,
        lengthEnhanced: 0.02,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
    };

    const result = enrichWithBaselineUnitsData(inputData);

    expect(result.unitsRetained).toBeCloseTo(0.03 * 2 * 3 * 1.15, 5);
    expect(result.unitsEnhanced).toBeCloseTo(0.02 * 2 * 3 * 1.15, 5);
    expect(result).toMatchObject(inputData);
});

test("enrichWithBaselineUnitsData with zero lengths", () => {
    const inputData = {
        lengthRetained: 0,
        lengthEnhanced: 0,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.1,
    };

    const result = enrichWithBaselineUnitsData(inputData);

    expect(result.unitsRetained).toEqual(0);
    expect(result.unitsEnhanced).toEqual(0);
});

test("enrichWithTotalHedgerowUnits calculation", () => {
    const inputData = {
        length: 0.052,
        distinctivenessScore: 2,
        conditionScore: 3,
        strategicSignificanceMultiplier: 1.15,
    };

    const result = enrichWithTotalHedgerowUnits(inputData);

    // This matches the example from the Excel sheet B-1
    expect(result.totalHedgerowUnits).toBeCloseTo(0.052 * 2 * 3 * 1.15, 5);
});

test("enrichWithUnitsLost calculations", () => {
    // No length lost
    expect(enrichWithUnitsLost({
        length: 1,
        lengthRetained: 0.7,
        lengthEnhanced: 0.3,
        totalHedgerowUnits: 10,
        unitsRetained: 7,
        unitsEnhanced: 3,
    }).unitsLost).toEqual(0);

    // Some length lost
    expect(enrichWithUnitsLost({
        length: 1,
        lengthRetained: 0.5,
        lengthEnhanced: 0.3,
        totalHedgerowUnits: 10,
        unitsRetained: 5,
        unitsEnhanced: 3,
    }).unitsLost).toEqual(2);

    // All length lost
    expect(enrichWithUnitsLost({
        length: 1,
        lengthRetained: 0,
        lengthEnhanced: 0,
        totalHedgerowUnits: 10,
        unitsRetained: 0,
        unitsEnhanced: 0,
    }).unitsLost).toEqual(10);
});

test("enrichWithUnitsLost calculates length lost correctly", () => {
    const result = enrichWithUnitsLost({
        length: 0.052,
        lengthRetained: 0.052,
        lengthEnhanced: 0,
        totalHedgerowUnits: 0.3588,
        unitsRetained: 0.3588,
        unitsEnhanced: 0,
    });

    expect(result.lengthLost).toBeCloseTo(0, 5);
    expect(result.unitsLost).toBeCloseTo(0, 5);
});

test("full schema validation with real example from Excel B-1", () => {
    // This is based on the example from row 10 in the Excel sheet
    const result = v.safeParse(onSiteHedgerowBaselineSchema, {
        habitatType: "Native hedgerow",
        length: 0.052,
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        lengthRetained: 0.052,
        lengthEnhanced: 0,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Verify calculated values match Excel
        expect(result.output.distinctivenessScore).toEqual(2); // Native hedgerow = Low = 2
        expect(result.output.conditionScore).toEqual(3); // Good = 3
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.15);
        expect(result.output.totalHedgerowUnits).toBeCloseTo(0.3588, 4); // 0.052 * 2 * 3 * 1.15
        expect(result.output.unitsRetained).toBeCloseTo(0.3588, 4);
        expect(result.output.lengthLost).toEqual(0);
        expect(result.output.unitsLost).toEqual(0);
    }
});

test("schema validation with partial loss", () => {
    const result = v.safeParse(onSiteHedgerowBaselineSchema, {
        habitatType: "Species-rich native hedgerow",
        length: 0.1,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        lengthRetained: 0.06,
        lengthEnhanced: 0.02,
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
    });

    expect(result.success).toBeTrue();

    if (result.success) {
        // Species-rich native hedgerow = Medium = 4
        // Moderate condition = 2
        // Strategic significance = 1.1
        expect(result.output.distinctivenessScore).toEqual(4);
        expect(result.output.conditionScore).toEqual(2);
        expect(result.output.strategicSignificanceMultiplier).toEqual(1.1);
        expect(result.output.totalHedgerowUnits).toBeCloseTo(0.1 * 4 * 2 * 1.1, 5);
        expect(result.output.lengthLost).toBeCloseTo(0.02, 5);
        expect(result.output.unitsLost).toBeGreaterThan(0);
    }
});
