import { expect, test } from "bun:test";
import { offSiteHedgerowBaselineSchema, type OffSiteHedgerowBaselineSchema } from "./hedgerowBaseline";
import * as v from 'valibot';

expect.extend({
    toBeParseableBy:
        function <TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
            input: unknown,
            schema: TSchema,
        ) {
            const result = v.safeParse(schema, input);
            return {
                pass: !!result.success,
                // @ts-expect-error TS2339
                message: () => `Expected ${this.utils.printReceived(input)} to be parseable. \nIssues: ${this.utils.printReceived(result.issues)}`,
            }
        },
})

export function fixture(overrides: Partial<OffSiteHedgerowBaselineSchema> = {}): OffSiteHedgerowBaselineSchema {
    return {
        habitatType: "Native hedgerow",
        length: 1,
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        spatialRiskCategory: "This metric is being used by an off-site provider",
        lengthRetained: 0,
        lengthEnhanced: 0,
        offSiteReferenceNumber: "OFF-001",
        ...overrides,
    }
}

test("valid hedgerow type", () => {
    expect(fixture()).toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ habitatType: "Native hedgerow with trees" })).toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ habitatType: "Native hedgerow - associated with bank or ditch" })).toBeParseableBy(offSiteHedgerowBaselineSchema)
})

test("invalid hedgerow type", () => {
    expect(fixture({ habitatType: "Invalid hedgerow" })).not.toBeParseableBy(offSiteHedgerowBaselineSchema)
})

test("Non-native hedgerow can only have Poor condition", () => {
    expect(fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Poor" })).toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Good" })).not.toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Moderate" })).not.toBeParseableBy(offSiteHedgerowBaselineSchema)
})

test("retained + enhanced cannot exceed total length", () => {
    expect(fixture({ length: 10, lengthRetained: 5, lengthEnhanced: 5 })).toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ length: 10, lengthRetained: 6, lengthEnhanced: 5 })).not.toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ length: 10, lengthRetained: 5, lengthEnhanced: 6 })).not.toBeParseableBy(offSiteHedgerowBaselineSchema)
})

test("off-site reference required when spatial risk category is set", () => {
    expect(fixture({ spatialRiskCategory: "This metric is being used by an off-site provider", offSiteReferenceNumber: "OFF-001" })).toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ spatialRiskCategory: "This metric is being used by an off-site provider", offSiteReferenceNumber: "" })).not.toBeParseableBy(offSiteHedgerowBaselineSchema)
    expect(fixture({ spatialRiskCategory: undefined, offSiteReferenceNumber: "" })).toBeParseableBy(offSiteHedgerowBaselineSchema)
})

test("calculates units correctly", () => {
    const result = v.parse(offSiteHedgerowBaselineSchema, fixture({
        length: 1,
        lengthRetained: 0.2,
        lengthEnhanced: 0.3,
    }));

    expect(result.lengthLost).toBe(0.5);
    expect(result.distinctivenessScore).toBe(2); // Native hedgerow has Low distinctiveness = 2
    expect(result.conditionScore).toBe(3);
    expect(result.strategicSignificanceMultiplier).toBe(1.1);

    // Total units without spatial risk
    expect(result.totalHedgerowUnits).toBeCloseTo(1 * 2 * 3 * 1.1, 5);

    // Units retained/enhanced
    expect(result.unitsRetained).toBeCloseTo(0.2 * 2 * 3 * 1.1, 5);
    expect(result.unitsEnhanced).toBeCloseTo(0.3 * 2 * 3 * 1.1, 5);

    // Units lost
    expect(result.unitsLost).toBeCloseTo(result.totalHedgerowUnits - result.unitsRetained - result.unitsEnhanced, 5);
})

test("calculates units with spatial risk correctly", () => {
    const result = v.parse(offSiteHedgerowBaselineSchema, fixture({
        length: 1,
        spatialRiskCategory: "This metric is being used by an off-site provider",
        offSiteReferenceNumber: "OFF-001",
    }));

    // Spatial risk multiplier for "This metric is being used by an off-site provider" should be 1.0
    expect(result.spatialRiskMultiplier).toBe(1.0);

    // Total units with spatial risk (SRM) - Native hedgerow has distinctiveness score 2
    expect(result.totalHedgerowUnitsSRM).toBeCloseTo(1 * 2 * 3 * 1.1 * 1.0, 5);

    // Total units without spatial risk
    expect(result.totalHedgerowUnits).toBeCloseTo(1 * 2 * 3 * 1.1, 5);

    // Units lost is based on total units (without SRM)
    expect(result.unitsLost).toBe(result.totalHedgerowUnits);
})
