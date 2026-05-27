import { expect, test, describe } from "bun:test";
import * as v from 'valibot';
import {
    enrichWithDifficultyData,
    onSiteHabitatCreationSchema,
    type OnSiteHabitatCreationSchema,
    calculateAppliedDifficultyMultiplier,
    calculateFinalDifficultyOfCreation,
    calculateDifficultyMultiplierApplied,
    calculateStandardOrAdjustedTimeToTarget
} from "./habitatCreation";

export function fixture(overrides: Partial<OnSiteHabitatCreationSchema> = {}): OnSiteHabitatCreationSchema {
    return {
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        area: 1,
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        condition: "Good",
        ...overrides,
    }
}

test("valid combinations of broad habitat and habitat type", () => {
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ broadHabitat: "Individual trees", habitatType: "Urban tree" })).success).toBeTrue()

    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ broadHabitat: "Individual trees", habitatType: "Lowland" })).success).toBeFalse()
})

test("conditions can only match available options", () => {
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ condition: "Good" })).success).toBeTrue()
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ condition: "Moderate" })).success).toBeTrue()
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ condition: "Poor" })).success).toBeTrue()

    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ condition: "Condition Assessment N/A" })).success).toBeFalse()
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({ condition: "N/A - Other" })).success).toBeFalse()
})

test("years values default to zero", () => {
    expect(v.parse(onSiteHabitatCreationSchema, fixture()).habitatCreationInAdvance).toEqual(0)
    expect(v.parse(onSiteHabitatCreationSchema, fixture()).habitatCreationDelay).toEqual(0)
})

test("cannot have both advanced and delayed habitat creation", () => {
    const result = v.safeParse(onSiteHabitatCreationSchema, fixture({
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 3
    }))
    expect(result.success).toBeFalse()
    if (!result.success) {
        expect(result.issues[0].message).toContain("Cannot have both habitat creation in advance and delay")
    }
})

test("can have advance without delay", () => {
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    })).success).toBeTrue()
})

test("can have delay without advance", () => {
    expect(v.safeParse(onSiteHabitatCreationSchema, fixture({
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 5
    })).success).toBeTrue()
})

test("final time to target condition - no advance or delay", () => {
    // Lowland calcareous grassland in Good condition has 20 years standard time
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))
    expect(result.finalTimeToTargetCondition).toEqual(20)
    expect(result.finalTimeToTargetMultiplier).toBeCloseTo(0.4903952635, 5)
})

test("final time to target condition - with advance", () => {
    // Lowland calcareous grassland in Good condition: 20 years standard - 5 years advance = 15 years
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    }))
    expect(result.finalTimeToTargetCondition).toEqual(15)
    expect(result.finalTimeToTargetMultiplier).toBeCloseTo(0.5860163055, 5)
})

test("final time to target condition - with delay", () => {
    // Lowland calcareous grassland in Good condition: 20 years standard + 5 years delay = 25 years
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 5
    }))
    expect(result.finalTimeToTargetCondition).toEqual(25)
})

test("final time to target condition - advance >= standard time returns 0", () => {
    // Lowland calcareous grassland in Good condition: 20 years standard - 20 years advance = 0
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 20,
        habitatCreationDelay: 0
    }))
    expect(result.finalTimeToTargetCondition).toEqual(0)
    expect(result.finalTimeToTargetMultiplier).toEqual(1)

    // 20 years standard - 25 years advance = 0 (capped)
    const result2 = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 25,
        habitatCreationDelay: 0
    }))
    expect(result2.finalTimeToTargetCondition).toEqual(0)
    expect(result2.finalTimeToTargetMultiplier).toEqual(1)
})

test("final time to target condition - result > 30 gets capped to 30+", () => {
    // Upland calcareous grassland in Good condition: 25 years + 10 years delay = 35, caps to "30+"
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Upland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 10
    }))
    expect(result.finalTimeToTargetCondition).toEqual("30+")
    expect(result.finalTimeToTargetMultiplier).toBeCloseTo(0.3197967361, 5)
})

