import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    onSiteWatercourseEnhancementSchema,
    type OnSiteWatercourseEnhancementSchema
} from "./watercourseEnhancement";
import type { OnSiteWatercourseBaseline } from "./watercourseBaseline";

function createBaseline(overrides: Partial<OnSiteWatercourseBaseline> = {}): OnSiteWatercourseBaseline {
    return {
        watercourseType: "Ditches",
        length: 1,
        condition: "Poor",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        lengthRetained: 0,
        lengthEnhanced: 0.5,
        bespokeCompensation: "No",
        userComments: undefined,
        planningAuthorityComments: undefined,
        habitatReferenceNumber: undefined,
        distinctiveness: "Medium",
        distinctivenessScore: 4,
        conditionScore: 1,
        strategicSignificanceCategory: "Area/compensation not in local strategy or undesignated",
        strategicSignificanceMultiplier: 1.1,
        watercourseEncroachmentMultiplier: 1,
        riparianEncroachmentMultiplier: 1,
        tradingRules: "Same habitat required =",
        unitsRetained: 0,
        unitsEnhanced: 2.2, // 0.5 * 4 * 1 * 1.1 * 1 * 1
        totalWatercourseUnits: 4.4,
        lengthLost: 0.5,
        unitsLost: 2.2,
        ...overrides,
    } as OnSiteWatercourseBaseline;
}

export function fixture(overrides: Partial<OnSiteWatercourseEnhancementSchema> = {}): OnSiteWatercourseEnhancementSchema {
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
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture());
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.enhancementPathway).toBe("Poor to Moderate");
        expect(result.output.timeToTargetCondition).toBe(4);
    }
});

test("valid enhancement from Poor to Good", () => {
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
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
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
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
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        baseline,
        condition: "Moderate" // Trying to reduce from Good to Moderate
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues[0].message).toContain("Enhancement cannot reduce condition");
    }
});

test("cannot reduce distinctiveness (trading down)", () => {
    const baseline = createBaseline({
        watercourseType: "Other rivers and streams",
        distinctivenessScore: 6,
        distinctiveness: "High",
    });
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
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
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Other rivers and streams" // Upgrading from Medium to High
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.timeToTargetCondition).toBe(10); // Fallback for distinctiveness upgrade
    }
});

test("cannot have both enhanced in advance and delayed", () => {
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        watercourseEnhancedInAdvance: 2,
        watercourseEnhancedDelay: 3
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues[0].message).toContain("Cannot have both");
    }
});

test("enhanced in advance reduces time to target", () => {
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
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
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
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
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
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
        watercourseEncroachment: "N/A - Culvert",
        riparianEncroachment: "N/A - Culvert",
        distinctivenessScore: 2,
        distinctiveness: "Low",
    });
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Culvert",
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
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        distinctivenessScore: 2,
        distinctiveness: "Low",
    });
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        baseline,
        watercourseType: "Culvert",
        watercourseEncroachment: "N/A - Culvert",
        riparianEncroachment: "No Encroachment/ No Encroachment" // Invalid for Culvert
    }));
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues.some(issue => issue.message.includes("Culvert"))).toBeTrue();
    }
});

test("invalid watercourse type", () => {
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        watercourseType: "Not a real watercourse" as any
    }));
    expect(result.success).toBeFalse();
});

test("N/A enhancement pathway should fail", () => {
    const baseline = createBaseline({
        condition: "Moderate",
        conditionScore: 2,
    });
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        baseline,
        condition: "Poor" // Trying to go from Moderate to Poor (N/A in matrix)
    }));
    expect(result.success).toBeFalse();
});

test("enhancement with encroachment multipliers", () => {
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor"
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        expect(result.output.watercourseEncroachmentMultiplier).toBe(0.8);
        expect(result.output.riparianEncroachmentMultiplier).toBe(0.9);
    }
});

test("calculates units correctly with delta method - proposed length > baseline", () => {
    const baseline = createBaseline({
        lengthEnhanced: 0.5,
        distinctivenessScore: 4,
        conditionScore: 1,
    });
    const result = v.safeParse(onSiteWatercourseEnhancementSchema, fixture({
        baseline,
        condition: "Moderate", // condition score = 2
        watercourseEnhancedInAdvance: 4, // Reaches target immediately
    }));
    expect(result.success).toBeTrue();
    if (result.success) {
        // Proposed length = 0.5 (from baseline.lengthEnhanced)
        // Baseline: 0.5 * 4 * 1 = 2
        // Proposed: 0.5 * 4 * 2 = 4
        // Delta: (4 - 2) * 1 (difficulty) * 1 (temporal at 0 years) = 2
        // Final: (2 + 2) * 1.1 (strategic) * 1 (watercourse) * 1 (riparian) = 4.4
        expect(result.output.length).toBe(0.5);
        expect(result.output.watercourseUnitsDelivered).toBeCloseTo(4.4, 1);
    }
});

