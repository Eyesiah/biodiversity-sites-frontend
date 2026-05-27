import { describe, test, expect } from 'bun:test';
import * as v from 'valibot';
import {
    onSiteWatercourseCreationSchema,
    type OnSiteWatercourseCreationSchema,
} from './watercourseCreation';

describe('onSiteWatercourseCreationSchema', () => {
    test('should validate a basic watercourse creation', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Ditches',
            length: 1.5,
            condition: 'Moderate',
            strategicSignificance: 'Location ecologically desirable but not in local strategy',
            habitatCreatedInAdvance: 0,
            delayInStarting: 0,
            watercourseEncroachment: 'No Encroachment',
            riparianEncroachment: 'No Encroachment/ No Encroachment',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: 'WC-001',
        };

        const result = v.parse(onSiteWatercourseCreationSchema, input);

        expect(result.distinctiveness).toBe('Medium');
        expect(result.distinctivenessScore).toBe(4);
        expect(result.conditionScore).toBe(2);
        expect(result.unitsDelivered).toBeGreaterThan(0);
    });

    test('should reject both advance and delay being set', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Ditches',
            length: 1.5,
            condition: 'Moderate',
            strategicSignificance: 'Location ecologically desirable but not in local strategy',
            habitatCreatedInAdvance: 2,
            delayInStarting: 3,
            watercourseEncroachment: 'No Encroachment',
            riparianEncroachment: 'No Encroachment/ No Encroachment',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: 'WC-001',
        };

        expect(() => v.parse(onSiteWatercourseCreationSchema, input)).toThrow();
    });

    test('should reject culvert with non-culvert encroachment', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Culvert',
            length: 0.5,
            condition: 'Poor',
            strategicSignificance: 'Location ecologically desirable but not in local strategy',
            habitatCreatedInAdvance: 0,
            delayInStarting: 0,
            watercourseEncroachment: 'Full', // Should be N/A - Culvert
            riparianEncroachment: 'N/A - Culvert',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: 'WC-002',
        };

        expect(() => v.parse(onSiteWatercourseCreationSchema, input)).toThrow();
    });

    test('should accept culvert with N/A - Culvert encroachment', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Culvert',
            length: 0.5,
            condition: 'Poor',
            strategicSignificance: 'Location ecologically desirable but not in local strategy',
            habitatCreatedInAdvance: 0,
            delayInStarting: 0,
            watercourseEncroachment: 'N/A - Culvert',
            riparianEncroachment: 'N/A - Culvert',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: 'WC-002',
        };

        const result = v.parse(onSiteWatercourseCreationSchema, input);
        expect(result.watercourseType).toBe('Culvert');
        expect(result.unitsDelivered).toBeGreaterThan(0);
    });

    test('should reject invalid condition for watercourse type', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Culvert',
            length: 0.5,
            condition: 'Good', // Not possible for Culvert
            strategicSignificance: 'Location ecologically desirable but not in local strategy',
            habitatCreatedInAdvance: 0,
            delayInStarting: 0,
            watercourseEncroachment: 'N/A - Culvert',
            riparianEncroachment: 'N/A - Culvert',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: 'WC-003',
        };

        expect(() => v.parse(onSiteWatercourseCreationSchema, input)).toThrow();
    });
});

describe('Integration tests', () => {
    test('should calculate complete watercourse creation scenario', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Other rivers and streams',
            length: 2.5,
            condition: 'Moderate',
            strategicSignificance: 'Formally identified in local strategy',
            habitatCreatedInAdvance: 0,
            delayInStarting: 2,
            watercourseEncroachment: 'Minor',
            riparianEncroachment: 'Moderate/ Minor',
            userComments: 'New river creation project',
            planningAuthorityComments: 'Approved with conditions',
            habitatReferenceNumber: 'WC-100',
        };

        const result = v.parse(onSiteWatercourseCreationSchema, input);

        expect(result.watercourseType).toBe('Other rivers and streams');
        expect(result.distinctiveness).toBe('High');
        expect(result.distinctivenessScore).toBe(6);
        expect(result.conditionScore).toBe(2);
        expect(result.strategicSignificanceMultiplier).toBe(1.15);
        expect(result.finalTimeToTarget).toBe(7); // 5 + 2 delay
        expect(result.temporalMultiplier).toBe(0.7792758067);
        expect(result.finalDifficultyOfCreation).toBe('High');
        expect(result.difficultyMultiplier).toBe(0.33);
        expect(result.watercourseEncroachmentMultiplier).toBe(0.8);
        expect(result.riparianEncroachmentMultiplier).toBe(0.9);
        expect(result.unitsDelivered).toBeGreaterThan(0);
    });

    test('should handle canal creation with advance', () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Canals',
            length: 1.0,
            condition: 'Moderate',
            strategicSignificance: 'Location ecologically desirable but not in local strategy',
            habitatCreatedInAdvance: 1,
            delayInStarting: 0,
            watercourseEncroachment: 'No Encroachment',
            riparianEncroachment: 'No Encroachment/ No Encroachment',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: 'WC-200',
        };

        const result = v.parse(onSiteWatercourseCreationSchema, input);

        expect(result.watercourseType).toBe('Canals');
        expect(result.distinctiveness).toBe('Medium');
        expect(result.standardTimeToTarget).toBe(5);
        expect(result.finalTimeToTarget).toBe(4); // 5 - 1 advance
        expect(result.temporalMultiplier).toBe(0.8671800005999999);
        expect(result.unitsDelivered).toBeGreaterThan(0);
    });
});

describe("bugs", () => {
    test("temporal and difficulty multipliers", () => {
        const input: OnSiteWatercourseCreationSchema = {
            watercourseType: 'Ditches',
            length: 0.02,
            condition: 'Poor',
            strategicSignificance: 'Formally identified in local strategy',
            watercourseEncroachment: 'No Encroachment',
            riparianEncroachment: 'No Encroachment/ No Encroachment'
        }

        const parsed = v.parse(onSiteWatercourseCreationSchema, input);
        expect(parsed.standardTimeToTarget).toEqual(1);
        expect(parsed.temporalMultiplier).toBeCloseTo(0.965);
        expect(parsed.appliedDifficulty).toEqual("Standard difficulty applied");
        expect(parsed.standardDifficulty).toEqual("Medium");
        expect(parsed.finalDifficultyOfCreation).toEqual("Medium");
        expect(parsed.difficultyMultiplier).toEqual(0.67);
        expect(parsed.unitsDelivered).toBeCloseTo(0.06);
    })
})
