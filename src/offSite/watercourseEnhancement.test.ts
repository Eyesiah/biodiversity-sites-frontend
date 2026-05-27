import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    offSiteWatercourseEnhancementSchema,
    type OffSiteWatercourseEnhancementSchema
} from "./watercourseEnhancement";
import type { OffSiteWatercourseBaseline } from "./watercourseBaseline";

function createBaseline(overrides: Partial<OffSiteWatercourseBaseline> = {}): OffSiteWatercourseBaseline {
    return {
        watercourseType: "Ditches",
        length: 1,
        condition: "Poor",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        spatialRiskCategory: "Within waterbody catchment",
        lengthRetained: 0,
        lengthEnhanced: 0.5,
        bespokeCompensation: "No",
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
        offSiteReferenceNumber: "OFF-001",
        distinctiveness: "Medium",
        distinctivenessScore: 4,
        conditionScore: 1,
        strategicSignificanceCategory: "Area/compensation not in local strategy or undesignated",
        strategicSignificanceMultiplier: 1.1,
        watercourseEncroachmentMultiplier: 1,
        riparianEncroachmentMultiplier: 1,
        spatialRiskMultiplier: 1,
        tradingRules: "Same habitat required =",
        unitsRetained: 0,
        unitsEnhanced: 2.2, // 0.5 * 4 * 1 * 1.1 * 1 * 1
        totalWatercourseUnitsSRM: 4.4,
        totalWatercourseUnits: 4.4,
        lengthLost: 0.5,
        unitsLost: 2.2,
        ...overrides,
    } as OffSiteWatercourseBaseline;
}

export function fixture(overrides: Partial<OffSiteWatercourseEnhancementSchema> = {}): OffSiteWatercourseEnhancementSchema {
    return {
        baseline: createBaseline(),
        watercourseType: "Ditches",
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEnhancedInAdvance: 0,
        watercourseEnhancedDelay: 0,
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
        ...overrides,
    }
}

test("valid enhancement from Poor to Moderate", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture());
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.enhancementPathway).toBe("Poor to Moderate");
        expect(result.output.timeToTargetCondition).toBe(4);
    }
});

test("valid enhancement from Poor to Good", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        condition: "Good"
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.enhancementPathway).toBe("Poor to Good");
        expect(result.output.timeToTargetCondition).toBe(8);
    }
});

test("valid enhancement from Moderate to Fairly Good", () => {
    const baseline = createBaseline({
        condition: "Moderate",
        conditionScore: 2,
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        condition: "Fairly Good"
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.enhancementPathway).toBe("Moderate to Fairly Good");
        expect(result.output.timeToTargetCondition).toBe(2);
    }
});

test("cannot reduce condition", () => {
    const baseline = createBaseline({
        condition: "Good",
        conditionScore: 3,
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        condition: "Moderate" // Trying to reduce from Good to Moderate
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues[0].message).toContain("Enhancement must improve");
    }
});

test("cannot reduce distinctiveness (trading down)", () => {
    const baseline = createBaseline({
        watercourseType: "Other rivers and streams",
        distinctivenessScore: 6,
        distinctiveness: "High",
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Ditches" // Trying to reduce from High to Medium distinctiveness
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues[0].message).toContain("Trading rules");
    }
});

test("valid distinctiveness upgrade uses 10 year fallback", () => {
    const baseline = createBaseline({
        watercourseType: "Ditches",
        distinctivenessScore: 4,
        distinctiveness: "Medium",
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Other rivers and streams" // Upgrading from Medium to High
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.timeToTargetCondition).toBe(10); // Fallback for distinctiveness upgrade
    }
});

test("cannot have both enhanced in advance and delayed", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        watercourseEnhancedInAdvance: 2,
        watercourseEnhancedDelay: 3
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues[0].message).toContain("Cannot have both");
    }
});

