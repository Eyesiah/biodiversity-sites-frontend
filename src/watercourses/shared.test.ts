import { expect, test, describe } from "bun:test";
import {
    // Baseline functions
    enrichWithBaselineWatercourseData,
    enrichWithBaselineUnitsData,
    enrichWithTotalWatercourseUnits,
    enrichWithUnitsLost,
    // Creation functions
    enrichWithCreationWatercourseData,
    enrichWithTemporalData,
    enrichWithDifficultyData,
    enrichCreationWithEncroachmentData,
    enrichWithUnitsDelivered,
    // Enhancement functions
    DISTINCTIVENESS_UPGRADE_YEARS,
    yearsToNumber,
    enrichBaselineWatercourseData,
    enrichProposedWatercourseData,
    addEnhancementPathway,
    lookupEnhancementTimeToTarget,
    calculateFinalTimeToTargetValues,
    determineEnhancementDifficulty,
    enrichEnhancementWithEncroachmentData,
    calculateEnhancementUnitsDelivered,
} from "./shared";

// ============================================================================
// BASELINE FUNCTION TESTS
// ============================================================================

describe("Baseline Functions", () => {
    describe("enrichWithBaselineWatercourseData", () => {
        test("Priority habitat", () => {
            const result = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 0.7,
                lengthEnhanced: 0.3,
                watercourseType: "Priority habitat",
                condition: "Good",
                strategicSignificance: "Formally identified in local strategy",
                watercourseEncroachment: "No Encroachment",
                riparianEncroachment: "No Encroachment/ No Encroachment",
            });

            expect(result.distinctiveness).toEqual("V.High");
            expect(result.distinctivenessScore).toEqual(8);
            expect(result.conditionScore).toEqual(3);
            expect(result.strategicSignificanceMultiplier).toEqual(1.15);
            expect(result.watercourseEncroachmentMultiplier).toEqual(1);
            expect(result.riparianEncroachmentMultiplier).toEqual(1);
            expect(result.tradingRules).toContain("Same habitat required");
        });

        test("Other rivers and streams with encroachment", () => {
            const result = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 0.8,
                lengthEnhanced: 0.2,
                watercourseType: "Other rivers and streams",
                condition: "Moderate",
                strategicSignificance: "Location ecologically desirable but not in local strategy",
                watercourseEncroachment: "Minor",
                riparianEncroachment: "Moderate/ Minor",
            });

            expect(result.distinctiveness).toEqual("High");
            expect(result.distinctivenessScore).toEqual(6);
            expect(result.conditionScore).toEqual(2);
            expect(result.strategicSignificanceMultiplier).toEqual(1.1);
            expect(result.watercourseEncroachmentMultiplier).toEqual(0.8);
            expect(result.riparianEncroachmentMultiplier).toEqual(0.9);
        });

        test("Ditches with minimal encroachment", () => {
            const result = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 1,
                lengthEnhanced: 0,
                watercourseType: "Ditches",
                condition: "Poor",
                strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
                watercourseEncroachment: "Major",
                riparianEncroachment: "Major/Major",
            });

            expect(result.distinctiveness).toEqual("Medium");
            expect(result.distinctivenessScore).toEqual(4);
            expect(result.conditionScore).toEqual(1);
            expect(result.strategicSignificanceMultiplier).toEqual(1);
            expect(result.watercourseEncroachmentMultiplier).toEqual(0.5);
            expect(result.riparianEncroachmentMultiplier).toEqual(0.75);
        });

        test("various encroachment multipliers", () => {
            const base = {
                length: 1,
                lengthRetained: 0.5,
                lengthEnhanced: 0.5,
                watercourseType: "Canals" as const,
                condition: "Fairly Good" as const,
                strategicSignificance: "Location ecologically desirable but not in local strategy" as const,
                riparianEncroachment: "No Encroachment/ No Encroachment" as const,
            };

            expect(enrichWithBaselineWatercourseData({ ...base, watercourseEncroachment: "No Encroachment" }).watercourseEncroachmentMultiplier).toEqual(1);
            expect(enrichWithBaselineWatercourseData({ ...base, watercourseEncroachment: "Minor" }).watercourseEncroachmentMultiplier).toEqual(0.8);
            expect(enrichWithBaselineWatercourseData({ ...base, watercourseEncroachment: "Major" }).watercourseEncroachmentMultiplier).toEqual(0.5);
        });
    });

    describe("enrichWithBaselineUnitsData", () => {
        test("calculates units correctly", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 0.5,
                lengthEnhanced: 0.3,
                watercourseType: "Priority habitat",
                condition: "Good",
                strategicSignificance: "Formally identified in local strategy",
                watercourseEncroachment: "Minor",
                riparianEncroachment: "Moderate/ Minor",
            });

            const result = enrichWithBaselineUnitsData(enriched);

            // Expected: 0.5 * 8 * 3 * 1.15 * 0.8 * 0.9
            expect(result.unitsRetained).toBeCloseTo(0.5 * 8 * 3 * 1.15 * 0.8 * 0.9, 5);
            // Expected: 0.3 * 8 * 3 * 1.15 * 0.8 * 0.9
            expect(result.unitsEnhanced).toBeCloseTo(0.3 * 8 * 3 * 1.15 * 0.8 * 0.9, 5);
        });

        test("handles zero lengths", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 0,
                lengthEnhanced: 0,
                watercourseType: "Other rivers and streams",
                condition: "Moderate",
                strategicSignificance: "Location ecologically desirable but not in local strategy",
                watercourseEncroachment: "No Encroachment",
                riparianEncroachment: "No Encroachment/ No Encroachment",
            });

            const result = enrichWithBaselineUnitsData(enriched);

            expect(result.unitsRetained).toEqual(0);
            expect(result.unitsEnhanced).toEqual(0);
        });
    });

    describe("enrichWithTotalWatercourseUnits", () => {
        test("calculates total units correctly", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 1.2,
                lengthRetained: 0.8,
                lengthEnhanced: 0.2,
                watercourseType: "Other rivers and streams",
                condition: "Moderate",
                strategicSignificance: "Location ecologically desirable but not in local strategy",
                watercourseEncroachment: "Minor",
                riparianEncroachment: "Major/Major",
            });

            const withUnits = enrichWithBaselineUnitsData(enriched);
            const result = enrichWithTotalWatercourseUnits(withUnits);

            // Expected: 1.2 * 6 * 2 * 1.1 * 0.8 * 0.75
            expect(result.totalWatercourseUnits).toBeCloseTo(1.2 * 6 * 2 * 1.1 * 0.8 * 0.75, 5);
        });

        test("Priority habitat calculation", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 2,
                lengthRetained: 1.5,
                lengthEnhanced: 0.5,
                watercourseType: "Priority habitat",
                condition: "Good",
                strategicSignificance: "Formally identified in local strategy",
                watercourseEncroachment: "No Encroachment",
                riparianEncroachment: "No Encroachment/ No Encroachment",
            });

            const withUnits = enrichWithBaselineUnitsData(enriched);
            const result = enrichWithTotalWatercourseUnits(withUnits);

            // Expected: 2 * 8 * 3 * 1.15 * 1 * 1 = 55.2
            expect(result.totalWatercourseUnits).toBeCloseTo(55.2, 5);
        });
    });

    describe("enrichWithUnitsLost", () => {
        test("full retention - no loss", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 1,
                lengthEnhanced: 0,
                watercourseType: "Ditches",
                condition: "Moderate",
                strategicSignificance: "Location ecologically desirable but not in local strategy",
                watercourseEncroachment: "No Encroachment",
                riparianEncroachment: "No Encroachment/ No Encroachment",
            });

            const withUnits = enrichWithBaselineUnitsData(enriched);
            const withTotal = enrichWithTotalWatercourseUnits(withUnits);
            const result = enrichWithUnitsLost(withTotal);

            expect(result.lengthLost).toEqual(0);
            expect(result.unitsLost).toEqual(0);
        });

        test("partial retention", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 0.5,
                lengthEnhanced: 0.3,
                watercourseType: "Canals",
                condition: "Fairly Good",
                strategicSignificance: "Location ecologically desirable but not in local strategy",
                watercourseEncroachment: "No Encroachment",
                riparianEncroachment: "No Encroachment/ No Encroachment",
            });

            const withUnits = enrichWithBaselineUnitsData(enriched);
            const withTotal = enrichWithTotalWatercourseUnits(withUnits);
            const result = enrichWithUnitsLost(withTotal);

            expect(result.lengthLost).toBeCloseTo(0.2, 5);
            expect(result.unitsLost).toBeGreaterThan(0);
        });

        test("total loss", () => {
            const enriched = enrichWithBaselineWatercourseData({
                length: 1,
                lengthRetained: 0,
                lengthEnhanced: 0,
                watercourseType: "Culvert",
                condition: "Poor",
                strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
                watercourseEncroachment: "N/A - Culvert",
                riparianEncroachment: "N/A - Culvert",
            });

            const withUnits = enrichWithBaselineUnitsData(enriched);
            const withTotal = enrichWithTotalWatercourseUnits(withUnits);
            const result = enrichWithUnitsLost(withTotal);

            expect(result.lengthLost).toEqual(1);
            expect(result.unitsLost).toEqual(result.totalWatercourseUnits);
        });
    });
});

