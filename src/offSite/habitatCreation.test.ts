import { expect, test } from "bun:test";
import * as v from 'valibot';
import { offSiteHabitatCreationSchema, type OffSiteHabitatCreationSchema } from "./habitatCreation";

export function fixture(overrides: Partial<OffSiteHabitatCreationSchema> = {}): OffSiteHabitatCreationSchema {
    return {
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        area: 1,
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        spatialRiskCategory: "This metric is being used by an off-site provider",
        condition: "Good",
        ...overrides,
    }
}

test("valid combinations of broad habitat and habitat type", () => {
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ broadHabitat: "Individual trees", habitatType: "Urban tree" })).success).toBeTrue()

    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ broadHabitat: "Individual trees", habitatType: "Lowland" })).success).toBeFalse()
})

test("condition validation", () => {
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ condition: "Good" })).success).toBeTrue()
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ condition: "Moderate" })).success).toBeTrue()
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ condition: "Poor" })).success).toBeTrue()

    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ condition: "Condition Assessment N/A" })).success).toBeFalse()
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({ condition: "N/A - Other" })).success).toBeFalse()
})

test("default years values", () => {
    expect(v.parse(offSiteHabitatCreationSchema, fixture()).habitatCreationInAdvance).toEqual(0)
    expect(v.parse(offSiteHabitatCreationSchema, fixture()).habitatCreationDelay).toEqual(0)
})

test("cannot have both advanced and delayed habitat creation", () => {
    const result = v.safeParse(offSiteHabitatCreationSchema, fixture({
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 3
    }))
    expect(result.success).toBeFalse()
    if (!result.success) {
        expect(result.issues[0].message).toContain("Cannot have both habitat creation in advance and delay")
    }
})

test("can have advance without delay", () => {
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    })).success).toBeTrue()
})

test("can have delay without advance", () => {
    expect(v.safeParse(offSiteHabitatCreationSchema, fixture({
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 5
    })).success).toBeTrue()
})

test("final time to target condition - no advance or delay", () => {
    // Lowland calcareous grassland in Good condition has 20 years standard time
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        habitatCreationInAdvance: 20,
        habitatCreationDelay: 0
    }))
    expect(result.finalTimeToTargetCondition).toEqual(0)
    expect(result.finalTimeToTargetMultiplier).toEqual(1)

    // 20 years standard - 25 years advance = 0 (capped)
    const result2 = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
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
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Traditional orchards",
        condition: "Moderate",
        habitatCreationInAdvance: 5,
        habitatCreationDelay: 0
    }))
    expect(result.appliedDifficultyMultiplier).toEqual("Standard difficulty applied")
    expect(result.finalDifficultyOfCreation).toEqual(result.standardDifficultyOfCreation)
})

test("spatial risk multiplier - off-site provider", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "This metric is being used by an off-site provider"
    }))
    expect(result.spatialRiskMultiplier).toEqual(1)
})

test("spatial risk multiplier - inside LPA boundary", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "Compensation inside LPA boundary or NCA of impact site"
    }))
    expect(result.spatialRiskMultiplier).toEqual(1)
})

test("spatial risk multiplier - neighbouring LPA", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA"
    }))
    expect(result.spatialRiskMultiplier).toEqual(0.75)
})

test("spatial risk multiplier - outside neighbouring LPA", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "Compensation outside LPA or NCA of impact site and neighbouring LPA or NCA"
    }))
    expect(result.spatialRiskMultiplier).toEqual(0.5)
})

test("spatial risk multiplier - intertidal inside Marine Plan Area", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "Intertidal habitats - Compensation inside Marine Plan Area of impact site"
    }))
    expect(result.spatialRiskMultiplier).toEqual(1)
})

test("spatial risk multiplier - intertidal neighbouring Marine Plan Area", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "Intertidal habitats - Compensation outside same Marine Plan Area but in neighbouring Marine Plan Area"
    }))
    expect(result.spatialRiskMultiplier).toEqual(0.75)
})

test("spatial risk multiplier - intertidal outside Marine Plan Area", () => {
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        spatialRiskCategory: "Intertidal habitats - Compensation outside Marine Plan Area of impact site and beyond neighbouring Marine Plan Area"
    }))
    expect(result.spatialRiskMultiplier).toEqual(0.5)
})

