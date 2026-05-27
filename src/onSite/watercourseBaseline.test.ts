import { expect, test } from "bun:test";
import * as v from 'valibot';
import {
    onSiteWatercourseBaselineSchema,
    type OnSiteWatercourseBaselineSchema
} from "./watercourseBaseline";

export function fixture(overrides: Partial<OnSiteWatercourseBaselineSchema> = {}): OnSiteWatercourseBaselineSchema {
    return {
        watercourseType: "Other rivers and streams",
        length: 1,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        lengthRetained: 1,
        lengthEnhanced: 0,
        bespokeCompensation: "No",
        userComments: "",
        planningAuthorityComments: "",
        habitatReferenceNumber: "",
        ...overrides,
    }
}

// Validation Tests
test("valid watercourse types", () => {
    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Priority habitat" })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Other rivers and streams" })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Ditches" })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Canals" })
    ).success).toBeTrue();

    // Culvert only supports "Poor" condition
    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Culvert", condition: "Poor", watercourseEncroachment: "N/A - Culvert", riparianEncroachment: "N/A - Culvert" })
    ).success).toBeTrue();
});

test("invalid watercourse type", () => {
    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ watercourseType: "Invalid type" as any })
    ).success).toBeFalse();
});

test("invalid condition for watercourse type", () => {
    // Culvert does not support "Moderate" condition (only "Poor")
    const result = v.safeParse(onSiteWatercourseBaselineSchema,
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
        expect(v.safeParse(onSiteWatercourseBaselineSchema,
            fixture({ watercourseType: "Priority habitat", condition })
        ).success).toBeTrue();

        expect(v.safeParse(onSiteWatercourseBaselineSchema,
            fixture({ watercourseType: "Other rivers and streams", condition })
        ).success).toBeTrue();
    });
});

test("length arithmetic validation - valid", () => {
    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.6, lengthEnhanced: 0.4 })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ length: 2.5, lengthRetained: 1.5, lengthEnhanced: 1.0 })
    ).success).toBeTrue();

    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 1, lengthEnhanced: 0 })
    ).success).toBeTrue();
});

test("length arithmetic validation - invalid", () => {
    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 0.7, lengthEnhanced: 0.5 })
    ).success).toBeFalse();

    expect(v.safeParse(onSiteWatercourseBaselineSchema,
        fixture({ length: 1, lengthRetained: 1.5, lengthEnhanced: 0 })
    ).success).toBeFalse();
});

test("valid encroachment combinations", () => {
    const watercourseEncroachments = ["No Encroachment", "Minor", "Major"] as const;
    const riparianEncroachments = ["No Encroachment/ No Encroachment", "Minor/ No Encroachment", "Moderate/ Minor", "Major/Major"] as const;

    watercourseEncroachments.forEach(wEnc => {
        riparianEncroachments.forEach(rEnc => {
            expect(v.safeParse(onSiteWatercourseBaselineSchema,
                fixture({ watercourseEncroachment: wEnc, riparianEncroachment: rEnc })
            ).success).toBeTrue();
        });
    });
});

// Full Schema Integration Tests
test("full schema validation and calculation - Priority habitat", () => {
    const result = v.parse(onSiteWatercourseBaselineSchema, fixture({
        watercourseType: "Priority habitat",
        length: 1,
        condition: "Good",
        strategicSignificance: "Formally identified in local strategy",
        watercourseEncroachment: "No Encroachment",
        riparianEncroachment: "No Encroachment/ No Encroachment",
        lengthRetained: 0.7,
        lengthEnhanced: 0.3,
    }));

    expect(result.distinctivenessScore).toEqual(8);
    expect(result.conditionScore).toEqual(3);
    expect(result.strategicSignificanceMultiplier).toEqual(1.15);
    expect(result.watercourseEncroachmentMultiplier).toEqual(1);
    expect(result.riparianEncroachmentMultiplier).toEqual(1);

    // Total units: 1 * 8 * 3 * 1.15 * 1 * 1 = 27.6
    expect(result.totalWatercourseUnits).toBeCloseTo(27.6, 5);
    // Units retained: 0.7 * 8 * 3 * 1.15 * 1 * 1 = 19.32
    expect(result.unitsRetained).toBeCloseTo(19.32, 5);
    // Units enhanced: 0.3 * 8 * 3 * 1.15 * 1 * 1 = 8.28
    expect(result.unitsEnhanced).toBeCloseTo(8.28, 5);
    // Length lost: 0
    expect(result.lengthLost).toBeCloseTo(0, 5);
    expect(result.unitsLost).toBeCloseTo(0, 5);
});