// ============================================================================
// CREATION FUNCTION TESTS
// ============================================================================

describe("Creation Functions", () => {
    describe('enrichWithCreationWatercourseData', () => {
        test('enriches with watercourse properties', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Moderate' as const,
                strategicSignificance: 'Location ecologically desirable but not in local strategy' as const,
            };

            const result = enrichWithCreationWatercourseData(input);

            expect(result.distinctiveness).toBe('Medium');
            expect(result.distinctivenessScore).toBe(4);
            expect(result.conditionScore).toBe(2);
            expect(result.standardTimeToTarget).toBe(5);
            expect(result.standardDifficulty).toBe('Medium');

            const result2 = enrichWithCreationWatercourseData({
                watercourseType: "Priority habitat",
                condition: "Good",
                strategicSignificance: "Formally identified in local strategy",
            });

            expect(result2.distinctiveness).toEqual("V.High");
            expect(result2.distinctivenessScore).toEqual(8);
            expect(result2.conditionScore).toEqual(3);
            expect(result2.strategicSignificanceMultiplier).toEqual(1.15);
            expect(result2.standardTimeToTarget).toBeDefined();
            expect(result2.standardDifficulty).toBeDefined();
        });

        test("handles Ditches with time to target", () => {
            const result = enrichWithCreationWatercourseData({
                watercourseType: "Ditches",
                condition: "Moderate",
                strategicSignificance: "Location ecologically desirable but not in local strategy",
            });

            expect(result.distinctivenessScore).toEqual(4);
            expect(result.conditionScore).toEqual(2);
            expect(result.standardTimeToTarget).toBeGreaterThan(0);
        });

        test('should handle priority habitat', () => {
            const input = {
                watercourseType: 'Priority habitat' as const,
                condition: 'Moderate' as const,
                strategicSignificance: 'Formally identified in local strategy' as const,
            };

            const result = enrichWithCreationWatercourseData(input);

            expect(result.distinctiveness).toBe('V.High');
            expect(result.distinctivenessScore).toBe(8);
            expect(result.conditionScore).toBe(2);
            expect(result.standardTimeToTarget).toBe(5);
            expect(result.standardDifficulty).toBe('High');
        });
    });

    describe('enrichWithTemporalData', () => {
        test("calculates final time to target with advance", () => {
            const data = {
                watercourseType: "Ditches" as const,
                condition: "Moderate" as const,
                habitatCreatedInAdvance: 2,
                delayInStarting: 0,
                standardTimeToTarget: 5,
            };

            const result = enrichWithTemporalData(data);

            expect(result.finalTimeToTarget).toEqual(3); // 5 - 2 + 0
            expect(result.temporalMultiplier).toBeDefined();
        });

        test("calculates final time to target with delay", () => {
            const data = {
                watercourseType: "Ditches" as const,
                condition: "Moderate" as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 3,
                standardTimeToTarget: 5,
            };

            const result = enrichWithTemporalData(data);

            expect(result.finalTimeToTarget).toEqual(8); // 5 - 0 + 3
        });

        test("caps at 30 years", () => {
            const data = {
                watercourseType: "Ditches" as const,
                condition: "Moderate" as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 35,
                standardTimeToTarget: 5,
            };

            const result = enrichWithTemporalData(data);

            expect(result.finalTimeToTarget).toEqual(30);
        });

        test("minimum of 0 years", () => {
            const data = {
                watercourseType: "Ditches" as const,
                condition: "Moderate" as const,
                habitatCreatedInAdvance: 10,
                delayInStarting: 0,
                standardTimeToTarget: 5,
            };

            const result = enrichWithTemporalData(data);

            expect(result.finalTimeToTarget).toEqual(0);
        });

        test("identifies ditch fairly category", () => {
            const data1 = {
                watercourseType: "Ditches" as const,
                condition: "Fairly Poor" as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 0,
                standardTimeToTarget: 5,
            };

            const result1 = enrichWithTemporalData(data1);
            expect(result1.isDitchFairlyCategory).toBeTrue();

            const data2 = {
                watercourseType: "Ditches" as const,
                condition: "Fairly Good" as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 0,
                standardTimeToTarget: 5,
            };

            const result2 = enrichWithTemporalData(data2);
            expect(result2.isDitchFairlyCategory).toBeTrue();

            const data3 = {
                watercourseType: "Ditches" as const,
                condition: "Moderate" as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 0,
                standardTimeToTarget: 5,
            };

            const result3 = enrichWithTemporalData(data3);
            expect(result3.isDitchFairlyCategory).toBeFalse();
        });
        test('should calculate temporal multiplier with no advance or delay', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Moderate' as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 0,
                standardTimeToTarget: 2,
            };

            const result = enrichWithTemporalData(input);

            expect(result.finalTimeToTarget).toBe(2);
            expect(result.temporalMultiplier).toBe(0.931225);
            expect(result.isDitchFairlyCategory).toBe(false);
        });

        test('should reduce time with advance creation', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Moderate' as const,
                habitatCreatedInAdvance: 1,
                delayInStarting: 0,
                standardTimeToTarget: 2,
            };

            const result = enrichWithTemporalData(input);

            expect(result.finalTimeToTarget).toBe(1);
            expect(result.temporalMultiplier).toBe(0.965);
        });

        test('should increase time with delay', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Moderate' as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 3,
                standardTimeToTarget: 2,
            };

            const result = enrichWithTemporalData(input);

            expect(result.finalTimeToTarget).toBe(5);
            expect(result.temporalMultiplier).toBe(0.8368287006);
        });

        test('should cap time at 30 years', () => {
            const input = {
                watercourseType: 'Priority habitat' as const,
                condition: 'Moderate' as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 25,
                standardTimeToTarget: 8,
            };

            const result = enrichWithTemporalData(input);

            expect(result.finalTimeToTarget).toBe(30);
            expect(result.temporalMultiplier).toBe(0.3434151104);
        });

        test('should not go below 0 years', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Moderate' as const,
                habitatCreatedInAdvance: 5,
                delayInStarting: 0,
                standardTimeToTarget: 2,
            };

            const result = enrichWithTemporalData(input);

            expect(result.finalTimeToTarget).toBe(0);
            expect(result.temporalMultiplier).toBe(1);
        });

        test('should detect ditch fairly category', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Fairly Poor' as const,
                habitatCreatedInAdvance: 0,
                delayInStarting: 0,
                standardTimeToTarget: 0,
            };

            const result = enrichWithTemporalData(input);

            expect(result.isDitchFairlyCategory).toBe(true);
        });
    });

    describe('enrichWithDifficultyData', () => {
        test('should use standard difficulty for non-ditch', () => {
            const input = {
                watercourseType: 'Priority habitat' as const,
                condition: 'Moderate' as const,
                standardOrAdjustedTimeToTargetCondition: 'Standard time to target condition applied' as const,
                standardTimeToTarget: 5 as const,
                standardDifficulty: 'Medium' as const,
                isDitchFairlyCategory: false,
                habitatCreatedInAdvance: 0,
            };

            const result = enrichWithDifficultyData(input);

            expect(result.appliedDifficulty).toBe('Standard difficulty applied');
            expect(result.finalDifficultyOfCreation).toBe('Medium');
            expect(result.difficultyMultiplier).toBe(0.67);
        });

        test('should use low difficulty for ditch fairly category with advance creation', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Fairly Poor' as const,
                standardOrAdjustedTimeToTargetCondition: 'Check details - Is there evidence that habitat has reached target condition? ⚠' as const,
                standardTimeToTarget: 2 as const,
                standardDifficulty: 'Medium' as const,
                isDitchFairlyCategory: true,
                habitatCreatedInAdvance: 2,
            };

            const result = enrichWithDifficultyData(input);

            expect(result.appliedDifficulty).toBe('Low Difficulty - only applicable if all habitat created before losses ⚠');
            expect(result.finalDifficultyOfCreation).toBe('Low');
            expect(result.difficultyMultiplier).toBe(1);
        });

        test('should use standard difficulty for ditch fairly category without advance creation', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                condition: 'Fairly Poor' as const,
                standardOrAdjustedTimeToTargetCondition: 'Standard time to target condition applied' as const,
                standardTimeToTarget: 2 as const,
                standardDifficulty: 'Medium' as const,
                isDitchFairlyCategory: true,
                habitatCreatedInAdvance: 0,
            };

            const result = enrichWithDifficultyData(input);

            expect(result.appliedDifficulty).toBe('Standard difficulty applied');
            expect(result.finalDifficultyOfCreation).toBe('Medium');
            expect(result.difficultyMultiplier).toBe(0.67);
        });

        test('should handle high difficulty', () => {
            const input = {
                watercourseType: 'Other rivers and streams' as const,
                condition: 'Good' as const,
                standardOrAdjustedTimeToTargetCondition: 'Standard time to target condition applied' as const,
                standardTimeToTarget: 10 as const,
                standardDifficulty: 'High' as const,
                isDitchFairlyCategory: false,
                habitatCreatedInAdvance: 0,
            };

            const result = enrichWithDifficultyData(input);

            expect(result.appliedDifficulty).toBe('Standard difficulty applied');
            expect(result.finalDifficultyOfCreation).toBe('High');
            expect(result.difficultyMultiplier).toBe(0.33);
        });

        test("does not apply low difficulty without advance", () => {
            const data = {
                watercourseType: "Ditches" as const,
                condition: "Fairly Poor" as const,
                standardOrAdjustedTimeToTargetCondition: 'Standard time to target condition applied' as const,
                standardTimeToTarget: 2 as const,
                standardDifficulty: "Medium" as const,
                isDitchFairlyCategory: true,
                habitatCreatedInAdvance: 0,
            };

            const result = enrichWithDifficultyData(data);

            expect(result.appliedDifficulty).toEqual("Standard difficulty applied");
            expect(result.finalDifficultyOfCreation).toEqual("Medium");
            expect(result.difficultyMultiplier).toEqual(0.67);
        });
    });

    describe('enrichCreationWithEncroachmentData', () => {
        test('should calculate encroachment multipliers', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                watercourseEncroachment: 'No Encroachment' as const,
                riparianEncroachment: 'No Encroachment/ No Encroachment' as const,
            };

            const result = enrichCreationWithEncroachmentData(input);

            expect(result.watercourseEncroachmentMultiplier).toBe(1);
            expect(result.riparianEncroachmentMultiplier).toBe(1);
        });

        test('should handle partial encroachment', () => {
            const input = {
                watercourseType: 'Other rivers and streams' as const,
                watercourseEncroachment: 'Minor' as const,
                riparianEncroachment: 'Moderate/ Minor' as const,
            };

            const result = enrichCreationWithEncroachmentData(input);

            expect(result.watercourseEncroachmentMultiplier).toBe(0.8);
            expect(result.riparianEncroachmentMultiplier).toBe(0.9);
        });

        test('should handle N/A - Culvert encroachment', () => {
            const input = {
                watercourseType: 'Culvert' as const,
                watercourseEncroachment: 'N/A - Culvert' as const,
                riparianEncroachment: 'N/A - Culvert' as const,
            };

            const result = enrichCreationWithEncroachmentData(input);

            expect(result.watercourseEncroachmentMultiplier).toBe(0.68);
            expect(result.riparianEncroachmentMultiplier).toBe(1);
        });

        test('should handle major encroachment', () => {
            const input = {
                watercourseType: 'Ditches' as const,
                watercourseEncroachment: 'Major' as const,
                riparianEncroachment: 'Major/Major' as const,
            };

            const result = enrichCreationWithEncroachmentData(input);

            expect(result.watercourseEncroachmentMultiplier).toBe(0.5);
            expect(result.riparianEncroachmentMultiplier).toBe(0.75);
        });
    });

    describe('enrichWithNetUnitChange', () => {
        test('should calculate net unit change', () => {
            const input = {
                length: 1.5,
                distinctivenessScore: 4,
                conditionScore: 2 as number | 'Not possible',
                strategicSignificanceMultiplier: 1.1,
                temporalMultiplier: 0.98,
                difficultyMultiplier: 1,
                watercourseEncroachmentMultiplier: 1,
                riparianEncroachmentMultiplier: 1,
            };

            const result = enrichWithUnitsDelivered(input);

            // 1.5 * 4 * 2 * 1.1 * 0.98 * 1 * 1 * 1 = 12.936
            expect(result.unitsDelivered).toBeCloseTo(12.936, 2);
        });

        test('should calculate net unit change with multiple multipliers', () => {
            const input = {
                length: 2,
                distinctivenessScore: 8,
                conditionScore: 2.5 as number | 'Not possible',
                strategicSignificanceMultiplier: 1.15,
                temporalMultiplier: 0.95,
                difficultyMultiplier: 1.1,
                watercourseEncroachmentMultiplier: 0.7,
                riparianEncroachmentMultiplier: 0.9,
            };

            const result = enrichWithUnitsDelivered(input);

            // 2 * 8 * 2.5 * 1.15 * 0.95 * 1.1 * 0.7 * 0.9 = 30.2841
            expect(result.unitsDelivered).toBeCloseTo(30.2841, 2);
        });
    });
});