test("final time to target condition - 30+ standard time stays as 30+", () => {
    // Lowland mixed deciduous woodland in Good condition: "30+" standard time
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))
    expect(result.finalTimeToTargetCondition).toEqual("30+")
    expect(result.finalTimeToTargetMultiplier).toBeCloseTo(0.3197967361, 5)
})

test("final time to target condition - advance reduces 30+ standard time", () => {
    // Lowland mixed deciduous woodland in Good condition: "30+" - 5 years advance = 25 years
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good",
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    }))
    expect(result.finalTimeToTargetCondition).toEqual(25)
})

test("difficulty - standard difficulty applied when no advance", () => {
    // Lowland calcareous grassland with no advance should use standard difficulty
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))
    expect(result.standardDifficultyOfCreation).toEqual("High")
    expect(result.appliedDifficultyMultiplier).toEqual("Standard difficulty applied")
    expect(result.finalDifficultyOfCreation).toEqual("High")
    expect(result.difficultyMultiplierApplied).toEqual(0.33)
})

test("difficulty - low difficulty when target condition reached", () => {
    // Lowland calcareous grassland in Good condition: 20 years standard - 20 years advance = 0 (target reached)
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 20,
        habitatCreationDelay: 0
    }))
    expect(result.appliedDifficultyMultiplier).toEqual("Low Difficulty - only applicable if all habitat created before losses ⚠")
    expect(result.finalDifficultyOfCreation).toEqual("Low")
    expect(result.difficultyMultiplierApplied).toEqual(1)
})

test("difficulty - enhancement difficulty when Poor threshold reached", () => {
    // Lowland calcareous grassland in Good condition: 20 years to Good, 5 years to Poor
    // With 5 years advance, Poor threshold is reached but not Good
    // Both creation and enhancement difficulty are High for this habitat
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    }))
    expect(result.standardDifficultyOfCreation).toEqual("High")
    expect(result.appliedDifficultyMultiplier).toEqual("Enhancement difficulty applied")
    expect(result.finalDifficultyOfCreation).toEqual("High")
    expect(result.difficultyMultiplierApplied).toEqual(0.33)
})

test("difficulty - enhancement difficulty not applied to excluded habitats", () => {
    // Traditional orchards should not use enhancement difficulty even when Poor threshold reached
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Traditional orchards",
        condition: "Moderate",
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    }))
    expect(result.appliedDifficultyMultiplier).toEqual("Standard difficulty applied")
    expect(result.finalDifficultyOfCreation).toEqual(result.standardDifficultyOfCreation)
})

test("habitat units delivered - basic calculation", () => {
    // Test the basic habitat units calculation with no advance or delay
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good",
        area: 1,
        strategicSignificance: "Formally identified in local strategy",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))

    // Expected: 1 (area) × 6 (distinctiveness) × 3 (condition) × 1.15 (strategic sig) × 0.3197967361 (temporal) × 0.33 (difficulty)
    const expected = 1 * 6 * 3 * 1.15 * 0.3197967361 * 0.33
    expect(result.habitatUnitsDelivered).toBeCloseTo(expected, 5)
})

test("habitat units delivered - with habitat creation in advance", () => {
    // Lowland calcareous grassland with 20 years advance reaches target condition (low difficulty)
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        area: 2.5,
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        habitatCreationInAdvance: 20,
        habitatCreationDelay: 0
    }))

    // Expected: 2.5 (area) × 6 (distinctiveness) × 3 (condition) × 1.1 (strategic sig) × 1 (temporal=0) × 1 (low difficulty)
    const expected = 2.5 * 6 * 3 * 1.1 * 1 * 1
    expect(result.habitatUnitsDelivered).toBeCloseTo(expected, 5)
})

