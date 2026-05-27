import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    offSiteWatercourseBaselineSchema,
    enrichWithTotalWatercourseUnitsSRM,
    type OffSiteWatercourseBaselineSchema
} from "./watercourseBaseline";

export function fixture(overrides: Partial<OffSiteWatercourseBaselineSchema> = {}): OffSiteWatercourseBaselineSchema {
    return {
        watercourseType: "Other rivers and streams",
        length: 1,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        spatialRiskCategory: "Within waterbody catchment",
        lengthRetained: 1,
        lengthEnhanced: 0,
        bespokeCompensation: "No",
        userComments: "",
        planningAuthorityComments: "",
        habitatReferenceNumber: "",
        offSiteReferenceNumber: "OFF-001",
        ...overrides,
    }
}

// Validation Tests
test("valid watercourse types", () => {
    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Priority habitat" })
    ).success).toBeTrue();

    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Other rivers and streams" })
    ).success).toBeTrue();

    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Ditches" })
    ).success).toBeTrue();

    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Canals" })
    ).success).toBeTrue();

    // Culvert only supports "Poor" condition
    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Culvert", condition: "Poor", watercourseEncroachment: "N/A - Culvert", riparianEncroachment: "N/A - Culvert" })
    ).success).toBeTrue();
});

test("invalid watercourse type", () => {
    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Invalid type" as any })
    ).success).toBeFalse();
});

test("invalid condition for watercourse type", () => {
    // Culvert does not support "Moderate" condition (only "Poor")
    const result = v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Culvert", condition: "Moderate", watercourseEncroachment: "N/A - Culvert", riparianEncroachment: "N/A - Culvert" })
    );
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues.some(issue => issue.message.includes("not possible"))).toBeTrue();
    }
});

test("valid conditions for all watercourse types", () => {
    const conditions = ["Good", "Fairly Good", "Moderate", "Fairly Poor", "Poor"] as const;

    conditions.forEach(condition => {
        expect(v.safeParse(offSiteWatercourseBaselineSchema,
            fixture({ watercourseType: "Priority habitat", condition })
        ).success).toBeTrue();

        expect(v.safeParse(offSiteWatercourseBaselineSchema,
            fixture({ watercourseType: "Other rivers and streams", condition })
        ).success).toBeTrue();
    });
});

test("length arithmetic validation - valid", () => {
    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.6, lengthEnhanced: 0.4 })
    ).success).toBeTrue();

    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ length: 2.5, lengthRetained: 1.5, lengthEnhanced: 1.0 })
    ).success).toBeTrue();

    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 1, lengthEnhanced: 0 })
    ).success).toBeTrue();
});

test("length arithmetic validation - invalid", () => {
    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.7, lengthEnhanced: 0.5 })
    ).success).toBeFalse();

    expect(v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 1.5, lengthEnhanced: 0 })
    ).success).toBeFalse();
});

test("valid encroachment combinations", () => {
    const watercourseEncroachments = ["No Encroachment", "Minor", "Major"] as const;
    const riparianEncroachments = ["No Encroachment/ No Encroachment", "Minor/ No Encroachment", "Moderate/ Minor", "Major/Major"] as const;

    watercourseEncroachments.forEach(wEnc => {
        riparianEncroachments.forEach(rEnc => {
            expect(v.safeParse(offSiteWatercourseBaselineSchema,
                fixture({ watercourseEncroachment: wEnc, riparianEncroachment: rEnc })
            ).success).toBeTrue();
        });
    });
});

test("valid spatial risk categories", () => {
    const spatialRiskCategories = [
        "Within waterbody catchment",
        "Outside waterbody catchment, but within operational catchment",
        "Outside operational catchment",
    ] as const;

    spatialRiskCategories.forEach(category => {
        expect(v.safeParse(offSiteWatercourseBaselineSchema,
            fixture({ spatialRiskCategory: category })
        ).success).toBeTrue();
    });
});

test("off-site reference required when spatial risk is present", () => {
    const result = v.safeParse(offSiteWatercourseBaselineSchema,
        fixture({ offSiteReferenceNumber: "" })
    );
    expect(result.success).toBeFalse();
    if (!result.success) {
        expect(result.issues[0].message).toContain("Off-site reference required");
    }
});