// ============================================================================
// ENHANCEMENT FUNCTION TESTS
// ============================================================================

describe("Enhancement Functions", () => {
    test("DISTINCTIVENESS_UPGRADE_YEARS constant", () => {
        expect(DISTINCTIVENESS_UPGRADE_YEARS).toEqual(10);
    });

    describe("yearsToNumber", () => {
        test("converts 30+ to 31", () => {
            expect(yearsToNumber("30+")).toEqual(31);
        });

        test("returns number as-is", () => {
            expect(yearsToNumber(5)).toEqual(5);
            expect(yearsToNumber(0)).toEqual(0);
            expect(yearsToNumber(15)).toEqual(15);
        });
    });

    describe("enrichBaselineWatercourseData", () => {
        test("extracts baseline data correctly", () => {
            const baseline = {
                lengthEnhanced: 0.5,
                watercourseType: "Ditches" as const,
                distinctivenessScore: 4,
                distinctiveness: "Medium",
                conditionScore: 2 as number | 'Not possible',
                condition: "Moderate" as const,
            };

            const result = enrichBaselineWatercourseData({ baseline });

            expect(result.length).toEqual(0.5);
            expect(result._baselineWatercourse.label).toEqual("Ditches");
            expect(result._baselineWatercourse.distinctivenessScore).toEqual(4);
            expect(result._baselineCondition).toEqual(2);
            expect(result._baselineConditionLabel).toEqual("Moderate");
        });
    });

    describe("enrichProposedWatercourseData", () => {
        test("enriches with proposed watercourse data", () => {
            const result = enrichProposedWatercourseData({
                watercourseType: "Other rivers and streams",
                condition: "Good",
                strategicSignificance: "Formally identified in local strategy",
            });

            expect(result.distinctiveness).toEqual("High");
            expect(result.distinctivenessScore).toEqual(6);
            expect(result.conditionScore).toEqual(3);
            expect(result.technicalDifficulty).toBeDefined();
        });
    });

    describe("addEnhancementPathway", () => {
        test("creates pathway label", () => {
            const result = addEnhancementPathway({
                _baselineConditionLabel: "Poor",
                condition: "Good",
            });

            expect(result.enhancementPathway).toEqual("Poor to Good");
        });
    });

    describe("lookupEnhancementTimeToTarget", () => {
        test("uses distinctiveness upgrade years when upgrading", () => {
            const result = lookupEnhancementTimeToTarget({
                _baselineWatercourse: { distinctivenessScore: 4 },
                distinctivenessScore: 6,
                enhancementPathway: "Poor to Good",
            });

            expect(result.timeToTargetCondition).toEqual(DISTINCTIVENESS_UPGRADE_YEARS);
        });

        test("looks up from matrix when not upgrading distinctiveness", () => {
            const result = lookupEnhancementTimeToTarget({
                _baselineWatercourse: { distinctivenessScore: 6 },
                distinctivenessScore: 6,
                enhancementPathway: "Poor to Moderate",
            });

            // Should lookup from matrix (exact value depends on matrix data)
            expect(result.timeToTargetCondition).toBeDefined();
        });
    });

    describe("calculateFinalTimeToTargetValues", () => {
        test("calculates final time with advance", () => {
            const result = calculateFinalTimeToTargetValues({
                timeToTargetCondition: 10,
                watercourseEnhancedInAdvance: 3,
                watercourseEnhancedDelay: 0,
            });

            expect(result.finalTimeToTargetCondition).toEqual(7); // 10 - 3 + 0
            expect(result.temporalMultiplier).toBeDefined();
        });

        test("returns 0 when advance exceeds time to target", () => {
            const result = calculateFinalTimeToTargetValues({
                timeToTargetCondition: 5,
                watercourseEnhancedInAdvance: 10,
                watercourseEnhancedDelay: 0,
            });

            expect(result.finalTimeToTargetCondition).toEqual(0);
        });

        test("caps at 30+", () => {
            const result = calculateFinalTimeToTargetValues({
                timeToTargetCondition: 10,
                watercourseEnhancedInAdvance: 0,
                watercourseEnhancedDelay: 25,
            });

            expect(result.finalTimeToTargetCondition).toEqual("30+");
        });

        test("handles N/A time to target", () => {
            const result = calculateFinalTimeToTargetValues({
                timeToTargetCondition: "N/A",
                watercourseEnhancedInAdvance: 0,
                watercourseEnhancedDelay: 0,
            });

            expect(result.finalTimeToTargetCondition).toEqual("N/A");
            expect(result.temporalMultiplier).toEqual("N/A");
        });
    });

    describe("determineEnhancementDifficulty", () => {
        test("applies low difficulty when reached target", () => {
            const result = determineEnhancementDifficulty({
                watercourseEnhancedInAdvance: 5,
                finalTimeToTargetCondition: 0,
                technicalDifficulty: "Medium",
            });

            expect(result.finalDifficultyOfEnhancement).toEqual("Low");
            expect(result.difficultyMultiplierApplied).toEqual(1);
            expect(result.appliedDifficultyMultiplier).toContain("Low Difficulty");
        });

        test("applies standard difficulty when not reached target", () => {
            const result = determineEnhancementDifficulty({
                watercourseEnhancedInAdvance: 0,
                finalTimeToTargetCondition: 5,
                technicalDifficulty: "Medium",
            });

            expect(result.finalDifficultyOfEnhancement).toEqual("Medium");
            expect(result.difficultyMultiplierApplied).toEqual(0.67);
            expect(result.appliedDifficultyMultiplier).toEqual("Standard difficulty applied");
        });
    });

    describe("enrichEnhancementWithEncroachmentData", () => {
        test("applies encroachment multipliers", () => {
            const result = enrichEnhancementWithEncroachmentData({
                watercourseEncroachment: "Minor",
                riparianEncroachment: "Moderate/ Minor",
            });

            expect(result.watercourseEncroachmentMultiplier).toEqual(0.8);
            expect(result.riparianEncroachmentMultiplier).toEqual(0.9);
        });
    });

    describe("calculateEnhancementUnitsDelivered", () => {
        test("calculates units when proposed length > baseline length", () => {
            const data = {
                length: 1.5,
                _baselineWatercourse: { distinctivenessScore: 4 },
                _baselineCondition: 1 as number | 'Not possible',
                distinctivenessScore: 6,
                conditionScore: 2 as number | 'Not possible',
                strategicSignificanceMultiplier: 1.1,
                temporalMultiplier: 0.8 as number | string,
                difficultyMultiplierApplied: 1.1,
                watercourseEncroachmentMultiplier: 0.7,
                riparianEncroachmentMultiplier: 0.9,
                baseline: { lengthEnhanced: 1 },
            };

            const result = calculateEnhancementUnitsDelivered(data);

            expect(result.watercourseUnitsDelivered).toBeGreaterThan(0);
        });

        test("calculates units when proposed length <= baseline length", () => {
            const data = {
                length: 0.8,
                _baselineWatercourse: { distinctivenessScore: 4 },
                _baselineCondition: 1 as number | 'Not possible',
                distinctivenessScore: 6,
                conditionScore: 2 as number | 'Not possible',
                strategicSignificanceMultiplier: 1.1,
                temporalMultiplier: 0.8 as number | string,
                difficultyMultiplierApplied: 1.1,
                watercourseEncroachmentMultiplier: 0.7,
                riparianEncroachmentMultiplier: 0.9,
                baseline: { lengthEnhanced: 1 },
            };

            const result = calculateEnhancementUnitsDelivered(data);

            expect(result.watercourseUnitsDelivered).toBeGreaterThan(0);
        });
    });
});