test("habitat units delivered - with delay", () => {
    // Test with habitat creation delay
    const result = v.parse(onSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        area: 1.5,
        strategicSignificance: "Formally identified in local strategy",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 5
    }))

    // 20 years + 5 delay = 25 years
    expect(result.finalTimeToTargetCondition).toEqual(25)

    // Area × distinctiveness × condition × strategic sig × temporal multiplier for 25 × difficulty
    const expected = 1.5 * 6 * 3 * 1.15 * (result.finalTimeToTargetMultiplier ?? 0) * 0.33
    expect(result.habitatUnitsDelivered).toBeCloseTo(expected, 5)
})

describe("standardOrAdjustedTimeToTarget - column R validation messages", () => {
    test("standard time applied - no advance or delay", () => {
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: 0,
            habitatCreationDelay: 0
        }))
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Standard time to target condition applied")
    })

    test("error when both advance and delay specified", () => {
        // This should be caught by validation earlier, but testing the logic
        const result = v.safeParse(onSiteHabitatCreationSchema, fixture({
            habitatCreationInAdvance: 5,
            habitatCreationDelay: 3
        }))
        expect(result.success).toBeFalse()
    })

    test("target condition reached - advance >= standard time", () => {
        // 20 years standard - 20 years advance = 0 (target reached)
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: 20,
            habitatCreationDelay: 0
        }))
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Check details - Is there evidence that habitat has reached target condition? ⚠")
    })

    test("poor condition threshold reached", () => {
        // Lowland calcareous grassland: 20 years to Good, 5 years to Poor
        // With 5 years advance, Poor threshold is reached but not Good
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: 5,
            habitatCreationDelay: 0
        }))
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠")
    })

    test("habitat creation in advance but below Poor threshold", () => {
        // Lowland calcareous grassland: 5 years to Poor
        // With 3 years advance, Poor threshold not reached
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: 3,
            habitatCreationDelay: 0
        }))
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Check details - Is there evidence habitat creation in place? ⚠")
    })

    test("delay in starting habitat creation", () => {
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: 0,
            habitatCreationDelay: 5
        }))
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Check details- Delay in starting habitat in required condition? ⚠")
    })

    test("habitat with 30+ years advance", () => {
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: "30+",
            habitatCreationDelay: 0
        }))
        // "30+" advance >= 20 years standard time, so target reached
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Check details - Is there evidence that habitat has reached target condition? ⚠")
    })

    test("habitat with 30+ years delay", () => {
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            condition: "Good",
            habitatCreationInAdvance: 0,
            habitatCreationDelay: "30+"
        }))
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Check details- Delay in starting habitat in required condition? ⚠")
    })

    test("distinctiveness score zero uses standard time", () => {
        // Urban developed land has distinctiveness score of 0
        const result = v.parse(onSiteHabitatCreationSchema, fixture({
            broadHabitat: "Urban",
            habitatType: "Developed land; sealed surface",
            condition: "N/A - Other",
            habitatCreationInAdvance: 5,
            habitatCreationDelay: 0
        }))
        expect(result.distinctivenessScore).toEqual(0)
        expect(result.standardOrAdjustedTimeToTarget).toEqual("Standard time to target condition applied")
    })
})

