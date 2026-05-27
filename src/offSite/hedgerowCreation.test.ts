import { expect, test } from "bun:test";
import { offSiteHedgerowCreationSchema, type OffSiteHedgerowCreationSchema } from "./hedgerowCreation";
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

export function fixture(overrides: Partial<OffSiteHedgerowCreationSchema> = {}): OffSiteHedgerowCreationSchema {
    return {
        habitatType: "Native hedgerow",
        length: 1,
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        spatialRiskCategory: undefined,
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
        offSiteReferenceNumber: "",
        ...overrides,
    }
}

test("valid hedgerow type", () => {
    expect(fixture()).toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatType: "Native hedgerow with trees" })).toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatType: "Native hedgerow - associated with bank or ditch" })).toBeParseableBy(offSiteHedgerowCreationSchema)
})

test("invalid hedgerow type", () => {
    expect(fixture({ habitatType: "Invalid hedgerow" })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
})

test("Non-native hedgerow can only have Poor condition", () => {
    expect(fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Poor" })).toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Good" })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatType: "Non-native and ornamental hedgerow", condition: "Moderate" })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
})

test("cannot have both advance and delay", () => {
    expect(fixture({ habitatCreatedInAdvance: 5, delayInStartingHabitatCreation: 0 })).toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatCreatedInAdvance: 0, delayInStartingHabitatCreation: 5 })).toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatCreatedInAdvance: 5, delayInStartingHabitatCreation: 5 })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatCreatedInAdvance: "30+", delayInStartingHabitatCreation: 5 })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ habitatCreatedInAdvance: 5, delayInStartingHabitatCreation: "30+" })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
})

test("off-site reference required when spatial risk category is set", () => {
    expect(fixture({ spatialRiskCategory: "This metric is being used by an off-site provider", offSiteReferenceNumber: "OFF-001" })).toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ spatialRiskCategory: "This metric is being used by an off-site provider", offSiteReferenceNumber: "" })).not.toBeParseableBy(offSiteHedgerowCreationSchema)
    expect(fixture({ spatialRiskCategory: undefined, offSiteReferenceNumber: "" })).toBeParseableBy(offSiteHedgerowCreationSchema)
})

test("enriches with hedgerow data", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture());

    expect(result.distinctivenessScore).toBe(2); // Native hedgerow has Low distinctiveness
    expect(result.conditionScore).toBe(3); // Good condition
    expect(result.strategicSignificanceMultiplier).toBe(1.1);
    expect(result.technicalDifficultyCreation).toBe("Low");
    expect(result.technicalDifficultyCreationMultiplier).toBe(1);
})

test("enriches with spatial risk multiplier", () => {
    const resultWithSpatialRisk = v.parse(offSiteHedgerowCreationSchema, fixture({
        spatialRiskCategory: "This metric is being used by an off-site provider",
        offSiteReferenceNumber: "OFF-001",
    }));
    expect(resultWithSpatialRisk.spatialRiskMultiplier).toBe(1.0);

    const resultWithoutSpatialRisk = v.parse(offSiteHedgerowCreationSchema, fixture());
    expect(resultWithoutSpatialRisk.spatialRiskMultiplier).toBe(1.0);
})

test("calculates temporal data - no advance or delay", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Good",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
    }));

    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(12);
    expect(result.temporalMultiplier).toBe(0.6521203607);
})

test("calculates temporal data - with advance", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Good",
        habitatCreatedInAdvance: 5,
        delayInStartingHabitatCreation: 0,
    }));

    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(7);
    expect(result.temporalMultiplier).toBe(0.7792758067);
})

test("calculates temporal data - with delay", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Good",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 5,
    }));

    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(17);
    expect(result.temporalMultiplier).toBe(0.5457130340999999);
})

test("calculates temporal data - advance exceeds standard time", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Good",
        habitatCreatedInAdvance: 15,
        delayInStartingHabitatCreation: 0,
    }));

    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(-3);
    expect(result.temporalMultiplier).toBe(""); // Negative time not in lookup table
})

test("calculates temporal data - 30+ standard time", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Ecologically valuable line of trees",
        condition: "Good",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
    }));

    expect(result.standardTimeToTargetCondition).toBe("30+");
    expect(result.finalTimeToTargetCondition).toBe("30+");
    expect(result.temporalMultiplier).toBe(0.3197967361);
})

test("calculates temporal data - 30+ with advance brings it under 30", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Ecologically valuable line of trees",
        condition: "Good",
        habitatCreatedInAdvance: 5,
        delayInStartingHabitatCreation: 0,
    }));

    expect(result.standardTimeToTargetCondition).toBe("30+");
    expect(result.finalTimeToTargetCondition).toBe(26);
    expect(result.temporalMultiplier).toBe(0.396013642);
})

test("calculates difficulty data - standard case", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Good",
    }));

    expect(result.standardDifficulty).toBe("Low");
    expect(result.finalDifficulty).toBe("Low");
    expect(result.difficultyMultiplier).toBe(1);
})

test("calculates difficulty data - created in advance with final time <= 0", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Good",
        habitatCreatedInAdvance: 25,
    }));

    expect(result.standardDifficulty).toBe("Low");
    expect(result.finalDifficulty).toBe("Low");
    expect(result.difficultyMultiplier).toBe(1);
})