test("enhanced in advance reduces time to target", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        condition: "Moderate",
        watercourseEnhancedInAdvance: 2 // Standard is 4 years, so 4 - 2 = 2
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.timeToTargetCondition).toBe(4);
        expect(result.output.finalTimeToTargetCondition).toBe(2);
    }
});

test("enhanced in advance reaching target applies low difficulty", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        condition: "Moderate",
        watercourseEnhancedInAdvance: 4 // Equals standard time
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.finalTimeToTargetCondition).toBe(0);
        expect(result.output.finalDifficultyOfEnhancement).toBe("Low");
        expect(result.output.difficultyMultiplierApplied).toBe(1);
    }
});

test("delay increases time to target", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        condition: "Moderate",
        watercourseEnhancedDelay: 3 // Standard is 4 years, so 4 + 3 = 7
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.timeToTargetCondition).toBe(4);
        expect(result.output.finalTimeToTargetCondition).toBe(7);
    }
});

test("culvert must use N/A - Culvert for watercourse encroachment", () => {
    const baseline = createBaseline({
        watercourseType: "Culvert",
        condition: "Poor",
        conditionScore: 1,
        watercourseEncroachment: "N/A - Culvert",
        riparianEncroachment: "N/A - Culvert",
        distinctivenessScore: 2,
        distinctiveness: "Low",
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Culvert",
        condition: "Poor",
        watercourseEncroachment: "No Encroachment", // Invalid for Culvert
        riparianEncroachment: "N/A - Culvert"
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues.some(issue => issue.message.includes("Culvert"))).toBeTrue();
    }
});

test("culvert must use N/A - Culvert for riparian encroachment", () => {
    const baseline = createBaseline({
        watercourseType: "Culvert",
        condition: "Poor",
        conditionScore: 1,
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment", // Baseline uses different schema
        distinctivenessScore: 2,
        distinctiveness: "Low",
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Culvert",
        condition: "Poor",
        watercourseEncroachment: "N/A - Culvert",
        riparianEncroachment: "None", // Invalid for Culvert
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues.some(issue => issue.message.includes("Culvert"))).toBeTrue();
    }
});

// Note: Culvert enhancement from Poor to Poor with same watercourse type
// is not possible as it would violate trading rules (no condition or distinctiveness improvement)

test("enhancement with encroachment multipliers", () => {
    const baseline = createBaseline({
        watercourseType: "Other rivers and streams",
        condition: "Poor",
        conditionScore: 1,
        distinctivenessScore: 6,
        distinctiveness: "High",
    });
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Other rivers and streams",
        condition: "Moderate",
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor",
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.watercourseEncroachmentMultiplier).toBe(0.8);
        expect(result.output.riparianEncroachmentMultiplier).toBe(0.9);
        expect(result.output.watercourseUnitsDelivered).toBeGreaterThan(0);
    }
});

test("enhancement with 30+ year advance caps to 0 time", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        condition: "Moderate",
        watercourseEnhancedInAdvance: "30+"
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.finalTimeToTargetCondition).toBe(0);
        expect(result.output.finalDifficultyOfEnhancement).toBe("Low");
    }
});

test("enhancement with 30+ year delay caps to 30+", () => {
    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        condition: "Moderate",
        watercourseEnhancedDelay: "30+"
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.finalTimeToTargetCondition).toBe("30+");
    }
});

test("same condition requires distinctiveness upgrade", () => {
    const baseline = createBaseline({
        watercourseType: "Ditches",
        condition: "Moderate",
        conditionScore: 2,
        distinctivenessScore: 4,
        distinctiveness: "Medium",
    });

    // Try to enhance with same condition and same distinctiveness - should fail
    const result1 = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Ditches", // Same distinctiveness
        condition: "Moderate", // Same condition
    }));
    expect(result1.success).toBeFalse();
    if (!result1.success) {
        expect(result1.issues[0].message).toContain("Enhancement must improve");
    }

    // Same condition but with distinctiveness upgrade - should succeed
    const result2 = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Other rivers and streams", // Higher distinctiveness
        condition: "Moderate", // Same condition
    }));
    expect(result2.success).toBeTrue();
});