describe("calculateStandardOrAdjustedTimeToTarget", () => {
    test("returns error when both advance and delay specified", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            5, // normalisedHabitatCreationInAdvance
            5, // habitatCreationInAdvance
            3, // normalisedHabitatCreationDelay
            3, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Error -both advance and delayed habitat creation ▲");
    });

    test("returns error when advance is 30+ and delay > 0", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            30, // normalisedHabitatCreationInAdvance (30+ normalised to 30)
            "30+", // habitatCreationInAdvance
            3, // normalisedHabitatCreationDelay
            3, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Error -both advance and delayed habitat creation ▲");
    });

    test("returns standard time when distinctiveness score is 0", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            5, // normalisedHabitatCreationInAdvance
            5, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            0, // distinctivenessScore - zero means use standard time
            1, // timeToTargetCondition
            1 // timeToPoorCondition
        );
        expect(result).toEqual("Standard time to target condition applied");
    });

    test("checks if target condition reached when advance >= standard time", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            20, // normalisedHabitatCreationInAdvance
            20, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition - advance equals this
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Check details - Is there evidence that habitat has reached target condition? ⚠");
    });

    test("checks if target condition reached when advance > standard time", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            25, // normalisedHabitatCreationInAdvance
            25, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition - advance exceeds this
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Check details - Is there evidence that habitat has reached target condition? ⚠");
    });

    test("returns empty string when standard time is Not Possible and advance > 0", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            5, // normalisedHabitatCreationInAdvance
            5, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            "Not Possible ▲", // timeToTargetCondition
            "Not Possible ▲" // timeToPoorCondition
        );
        expect(result).toEqual("");
    });

    test("checks if Poor condition threshold reached", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            5, // normalisedHabitatCreationInAdvance
            5, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition - advance equals this
        );
        expect(result).toEqual("Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠");
    });

    test("checks if Poor condition threshold reached when advance > Poor threshold", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            10, // normalisedHabitatCreationInAdvance
            10, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition - advance exceeds this
        );
        expect(result).toEqual("Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠");
    });

    test("checks if habitat creation in place when advance < target but > 0", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            3, // normalisedHabitatCreationInAdvance - less than Poor threshold
            3, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Check details - Is there evidence habitat creation in place? ⚠");
    });

    test("checks for delay when delay > 0", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            0, // normalisedHabitatCreationInAdvance
            0, // habitatCreationInAdvance
            5, // normalisedHabitatCreationDelay
            5, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Check details- Delay in starting habitat in required condition? ⚠");
    });

    test("checks for delay when delay is 30+", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            0, // normalisedHabitatCreationInAdvance
            0, // habitatCreationInAdvance
            30, // normalisedHabitatCreationDelay
            "30+", // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Check details- Delay in starting habitat in required condition? ⚠");
    });

    test("checks if habitat creation started when advance is 30+", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            30, // normalisedHabitatCreationInAdvance
            "30+", // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            "30+", // timeToTargetCondition - both are 30+
            5 // timeToPoorCondition
        );
        // Poor threshold (5) is checked first, and 30 >= 5, so Poor condition check applies
        expect(result).toEqual("Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠");
    });

    test("returns standard time applied as default", () => {
        const result = calculateStandardOrAdjustedTimeToTarget(
            0, // normalisedHabitatCreationInAdvance
            0, // habitatCreationInAdvance
            0, // normalisedHabitatCreationDelay
            0, // habitatCreationDelay
            6, // distinctivenessScore
            20, // timeToTargetCondition
            5 // timeToPoorCondition
        );
        expect(result).toEqual("Standard time to target condition applied");
    });
});

describe("calculateAppliedDifficultyMultiplier", () => {
    test("returns low difficulty when target condition reached", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence that habitat has reached target condition? ⚠",
            "Lowland calcareous grassland"
        );
        expect(result).toEqual("Low Difficulty - only applicable if all habitat created before losses ⚠");
    });

    test("returns enhancement difficulty when Poor threshold reached for non-excluded habitat", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Lowland calcareous grassland"
        );
        expect(result).toEqual("Enhancement difficulty applied");
    });

    test("returns standard difficulty when Poor threshold reached for Traditional orchards", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Traditional orchards"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty when Poor threshold reached for Ornamental lake or pond", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Ornamental lake or pond"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty when Poor threshold reached for Ponds (non-priority habitat)", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Ponds (non-priority habitat)"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty when Poor threshold reached for Ruderal/Ephemeral", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Ruderal/Ephemeral"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty when Poor threshold reached for Tall forbs", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Tall forbs"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty when Poor threshold reached for Developed land; sealed surface", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            "Developed land; sealed surface"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty for standard time applied message", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Standard time to target condition applied",
            "Lowland calcareous grassland"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty for habitat creation in place message", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details - Is there evidence habitat creation in place? ⚠",
            "Lowland calcareous grassland"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty for delay message", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Check details- Delay in starting habitat in required condition? ⚠",
            "Lowland calcareous grassland"
        );
        expect(result).toEqual("Standard difficulty applied");
    });

    test("returns standard difficulty for error message", () => {
        const result = calculateAppliedDifficultyMultiplier(
            "Error -both advance and delayed habitat creation ▲",
            "Lowland calcareous grassland"
        );
        expect(result).toEqual("Standard difficulty applied");
    });
});

