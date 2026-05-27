import { expect, test } from "bun:test";
import { offSiteHabitatEnhancementSchema, type OffSiteHabitatEnhancementSchema } from "./habitatEnhancement";
import * as v from 'valibot';
import { describe } from "bun:test";

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
                message: () => `Parsing error.\nExpected ${this.utils.printReceived(input)} \nResult: ${this.utils.printReceived(result)}`,
            }
        },
})

export function fixture(overrides: Partial<OffSiteHabitatEnhancementSchema> = {}): OffSiteHabitatEnhancementSchema {
    return {
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",  // Changed from "Good" to "Poor" for valid enhancement
            irreplaceableHabitat: false,
            areaEnhanced: 1,  // Changed from 0 to 1 - area being enhanced
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        condition: "Good",  // Enhancing from Poor to Good
        ...overrides,
    }
}

test("valid combinations of broad habitat and habitat type", () => {
    expect(fixture({
        baseline: {
            broadHabitat: "Individual trees",
            habitatType: "Urban tree",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Individual trees",
        habitatType: "Urban tree"
    })).toBeParseableBy(offSiteHabitatEnhancementSchema)

    expect(fixture({ broadHabitat: "Individual trees", habitatType: "Lowland" })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("condition validation", () => {
    // Valid enhancements: Poor (baseline) → better condition
    expect(fixture({ condition: "Good" })).toBeParseableBy(offSiteHabitatEnhancementSchema)
    expect(fixture({ condition: "Moderate" })).toBeParseableBy(offSiteHabitatEnhancementSchema)
    expect(fixture({ condition: "Fairly Poor" })).toBeParseableBy(offSiteHabitatEnhancementSchema)

    // Invalid: Same condition without distinctiveness upgrade
    expect(fixture({ condition: "Poor" })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)

    // Invalid condition types for enhancement
    expect(fixture({ condition: "Condition Assessment N/A" })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
    expect(fixture({ condition: "N/A - Other" })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("validates baseline schema as well", () => {
    const fix = fixture()
    fix.baseline.broadHabitat = "Urban"
    expect(fix).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("calculates enhancement pathway correctly", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture())
    expect(result.enhancementPathway).toBe("Poor - Good")
})

test("calculates time to target condition", () => {
    // Lowland mixed deciduous woodland: Poor → Good is "30+"
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture())
    expect(result.timeToTargetCondition).toBe("30+")
})

test("calculates final time to target with advance", () => {
    // With 30+ standard time and 3 years advance: 30 - 3 = 27
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        habitatEnhancedInAdvance: 3
    }))
    expect(result.finalTimeToTargetCondition).toBe(27)
})

test("calculates final time to target with delay", () => {
    // With 30+ standard time and delay, stays at "30+"
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        habitatEnhancedDelay: 5
    }))
    expect(result.finalTimeToTargetCondition).toBe("30+")
})

test("prevents both advance and delay", () => {
    expect(fixture({
        habitatEnhancedInAdvance: 2,
        habitatEnhancedDelay: 3
    })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("calculates difficulty correctly - standard", () => {
    // Lowland mixed deciduous woodland has "High" enhancement difficulty
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture())
    expect(result.standardDifficultyOfEnhancement).toBe("High")
    expect(result.finalDifficultyOfEnhancement).toBe("High")
    expect(result.appliedDifficultyMultiplier).toBe("Standard difficulty applied")
})

test("calculates difficulty correctly - low when habitat already at target", () => {
    // With 30+ years advance, final time becomes 0
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        habitatEnhancedInAdvance: "30+"
    }))
    expect(result.finalTimeToTargetCondition).toBe(0)
    expect(result.finalDifficultyOfEnhancement).toBe("Low")
    expect(result.appliedDifficultyMultiplier).toBe("Low Difficulty - only applicable if all habitat created before losses ⚠")
})

test("includes spatial risk multiplier from baseline", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture())
    expect(result.spatialRiskMultiplier).toBe(1)  // "This metric is being used by an off-site provider" = 1
})

test("calculates habitat units delivered - with and without spatial risk", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture())

    // Should have both calculations
    expect(result.habitatUnitsDelivered).toBeNumber()
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeNumber()

    // With spatial risk multiplier of 1, they should be equal
    expect(result.habitatUnitsDelivered).toBe(result.habitatUnitsDeliveredWithSpatialRisk)
})

