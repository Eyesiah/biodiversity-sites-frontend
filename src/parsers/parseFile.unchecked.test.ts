import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { onSiteHabitatBaselineUncheckedSchema } from '../onSite/habitatBaseline';

describe('unchecked schema bypass behaviour', () => {
    test('a row with an invalid habitat combination produces undefined (never NaN) unit values', () => {
        // broadHabitat and habitatType are both valid picklist entries individually,
        // but their combination is invalid — habitatByBroadAndType returns undefined,
        // so enrichWithHabitatData throws and safeTransform passes the row through.
        const result = v.safeParse(onSiteHabitatBaselineUncheckedSchema, {
            broadHabitat: 'Grassland',
            habitatType: 'Fens (upland and lowland)',
            irreplaceableHabitat: false,
            area: 2,
            condition: 'Good',
            strategicSignificance: 'Area/compensation not in local strategy/ no local strategy',
            areaRetained: 1,
            areaEnhanced: 0,
            bespokeCompensationAgreed: 'No',
            userComments: '',
            planningAuthorityComments: '',
            habitatReferenceNumber: '',
        });

        expect(result.success).toBe(true);
        if (!result.success) return;

        const row = result.output as Record<string, unknown>;
        const numericFields = [
            'distinctivenessScore',
            'conditionScore',
            'strategicSignificanceMultiplier',
            'baselineUnitsRetained',
            'baselineUnitsEnhanced',
            'areaHabitatLost',
            'totalHabitatUnits',
            'unitsLost',
            'vhdhBespokeCompensationUnits',
        ];
        for (const field of numericFields) {
            const value = row[field];
            expect(typeof value === 'number' ? Number.isNaN(value) : false).toBe(false);
        }
    });
});