// Full Schema Integration Tests
test("full schema validation and calculation - Priority habitat with spatial risk", () => {
    const result = v.parse(offSiteWatercourseBaselineSchema, fixture({
        watercourseType: "Priority habitat",
        length: 1,
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        spatialRiskCategory: "Within waterbody catchment",
        lengthRetained: 0.7,
        lengthEnhanced: 0.3,
    }));

    expect(result.distinctivenessScore).toEqual(8);
    expect(result.conditionScore).toEqual(3);
    expect(result.strategicSignificanceMultiplier).toEqual(1.15);
    expect(result.watercourseEncroachmentMultiplier).toEqual(1);
    expect(result.riparianEncroachmentMultiplier).toEqual(1);
    expect(result.spatialRiskMultiplier).toEqual(1);

    // Total units SRM: 1 * 8 * 3 * 1.15 * 1 * 1 * 1 = 27.6
    expect(result.totalWatercourseUnitsSRM).toBeCloseTo(27.6, 5);
    // Total units (no spatial risk): 1 * 8 * 3 * 1.15 * 1 * 1 = 27.6
    expect(result.totalWatercourseUnits).toBeCloseTo(27.6, 5);
    // Units retained: 0.7 * 8 * 3 * 1.15 * 1 * 1 = 19.32
    expect(result.unitsRetained).toBeCloseTo(19.32, 5);
    // Units enhanced: 0.3 * 8 * 3 * 1.15 * 1 * 1 = 8.28
    expect(result.unitsEnhanced).toBeCloseTo(8.28, 5);
    expect(result.lengthLost).toBeCloseTo(0, 5);
    expect(result.unitsLost).toBeCloseTo(0, 5);
});

test("full schema validation and calculation - with reduced spatial risk multiplier", () => {
    const result = v.parse(offSiteWatercourseBaselineSchema, fixture({
        watercourseType: "Other rivers and streams",
        length: 2,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor",
        spatialRiskCategory: "Outside waterbody catchment, but within operational catchment",
        lengthRetained: 1.5,
        lengthEnhanced: 0,
    }));

    expect(result.distinctivenessScore).toEqual(6);
    expect(result.conditionScore).toEqual(2);
    expect(result.strategicSignificanceMultiplier).toEqual(1.1);
    expect(result.watercourseEncroachmentMultiplier).toEqual(0.8);
    expect(result.riparianEncroachmentMultiplier).toEqual(0.9);
    expect(result.spatialRiskMultiplier).toEqual(0.75);

    // Total units SRM: 2 * 6 * 2 * 1.1 * 0.8 * 0.9 * 0.75 = 14.256
    expect(result.totalWatercourseUnitsSRM).toBeCloseTo(14.256, 5);
    // Total units (no spatial risk): 2 * 6 * 2 * 1.1 * 0.8 * 0.9 = 19.008
    expect(result.totalWatercourseUnits).toBeCloseTo(19.008, 5);
    // Units retained: 1.5 * 6 * 2 * 1.1 * 0.8 * 0.9 = 14.256
    expect(result.unitsRetained).toBeCloseTo(14.256, 5);
    expect(result.unitsEnhanced).toEqual(0);
    // Length lost: 0.5
    expect(result.lengthLost).toBeCloseTo(0.5, 5);
    // Units lost: 19.008 - 14.256 = 4.752
    expect(result.unitsLost).toBeCloseTo(4.752, 5);
});

test("full schema validation and calculation - lowest spatial risk multiplier", () => {
    const result = v.parse(offSiteWatercourseBaselineSchema, fixture({
        watercourseType: "Ditches",
        length: 1,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        spatialRiskCategory: "Outside operational catchment",
        lengthRetained: 0,
        lengthEnhanced: 0,
    }));

    expect(result.spatialRiskMultiplier).toEqual(0.5);

    // Total units SRM: 1 * 4 * 2 * 1.1 * 1 * 1 * 0.5 = 4.4
    expect(result.totalWatercourseUnitsSRM).toBeCloseTo(4.4, 5);
    // Total units (no spatial risk): 1 * 4 * 2 * 1.1 * 1 * 1 = 8.8
    expect(result.totalWatercourseUnits).toBeCloseTo(8.8, 5);
    // All units lost
    expect(result.lengthLost).toEqual(1);
    expect(result.unitsLost).toBeCloseTo(8.8, 5);
});