test("watercourse units delivered calculation - basic case", () => {
    const baseline = createBaseline({
        watercourseType: "Ditches",
        condition: "Poor",
        conditionScore: 1,
        distinctivenessScore: 4,
        lengthEnhanced: 1,
        unitsEnhanced: 4.4, // 1 * 4 * 1 * 1.1 * 1 * 1
    });

    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Ditches",
        condition: "Moderate",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        // Delta method:
        // proposedUnits = 1 * 4 * 2 * 1.1 = 8.8
        // baselineUnits = 1 * 4 * 1 * 1.1 = 4.4
        // delta = (8.8 - 4.4) * difficulty * temporal
        // watercourseUnitsDelivered = (delta + 4.4) * strategic * watercourseEnc * riparianEnc
        expect(result.output.watercourseUnitsDelivered).toBeGreaterThan(4.4); // Must be greater than baseline
    }
});

test("enhancement pathway is correctly formatted", () => {
    const baseline = createBaseline({
        condition: "Poor",
        conditionScore: 1,
    });

    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        condition: "Fairly Good",
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.enhancementPathway).toBe("Poor to Fairly Good");
    }
});

test("enhancement calculates units with all multipliers", () => {
    const baseline = createBaseline({
        watercourseType: "Priority habitat",
        condition: "Moderate",
        conditionScore: 2,
        distinctivenessScore: 8,
        distinctiveness: "V.High",
        lengthEnhanced: 0.5,
        unitsEnhanced: 9.2, // 0.5 * 8 * 2 * 1.15 * 1 * 1
    });

    const result = v.safeParse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Priority habitat",
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor",
        watercourseEnhancedInAdvance: 2,
    }));

    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.watercourseUnitsDelivered).toBeGreaterThan(0);
        expect(result.output.watercourseEncroachmentMultiplier).toBe(0.8);
        expect(result.output.riparianEncroachmentMultiplier).toBe(0.9);
        expect(result.output.strategicSignificanceMultiplier).toBe(1.15);
    }
});

test("calculation of units with spatial risk multiplier", () => {
    const baseline = createBaseline({
        watercourseType: "Priority habitat",
        condition: "Moderate",
        conditionScore: 2,
        distinctivenessScore: 8,
        distinctiveness: "V.High",
        lengthEnhanced: 0.5,
        unitsEnhanced: 9.2, // 0.5 * 8 * 2 * 1.15 * 1 * 1
    });
    const insideBoundary = v.parse(offSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Priority habitat",
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor",
        watercourseEnhancedInAdvance: 2,
    }));

    expect(insideBoundary.spatialRiskMultiplier).toEqual(1)
    expect(insideBoundary.watercourseUnitsDelivered).toBeGreaterThan(0);
    expect(insideBoundary.watercourseUnitsDeliveredWithSpatialRisk).toBeGreaterThan(0);

    const outsideBoundary = v.parse(offSiteWatercourseEnhancementSchema, fixture({
        baseline: {
            ...baseline,
            spatialRiskCategory: "Outside waterbody catchment, but within operational catchment",

        },
        watercourseType: "Priority habitat",
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor",
        watercourseEnhancedInAdvance: 2,
    }));

    expect(outsideBoundary.spatialRiskMultiplier).toEqual(0.75)
    expect(outsideBoundary.watercourseUnitsDelivered).toBeGreaterThan(0);
    expect(outsideBoundary.watercourseUnitsDeliveredWithSpatialRisk).toBeGreaterThan(0);
    expect(outsideBoundary.watercourseUnitsDeliveredWithSpatialRisk).toBeCloseTo(outsideBoundary.watercourseUnitsDelivered * 0.75, 2);
})