test("calculates hedgerow units delivered - without spatial risk", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        length: 1,
        habitatType: "Native hedgerow",
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
    }));

    // Native hedgerow: distinctiveness = 2, condition = 3, strategic = 1.1
    // Standard time to Good = 12 years, temporal multiplier = 0.6521203607
    // Technical difficulty = Low, multiplier = 1
    // Expected: 1 * 2 * 3 * 1.1 * 0.6521203607 * 1 = 4.303994380620001
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(4.303994380620001, 5);

    // Without spatial risk, both should be the same
    expect(result.hedgerowUnitsDeliveredWithSpatialRisk).toBeCloseTo(4.303994380620001, 5);
})

test("calculates hedgerow units delivered - with spatial risk", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        length: 1,
        habitatType: "Native hedgerow",
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        spatialRiskCategory: "This metric is being used by an off-site provider",
        offSiteReferenceNumber: "OFF-001",
    }));

    // Base calculation: 1 * 2 * 3 * 1.1 * 0.6521203607 * 1 = 4.303994380620001
    // Spatial risk multiplier for "This metric is being used by an off-site provider" = 1.0
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(4.303994380620001, 5);
    expect(result.hedgerowUnitsDeliveredWithSpatialRisk).toBeCloseTo(4.303994380620001 * 1.0, 5);
})

test("calculates hedgerow units delivered - with different spatial risk", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        length: 1,
        habitatType: "Native hedgerow",
        condition: "Good",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        spatialRiskCategory: "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA",
        offSiteReferenceNumber: "OFF-001",
    }));

    // Base calculation: 1 * 2 * 3 * 1.1 * 0.6521203607 * 1 = 4.303994380620001
    // Spatial risk multiplier for "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA" = 0.75
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(4.303994380620001, 5);
    expect(result.hedgerowUnitsDeliveredWithSpatialRisk).toBeCloseTo(4.303994380620001 * 0.75, 5);
})

test("calculates units for Poor condition", () => {
    // Poor condition has very short time to target (1 year)
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow",
        condition: "Poor",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 0,
    }));

    // Poor condition for Native hedgerow has 1 year standard time
    expect(result.standardTimeToTargetCondition).toBe(1);
    expect(result.finalTimeToTargetCondition).toBe(1);
    expect(result.temporalMultiplier).toBe(0.965);

    // 1 * 2 * 1 * 1.1 * 0.965 * 1 = 2.123
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(2.123, 5);
    expect(result.hedgerowUnitsDeliveredWithSpatialRisk).toBeCloseTo(2.123, 5);
})

test("full schema validation - Native hedgerow with trees", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow with trees",
        length: 2.5,
        condition: "Moderate",
        strategicSignificance: "Formally identified in local strategy",
        habitatCreatedInAdvance: 5,
        delayInStartingHabitatCreation: 0,
    }));

    expect(result.habitatType).toBe("Native hedgerow with trees");
    expect(result.length).toBe(2.5);
    expect(result.condition).toBe("Moderate");
    expect(result.distinctivenessScore).toBe(4); // Native hedgerow with trees has Medium distinctiveness
    expect(result.conditionScore).toBe(2); // Moderate condition
    expect(result.strategicSignificanceMultiplier).toBe(1.15);

    // Standard time to Moderate = 10 years, with 5 years advance = 5 years
    expect(result.standardTimeToTargetCondition).toBe(10);
    expect(result.finalTimeToTargetCondition).toBe(5);
    expect(result.temporalMultiplier).toBe(0.8368287006);

    // Technical difficulty Low, multiplier = 1
    expect(result.technicalDifficultyCreation).toBe("Low");
    expect(result.difficultyMultiplier).toBe(1);

    // Units: 2.5 * 4 * 2 * 1.15 * 0.8368287006 * 1
    const expectedUnits = 2.5 * 4 * 2 * 1.15 * 0.8368287006 * 1;
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(expectedUnits, 5);
})

test("full schema validation - Native hedgerow - associated with bank or ditch", () => {
    const result = v.parse(offSiteHedgerowCreationSchema, fixture({
        habitatType: "Native hedgerow - associated with bank or ditch",
        length: 1.5,
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        habitatCreatedInAdvance: 0,
        delayInStartingHabitatCreation: 3,
        spatialRiskCategory: "Compensation outside LPA or NCA of impact site and neighbouring LPA or NCA",
        offSiteReferenceNumber: "OFF-002",
    }));

    expect(result.habitatType).toBe("Native hedgerow - associated with bank or ditch");
    expect(result.length).toBe(1.5);
    expect(result.distinctivenessScore).toBe(4); // Medium distinctiveness
    expect(result.conditionScore).toBe(3); // Good condition
    expect(result.strategicSignificanceMultiplier).toBe(1.15);

    // Standard time to Good = 12 years, with 3 years delay = 15 years
    expect(result.standardTimeToTargetCondition).toBe(12);
    expect(result.finalTimeToTargetCondition).toBe(15);
    expect(result.temporalMultiplier).toBe(0.5860163055000001);

    // Technical difficulty Low, multiplier = 1
    expect(result.technicalDifficultyCreation).toBe("Low");
    expect(result.difficultyMultiplier).toBe(1);

    // Spatial risk multiplier for "Compensation outside LPA or NCA of impact site and neighbouring LPA or NCA" = 0.5
    expect(result.spatialRiskMultiplier).toBe(0.5);

    // Base units: 1.5 * 4 * 3 * 1.15 * 0.5860163055000001 * 1
    const baseUnits = 1.5 * 4 * 3 * 1.15 * 0.5860163055000001 * 1;
    expect(result.hedgerowUnitsDelivered).toBeCloseTo(baseUnits, 5);
    expect(result.hedgerowUnitsDeliveredWithSpatialRisk).toBeCloseTo(baseUnits * 0.5, 5);
})