describe("calculateFinalDifficultyOfCreation", () => {
    test("returns standard difficulty when standard applied and time > advance", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Standard difficulty applied",
            20, // timeToTargetCondition
            5, // habitatCreationInAdvance - less than time
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        expect(result).toEqual("High");
    });

    test("returns enhancement difficulty when standard applied but time <= advance", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Standard difficulty applied",
            20, // timeToTargetCondition
            20, // habitatCreationInAdvance - equals time
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        expect(result).toEqual("Medium");
    });

    test("returns Low when low difficulty applied and advance >= time", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Low Difficulty - only applicable if all habitat created before losses ⚠",
            20, // timeToTargetCondition
            20, // habitatCreationInAdvance - equals time
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        expect(result).toEqual("Low");
    });

    test("returns Low when low difficulty applied and advance > time", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Low Difficulty - only applicable if all habitat created before losses ⚠",
            20, // timeToTargetCondition
            25, // habitatCreationInAdvance - exceeds time
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        expect(result).toEqual("Low");
    });

    test("returns enhancement difficulty when low difficulty applied but advance < time", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Low Difficulty - only applicable if all habitat created before losses ⚠",
            20, // timeToTargetCondition
            15, // habitatCreationInAdvance - less than time
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        expect(result).toEqual("Medium");
    });

    test("returns enhancement difficulty when enhancement applied", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Enhancement difficulty applied",
            20, // timeToTargetCondition
            5, // habitatCreationInAdvance
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        expect(result).toEqual("Medium");
    });

    test("handles 30+ timeToTargetCondition", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Standard difficulty applied",
            "30+", // timeToTargetCondition
            5, // habitatCreationInAdvance - numeric comparison with "30+" fails
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        // "30+" > 5 comparison fails, condition is false, returns enhancement difficulty
        expect(result).toEqual("Medium");
    });

    test("handles 30+ habitatCreationInAdvance with numeric timeToTargetCondition", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Standard difficulty applied",
            20, // timeToTargetCondition
            "30+", // habitatCreationInAdvance
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        // 20 > "30+" is false, so should return enhancement difficulty
        expect(result).toEqual("Medium");
    });

    test("handles Not Possible timeToTargetCondition", () => {
        const result = calculateFinalDifficultyOfCreation(
            "Standard difficulty applied",
            "Not Possible ▲", // timeToTargetCondition
            5, // habitatCreationInAdvance
            "High", // standardDifficultyOfCreation
            "Medium" // technicalDifficultyEnhancement
        );
        // "Not Possible ▲" > 5 comparison fails, condition is false, returns enhancement difficulty
        expect(result).toEqual("Medium");
    });
});

describe("calculateDifficultyMultiplierApplied", () => {
    test("returns 1 for Low difficulty", () => {
        const result = calculateDifficultyMultiplierApplied("Low");
        expect(result).toEqual(1);
    });

    test("returns 0.67 for Medium difficulty", () => {
        const result = calculateDifficultyMultiplierApplied("Medium");
        expect(result).toEqual(0.67);
    });

    test("returns 0.33 for High difficulty", () => {
        const result = calculateDifficultyMultiplierApplied("High");
        expect(result).toEqual(0.33);
    });

    test("returns 0.1 for Very High difficulty", () => {
        const result = calculateDifficultyMultiplierApplied("Very High");
        expect(result).toEqual(0.1);
    });
});