test("calculates different units when spatial risk multiplier is not 1", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA",  // 0.75
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        }
    }))

    expect(result.spatialRiskMultiplier).toBe(0.75)
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBe(result.habitatUnitsDelivered * 0.75)
})

test("validates trading rules - High distinctiveness", () => {
    // Lowland mixed deciduous woodland (High) - must stay same habitat
    const validEnhancement = fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Moderate"
    })

    expect(validEnhancement).toBeParseableBy(offSiteHabitatEnhancementSchema)

    // Cannot change habitat type for High distinctiveness
    const invalidEnhancement = fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Modified grassland",
        condition: "Good"
    })

    expect(invalidEnhancement).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("validates trading rules - cannot reduce condition", () => {
    expect(fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Good",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        condition: "Moderate"  // Reducing from Good to Moderate
    })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("validates irreplaceable habitat cannot be replaced", () => {
    expect(fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: true,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Modified grassland",  // Different habitat
        condition: "Good"
    })).not.toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("validates special habitat - Littoral seagrass", () => {
    // Valid: Littoral seagrass from allowed baselines
    expect(fixture({
        baseline: {
            broadHabitat: "Intertidal sediment",
            habitatType: "Littoral seagrass",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Intertidal sediment",
        habitatType: "Littoral seagrass",
        condition: "Moderate"
    })).toBeParseableBy(offSiteHabitatEnhancementSchema)
})

test("calculates units correctly - basic enhancement", () => {
    // Lowland mixed deciduous woodland from Poor (1) to Good (3)
    // Distinctiveness: 6 (High)
    // Strategic: 1.10
    // Time to target: "30+" → multiplier 0.3197967361
    // Difficulty: High → 0.33
    // Spatial risk: 1

    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        condition: "Good"
    }))

    // Baseline: 1 × 6 × 1 = 6
    // Proposed: 1 × 6 × 3 = 18
    // Delta: (18 - 6) × 0.33 (difficulty) × 0.3197967361 (temporal) = 1.266264
    // Result: (1.266264 + 6) × 1.10 (strategic) = 7.9930345824516005
    const expectedUnits = 7.9930345824516005;

    expect(result.habitatUnitsDelivered).toBeCloseTo(expectedUnits, 2)
    expect(result.habitatUnitsDeliveredWithSpatialRisk).toBeCloseTo(expectedUnits, 2)
})

// ============================================================================
// DISTINCTIVENESS CHANGE TESTS (Column T)
// ============================================================================

test("distinctiveness change - same distinctiveness Low - Low", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Modified grassland",  // Low distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Modified grassland",  // Low distinctiveness
        condition: "Moderate"
    }))

    expect(result.distinctivenessChange).toBe("Low - Low")
})

test("distinctiveness change - upgrade Low - Medium", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Modified grassland",  // Low distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Moderate",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Other neutral grassland",  // Medium distinctiveness
        condition: "Good"
    }))

    expect(result.distinctivenessChange).toBe("Low - Medium")
})

test("distinctiveness change - same distinctiveness Medium - Medium", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Other neutral grassland",  // Medium distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Other neutral grassland",  // Medium distinctiveness
        condition: "Good"
    }))

    expect(result.distinctivenessChange).toBe("Medium - Medium")
})

test("distinctiveness change - upgrade Medium - High", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Other neutral grassland",  // Medium distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Moderate",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Upland calcareous grassland",  // High distinctiveness
        condition: "Good"
    }))

    expect(result.distinctivenessChange).toBe("Medium - High")
})

test("distinctiveness change - same distinctiveness High - High", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",  // High distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",  // High distinctiveness
        condition: "Good"
    }))

    expect(result.distinctivenessChange).toBe("High - High")
})

// ============================================================================
// CONDITION CHANGE TESTS (Column U)
// ============================================================================

test("condition change - same habitat, condition upgrade", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Woodland and forest",
            habitatType: "Lowland mixed deciduous woodland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Woodland and forest",
        habitatType: "Lowland mixed deciduous woodland",
        condition: "Good"
    }))

    expect(result.conditionChange).toBe("Poor - Good")
    expect(result.enhancementPathway).toBe("Poor - Good")
})