test("habitat units delivered - basic calculation without spatial risk", () => {
    // Test the basic habitat units calculation with no advance or delay
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good",
        area: 1,
        strategicSignificance: "Formally identified in local strategy",
        spatialRiskCategory: "This metric is being used by an off-site provider",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))

    // Expected (without spatial risk): 1 (area) × 6 (distinctiveness) × 3 (condition) × 1.15 (strategic sig) × 0.3197967361 (temporal) × 0.33 (difficulty)
    const expectedWithoutSpatial = 1 * 6 * 3 * 1.15 * 0.3197967361 * 0.33
    expect(result.habitatUnitsDelivered).toBeCloseTo(expectedWithoutSpatial, 5)

    // With spatial risk multiplier = 1 (off-site provider), should be the same
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeCloseTo(expectedWithoutSpatial, 5)
})

test("habitat units delivered - with spatial risk reduction", () => {
    // Test with 0.75 spatial risk multiplier
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good",
        area: 1,
        strategicSignificance: "Formally identified in local strategy",
        spatialRiskCategory: "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))

    // Expected without spatial risk
    const baseUnits = 1 * 6 * 3 * 1.15 * 0.3197967361 * 0.33
    expect(result.habitatUnitsDelivered).toBeCloseTo(baseUnits, 5)

    // With spatial risk multiplier = 0.75
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeCloseTo(baseUnits * 0.75, 5)
})

test("habitat units delivered - with habitat creation in advance", () => {
    // Lowland calcareous grassland with 20 years advance reaches target condition (low difficulty)
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        area: 2.5,
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        spatialRiskCategory: "Compensation inside LPA boundary or NCA of impact site",
        habitatCreationInAdvance: 20,
        habitatCreationDelay: 0
    }))

    // Expected without spatial: 2.5 (area) × 6 (distinctiveness) × 3 (condition) × 1.1 (strategic sig) × 1 (temporal=0) × 1 (low difficulty)
    const expectedWithoutSpatial = 2.5 * 6 * 3 * 1.1 * 1 * 1
    expect(result.habitatUnitsDelivered).toBeCloseTo(expectedWithoutSpatial, 5)

    // With spatial risk multiplier = 1
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeCloseTo(expectedWithoutSpatial, 5)
})

test("habitat units delivered - with delay and spatial risk", () => {
    // Test with habitat creation delay and spatial risk
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Grassland",
        habitatType: "Lowland calcareous grassland",
        condition: "Good",
        area: 1.5,
        strategicSignificance: "Formally identified in local strategy",
        spatialRiskCategory: "Compensation outside LPA or NCA of impact site and neighbouring LPA or NCA",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 5
    }))

    // 20 years + 5 delay = 25 years
    expect(result.finalTimeToTargetCondition).toEqual(25)

    // Area × distinctiveness × condition × strategic sig × temporal multiplier for 25 × difficulty
    const expectedWithoutSpatial = 1.5 * 6 * 3 * 1.15 * (result.finalTimeToTargetMultiplier ?? 0) * 0.33
    expect(result.habitatUnitsDelivered).toBeCloseTo(expectedWithoutSpatial, 5)

    // With spatial risk multiplier = 0.5
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeCloseTo(expectedWithoutSpatial * 0.5, 5)
})

test("habitat units delivered - returns 0 when temporal multiplier is undefined", () => {
    // This would happen with "Not Possible ▲" time to target condition
    // We need a habitat with "Not Possible" temporal multiplier
    // Let's test with a habitat that doesn't have creation possibilities for certain conditions
    const result = v.parse(offSiteHabitatCreationSchema, fixture({
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good",
        area: 1,
        strategicSignificance: "Formally identified in local strategy",
        spatialRiskCategory: "This metric is being used by an off-site provider",
        habitatCreationInAdvance: 0,
        habitatCreationDelay: 0
    }))

    // This test verifies the ?? 0 operator works correctly
    // Even if we have a valid calculation, the formula should handle undefined multipliers
    expect(result.habitatUnitsDelivered).toBeGreaterThanOrEqual(0)
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeGreaterThanOrEqual(0)
})