test("full schema validation and calculation - Ditches with encroachment", () => {
    const result = v.parse(onSiteWatercourseBaselineSchema, fixture({
        watercourseType: "Ditches",
        length: 2,
        condition: "Moderate",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        watercourseEncroachment: "Minor",
        riparianEncroachment: "Moderate/ Minor",
        lengthRetained: 1.5,
        lengthEnhanced: 0,
    }));

    expect(result.distinctivenessScore).toEqual(4);
    expect(result.conditionScore).toEqual(2);
    expect(result.strategicSignificanceMultiplier).toEqual(1.1);
    expect(result.watercourseEncroachmentMultiplier).toEqual(0.8);
    expect(result.riparianEncroachmentMultiplier).toEqual(0.9);

    // Total units: 2 * 4 * 2 * 1.1 * 0.8 * 0.9 = 12.672
    expect(result.totalWatercourseUnits).toBeCloseTo(12.672, 5);
    // Units retained: 1.5 * 4 * 2 * 1.1 * 0.8 * 0.9 = 9.504
    expect(result.unitsRetained).toBeCloseTo(9.504, 5);
    // Units enhanced: 0
    expect(result.unitsEnhanced).toEqual(0);
    // Length lost: 0.5
    expect(result.lengthLost).toBeCloseTo(0.5, 5);
    // Units lost: 12.672 - 9.504 = 3.168
    expect(result.unitsLost).toBeCloseTo(3.168, 5);
});

test("full schema validation and calculation - Culvert with minimal encroachment", () => {
    const result = v.parse(onSiteWatercourseBaselineSchema, fixture({
        watercourseType: "Culvert",
        length: 0.5,
        condition: "Poor",
        strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
        watercourseEncroachment: "N/A - Culvert",
        riparianEncroachment: "N/A - Culvert",
        lengthRetained: 0.5,
        lengthEnhanced: 0,
    }));

    expect(result.distinctivenessScore).toEqual(2);
    expect(result.conditionScore).toEqual(1);
    expect(result.strategicSignificanceMultiplier).toEqual(1);
    expect(result.watercourseEncroachmentMultiplier).toEqual(0.68);
    expect(result.riparianEncroachmentMultiplier).toEqual(1);

    // Total units: 0.5 * 2 * 1 * 1 * 0.68 * 1 = 0.68
    expect(result.totalWatercourseUnits).toBeCloseTo(0.68, 5);
    // Units retained: 0.5 * 2 * 1 * 1 * 0.68 * 1 = 0.68
    expect(result.unitsRetained).toBeCloseTo(0.68, 5);
    // No loss
    expect(result.lengthLost).toEqual(0);
    expect(result.unitsLost).toEqual(0);
});

test("full schema validation - all conditions", () => {
    const conditions = ["Good", "Fairly Good", "Moderate", "Fairly Poor", "Poor"] as const;
    const expectedScores = [3, 2.5, 2, 1.5, 1];

    conditions.forEach((condition, index) => {
        const result = v.parse(onSiteWatercourseBaselineSchema, fixture({
            watercourseType: "Other rivers and streams",
            condition,
        }));

        expect(result.conditionScore).toBeDefined();
        // @ts-expect-error Not possible not accounted for - that's okay
        expect(result.conditionScore).toEqual(expectedScores[index]);
    });
});