test("condition change - same habitat, multiple condition steps", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Other neutral grassland",
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Fairly Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Other neutral grassland",
        condition: "Fairly Good"
    }))

    expect(result.conditionChange).toBe("Fairly Poor - Fairly Good")
    expect(result.enhancementPathway).toBe("Fairly Poor - Fairly Good")
})

test("condition change - lower distinctiveness habitat upgrade", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Modified grassland",  // Low distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Moderate",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Other neutral grassland",  // Medium distinctiveness
        condition: "Good"
    }))

    expect(result.conditionChange).toBe("Lower Distinctiveness Habitat - Good")
    expect(result.enhancementPathway).toBe("Lower Distinctiveness Habitat - Good")
    expect(result.distinctivenessChange).toBe("Low - Medium")
})

test("condition change - lower distinctiveness habitat upgrade from Poor", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Modified grassland",  // Low distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Other neutral grassland",  // Medium distinctiveness
        condition: "Moderate"
    }))

    expect(result.conditionChange).toBe("Lower Distinctiveness Habitat - Moderate")
    expect(result.enhancementPathway).toBe("Lower Distinctiveness Habitat - Moderate")
    expect(result.distinctivenessChange).toBe("Low - Medium")
})

test("condition change - same distinctiveness, different habitat within broad habitat", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Other neutral grassland",  // Medium distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Poor",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Other lowland acid grassland",  // Medium distinctiveness (same as baseline)
        condition: "Good"
    }))

    // Different habitat but same distinctiveness -> standard pathway
    expect(result.conditionChange).toBe("Poor - Good")
    expect(result.enhancementPathway).toBe("Poor - Good")
    expect(result.distinctivenessChange).toBe("Medium - Medium")
})

test("condition change - Medium to High distinctiveness upgrade", () => {
    const result = v.parse(offSiteHabitatEnhancementSchema, fixture({
        baseline: {
            broadHabitat: "Grassland",
            habitatType: "Other neutral grassland",  // Medium distinctiveness
            area: 1,
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            spatialRiskCategory: "This metric is being used by an off-site provider",
            condition: "Moderate",
            irreplaceableHabitat: false,
            areaEnhanced: 1,
            areaRetained: 0,
            offSiteReferenceNumber: "OFF-001",
        },
        broadHabitat: "Grassland",
        habitatType: "Upland calcareous grassland",  // High distinctiveness
        condition: "Good"
    }))

    expect(result.conditionChange).toBe("Lower Distinctiveness Habitat - Good")
    expect(result.enhancementPathway).toBe("Lower Distinctiveness Habitat - Good")
    expect(result.distinctivenessChange).toBe("Medium - High")
})


describe("fixed bugs", () => {
    test("time to target condition is calculated correctly", () => {
        const input = {
            baseline: {
                broadHabitat: "Grassland",
                habitatType: "Modified grassland",
                irreplaceableHabitat: false,
                area: 0.1907,
                condition: "Moderate",
                strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
                spatialRiskCategory: "Compensation inside LPA boundary or NCA of impact site ",
                areaRetained: 0.1244,
                areaEnhanced: 0.0662,
                bespokeCompensationAgreed: "No",
                userComments: undefined,
                planningAuthorityComments: undefined,
                habitatReferenceNumber: "",
                offSiteReferenceNumber: "2",
            },
            broadHabitat: "Grassland",
            habitatType: "Other neutral grassland",
            condition: "Good",
            strategicSignificance: "Location ecologically desirable but not in local strategy",
            hedgerowEnhancedInAdvance: 0,
            hedgerowEnhancedDelay: 0,
            userComments: "",
            planningAuthorityComments: "",
            habitatReferenceNumber: "",
            offSiteReferenceNumber: "2",
        }

        const parsed = v.parse(offSiteHabitatEnhancementSchema, input);
        expect(parsed.conditionChange).toEqual("Lower Distinctiveness Habitat - Good")
        expect(parsed.timeToTargetCondition).toEqual(15)
        expect(parsed.finalTimeToTargetMultiplier).toBeCloseTo(0.586)
        expect(parsed.habitatUnitsDelivered).toBeCloseTo(0.63)
    });
})