describe("enrichWithDifficultyData", () => {
    test("enriches with all difficulty properties for standard case", () => {
        const result = enrichWithDifficultyData({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            standardOrAdjustedTimeToTarget: "Standard time to target condition applied",
            timeToTargetCondition: 20,
            habitatCreationInAdvance: 0,
            finalTimeToTargetCondition: 20
        });

        expect(result.standardDifficultyOfCreation).toEqual("High");
        expect(result.appliedDifficultyMultiplier).toEqual("Standard difficulty applied");
        expect(result.finalDifficultyOfCreation).toEqual("High");
        expect(result.difficultyMultiplierApplied).toEqual(0.33);
    });

    test("enriches with low difficulty when target reached", () => {
        const result = enrichWithDifficultyData({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            standardOrAdjustedTimeToTarget: "Check details - Is there evidence that habitat has reached target condition? ⚠",
            timeToTargetCondition: 20,
            habitatCreationInAdvance: 20,
            finalTimeToTargetCondition: 0
        });

        expect(result.standardDifficultyOfCreation).toEqual("High");
        expect(result.appliedDifficultyMultiplier).toEqual("Low Difficulty - only applicable if all habitat created before losses ⚠");
        expect(result.finalDifficultyOfCreation).toEqual("Low");
        expect(result.difficultyMultiplierApplied).toEqual(1);
    });

    test("enriches with enhancement difficulty when Poor threshold reached", () => {
        const result = enrichWithDifficultyData({
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland",
            standardOrAdjustedTimeToTarget: "Check details - Is there evidence habitat creation started and the threshold for Poor condition reached? ⚠",
            timeToTargetCondition: 20,
            habitatCreationInAdvance: 5,
            finalTimeToTargetCondition: 15
        });

        expect(result.standardDifficultyOfCreation).toEqual("High");
        expect(result.appliedDifficultyMultiplier).toEqual("Enhancement difficulty applied");
        expect(result.finalDifficultyOfCreation).toEqual("High");
        expect(result.difficultyMultiplierApplied).toEqual(0.33);
    });

    test("enriches correctly for Urban developed land", () => {
        const result = enrichWithDifficultyData({
            broadHabitat: "Urban",
            habitatType: "Developed land; sealed surface",
            standardOrAdjustedTimeToTarget: "Standard time to target condition applied",
            timeToTargetCondition: 1,
            habitatCreationInAdvance: 0,
            finalTimeToTargetCondition: 1
        });

        expect(result.standardDifficultyOfCreation).toEqual("Low");
        expect(result.appliedDifficultyMultiplier).toEqual("Standard difficulty applied");
        expect(result.finalDifficultyOfCreation).toEqual("Low");
        expect(result.difficultyMultiplierApplied).toEqual(1);
    });

    test("preserves all input properties in output", () => {
        const input = {
            broadHabitat: "Grassland",
            habitatType: "Lowland calcareous grassland" as const,
            standardOrAdjustedTimeToTarget: "Standard time to target condition applied" as const,
            timeToTargetCondition: 20 as const,
            habitatCreationInAdvance: 0 as const,
            finalTimeToTargetCondition: 20 as const
        };
        const result = enrichWithDifficultyData(input);

        expect(result.broadHabitat).toEqual(input.broadHabitat);
        expect(result.habitatType).toEqual(input.habitatType);
        expect(result.standardOrAdjustedTimeToTarget).toEqual(input.standardOrAdjustedTimeToTarget);
        expect(result.timeToTargetCondition).toEqual(input.timeToTargetCondition);
        expect(result.habitatCreationInAdvance).toEqual(input.habitatCreationInAdvance);
        expect(result.finalTimeToTargetCondition).toEqual(input.finalTimeToTargetCondition);
    });
});

describe("real bugs", () => {
    test("final time to multiplier doesn't get stuck at zero when time to condition and advance values are both zero", () => {
        const input = {
            broadHabitat: "Urban",
            habitatType: "Developed land; sealed surface",
            area: 0.006,
            condition: "N/A - Other",
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            habitatCreationInAdvance: 0,
            habitatCreationDelay: 1,
            userComments: "",
            planningAuthorityComments: "",
            habitatReferenceNumber: "1",
        }
        const parsed = v.parse(onSiteHabitatCreationSchema, input);
        expect(parsed.finalTimeToTargetCondition).toEqual(1)
    })
})
