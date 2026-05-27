import type { WorkBook } from 'xlsx';
import { getCellValue, getSheet } from './excelHelpers';

export type ColumnSpec = { column: string; header?: string };

export type SheetSpec<Cols extends Record<string, ColumnSpec> = Record<string, ColumnSpec>> = {
    name: string;
    /** 0-indexed row at which data begins. */
    startRow: number;
    /** Column letter used by `findAllDataRows` to detect non-empty rows. */
    dataDetectionColumn: string;
    /**
     * Rows (0-indexed) to scan when validating that each column's header
     * matches the expected text. Defaults to the three rows directly above
     * `startRow` to accommodate single- and multi-row headers.
     */
    headerRows?: number[];
    columns: Cols;
};

const defaultHeaderRows = (startRow: number) => [startRow - 3, startRow - 2, startRow - 1];

export const onSiteHabitatBaselineSpec = {
    name: 'A-1 On-Site Habitat Baseline',
    startRow: 10,
    dataDetectionColumn: 'E',
    columns: {
        ref: { column: 'D', header: 'Ref' },
        broadHabitat: { column: 'E', header: 'Broad Habitat' },
        habitatType: { column: 'F', header: 'Habitat type' },
        irreplaceableHabitat: { column: 'G', header: 'Irreplaceable' },
        area: { column: 'H', header: 'Area (hectares)' },
        condition: { column: 'K', header: 'Condition' },
        strategicSignificance: { column: 'M', header: 'Strategic significance' },
        areaRetained: { column: 'S', header: 'Area retained' },
        areaEnhanced: { column: 'T', header: 'Area enhanced' },
        bespokeCompensationAgreed: { column: 'Y', header: 'Bespoke compensation' },
        userComments: { column: 'Z', header: 'User comments' },
        planningAuthorityComments: { column: 'AA', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AB', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const onSiteHabitatCreationSpec = {
    name: 'A-2 On-Site Habitat Creation',
    startRow: 10,
    dataDetectionColumn: 'Y',
    columns: {
        broadHabitat: { column: 'D', header: 'Broad Habitat' },
        habitatType: { column: 'E', header: 'Proposed habitat' },
        area: { column: 'G', header: 'Area (hectares)' },
        condition: { column: 'J', header: 'Condition' },
        strategicSignificance: { column: 'L', header: 'Strategic significance' },
        habitatCreationInAdvance: { column: 'P', header: 'Habitat created in advance' },
        habitatCreationDelay: { column: 'Q', header: 'Delay in starting habitat creation' },
        userComments: { column: 'Z', header: 'User comments' },
        planningAuthorityComments: { column: 'AA', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AB', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const onSiteHabitatEnhancementSpec = {
    name: 'A-3 On-Site Habitat Enhancement',
    startRow: 11,
    dataDetectionColumn: 'E',
    columns: {
        baselineRef: { column: 'E', header: 'Baseline ref' },
        broadHabitat: { column: 'Q', header: 'Proposed Broad Habitat' },
        habitatType: { column: 'R', header: 'Proposed habitat' },
        condition: { column: 'Y', header: 'Condition' },
        strategicSignificance: { column: 'AA', header: 'Strategic significance' },
        habitatEnhancedInAdvance: { column: 'AE', header: 'Habitat enhanced in advance' },
        habitatEnhancedDelay: { column: 'AF', header: 'Delay in starting habitat enhancement' },
        userComments: { column: 'AO', header: 'User comments' },
        planningAuthorityComments: { column: 'AP', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AQ', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const offSiteHabitatBaselineSpec = {
    name: 'D-1 Off-Site Habitat Baseline',
    startRow: 10,
    dataDetectionColumn: 'E',
    columns: {
        ref: { column: 'D', header: 'Ref' },
        broadHabitat: { column: 'E', header: 'Broad habitat' },
        habitatType: { column: 'F', header: 'Habitat type' },
        irreplaceableHabitat: { column: 'G', header: 'Irreplaceable' },
        area: { column: 'H', header: 'Area (hectares)' },
        condition: { column: 'K', header: 'Condition' },
        strategicSignificance: { column: 'M', header: 'Strategic significance' },
        spatialRiskCategory: { column: 'R', header: 'Spatial risk category' },
        areaRetained: { column: 'V', header: 'Area retained' },
        areaEnhanced: { column: 'W', header: 'Area enhanced' },
        bespokeCompensationAgreed: { column: 'AB', header: 'Bespoke compensation' },
        userComments: { column: 'AC', header: 'User comments' },
        planningAuthorityComments: { column: 'AD', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AE', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AF', header: 'Off-site reference' },
    },
} as const satisfies SheetSpec;

export const offSiteHabitatCreationSpec = {
    name: 'D-2 Off-Site Habitat Creation',
    startRow: 10,
    dataDetectionColumn: 'D',
    columns: {
        broadHabitat: { column: 'D', header: 'Broad Habitat' },
        habitatType: { column: 'E', header: 'Proposed habitat' },
        area: { column: 'G', header: 'Area (hectares)' },
        condition: { column: 'J', header: 'Condition' },
        strategicSignificance: { column: 'L', header: 'Strategic significance' },
        habitatCreationInAdvance: { column: 'P', header: 'Habitat created in advance' },
        habitatCreationDelay: { column: 'Q', header: 'Delay in starting habitat creation' },
        spatialRiskCategory: { column: 'Y', header: 'Spatial risk category' },
        userComments: { column: 'AC', header: 'User comments' },
        planningAuthorityComments: { column: 'AD', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AE', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AF', header: 'Off-site reference' },
        baselineReferenceNumber: { column: 'AG', header: 'Baseline Ref' },
    },
} as const satisfies SheetSpec;

export const offSiteHabitatEnhancementSpec = {
    name: 'D-3 Off-Site Habitat Enhancment',
    startRow: 11,
    dataDetectionColumn: 'E',
    columns: {
        baselineRef: { column: 'E', header: 'Baseline ref' },
        broadHabitat: { column: 'Q', header: 'Proposed Broad Habitat' },
        habitatType: { column: 'R', header: 'Proposed Habitat' },
        condition: { column: 'Y', header: 'Condition' },
        strategicSignificance: { column: 'AA', header: 'Strategic significance' },
        habitatEnhancedInAdvance: { column: 'AE', header: 'Habitat enhanced in advance' },
        habitatEnhancedDelay: { column: 'AF', header: 'Delay in starting habitat enhancement' },
        userComments: { column: 'AR', header: 'User comments' },
        planningAuthorityComments: { column: 'AS', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AT', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AU', header: 'Off-site reference' },
    },
} as const satisfies SheetSpec;

export const onSiteHedgerowBaselineSpec = {
    name: 'B-1 On-Site Hedge Baseline',
    startRow: 9,
    dataDetectionColumn: 'D',
    columns: {
        ref: { column: 'B', header: 'Ref' },
        habitatType: { column: 'D', header: 'Habitat type' },
        length: { column: 'E', header: 'Length (km)' },
        condition: { column: 'H', header: 'Condition' },
        strategicSignificance: { column: 'J', header: 'Strategic significance' },
        lengthRetained: { column: 'P', header: 'Length retained' },
        lengthEnhanced: { column: 'Q', header: 'Length enhanced' },
        userComments: { column: 'V', header: 'User comments' },
        planningAuthorityComments: { column: 'W', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'X', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const onSiteHedgerowCreationSpec = {
    name: 'B-2 On-Site Hedge Creation',
    startRow: 11,
    dataDetectionColumn: 'D',
    columns: {
        habitatType: { column: 'D', header: 'Habitat type' },
        length: { column: 'E', header: 'Length (km)' },
        condition: { column: 'H', header: 'Condition' },
        strategicSignificance: { column: 'J', header: 'Strategic significance' },
        habitatCreatedInAdvance: { column: 'N', header: 'Habitat created in advance' },
        delayInStartingHabitatCreation: { column: 'O', header: 'Delay in starting habitat creation' },
        userComments: { column: 'X', header: 'User comments' },
        planningAuthorityComments: { column: 'Y', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'Z', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const onSiteHedgerowEnhancementSpec = {
    name: 'B-3 On-Site Hedge Enhancement',
    startRow: 11,
    dataDetectionColumn: 'B',
    columns: {
        baselineRef: { column: 'B', header: 'Baseline ref' },
        habitatType: { column: 'M', header: 'Proposed habitat' },
        condition: { column: 'S', header: 'Condition' },
        strategicSignificance: { column: 'U', header: 'Strategic significance' },
        hedgerowEnhancedInAdvance: { column: 'Y', header: 'Habitat enhanced in advance' },
        hedgerowEnhancedDelay: { column: 'Z', header: 'Delay in starting habitat enhancement' },
        userComments: { column: 'AI', header: 'User comments' },
        planningAuthorityComments: { column: 'AJ', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AK', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const offSiteHedgerowBaselineSpec = {
    name: 'E-1 Off-Site Hedge Baseline',
    startRow: 9,
    dataDetectionColumn: 'D',
    columns: {
        ref: { column: 'B', header: 'Ref' },
        habitatType: { column: 'D', header: 'Habitat type' },
        length: { column: 'E', header: 'Length (km)' },
        condition: { column: 'H', header: 'Condition' },
        strategicSignificance: { column: 'J', header: 'Strategic significance' },
        spatialRiskCategory: { column: 'O', header: 'Spatial risk category' },
        lengthRetained: { column: 'S', header: 'Length retained' },
        lengthEnhanced: { column: 'T', header: 'Length enhanced' },
        userComments: { column: 'Y', header: 'User comments' },
        planningAuthorityComments: { column: 'Z', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AA', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AB', header: 'Off-site reference' },
    },
} as const satisfies SheetSpec;

export const offSiteHedgerowCreationSpec = {
    name: 'E-2 Off-Site Hedge Creation',
    startRow: 11,
    dataDetectionColumn: 'D',
    columns: {
        habitatType: { column: 'D', header: 'Habitat type' },
        length: { column: 'E', header: 'Length (km)' },
        condition: { column: 'H', header: 'Condition' },
        strategicSignificance: { column: 'J', header: 'Strategic significance' },
        spatialRiskCategory: { column: 'M', header: 'Spatial risk category' },
        habitatCreatedInAdvance: { column: 'P', header: 'Habitat created in advance' },
        delayInStartingHabitatCreation: { column: 'Q', header: 'Delay in starting habitat creation' },
        userComments: { column: 'AA', header: 'User comments' },
        planningAuthorityComments: { column: 'AB', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AC', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AD', header: 'Off-site reference' },
        baselineReferenceNumber: { column: 'AE', header: 'Baseline ref' },
    },
} as const satisfies SheetSpec;

export const offSiteHedgerowEnhancementSpec = {
    name: 'E-3 Off-Site Hedge Enhancement',
    startRow: 11,
    dataDetectionColumn: 'B',
    columns: {
        baselineRef: { column: 'B', header: 'Baseline ref' },
        habitatType: { column: 'M', header: 'Proposed habitat' },
        condition: { column: 'S', header: 'Condition' },
        strategicSignificance: { column: 'U', header: 'Strategic significance' },
        hedgerowEnhancedInAdvance: { column: 'Y', header: 'Habitat enhanced in advance' },
        hedgerowEnhancedDelay: { column: 'Z', header: 'Delay in starting habitat enhancement' },
        userComments: { column: 'AL', header: 'User comments' },
        planningAuthorityComments: { column: 'AM', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AN', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AO', header: 'Off-site reference' },
    },
} as const satisfies SheetSpec;

export const onSiteWatercourseBaselineSpec = {
    name: "C-1 On-Site WaterC' Baseline",
    startRow: 9,
    dataDetectionColumn: 'E',
    // Bespoke compensation header lives in row 7 on this sheet — widen the window.
    headerRows: [6, 7, 8],
    columns: {
        ref: { column: 'C', header: 'Ref' },
        watercourseType: { column: 'D', header: 'Watercourse type' },
        length: { column: 'E', header: 'Length (km)' },
        condition: { column: 'H', header: 'Condition' },
        strategicSignificance: { column: 'J', header: 'Strategic significance' },
        watercourseEncroachment: { column: 'M', header: 'Extent of encroachment' },
        riparianEncroachment: { column: 'O', header: 'Extent of encroachment for both banks' },
        lengthRetained: { column: 'U', header: 'Length retained' },
        lengthEnhanced: { column: 'V', header: 'Length enhanced' },
        bespokeCompensation: { column: 'AA', header: 'Bespoke compensation' },
        userComments: { column: 'AB', header: 'User Comments' },
        planningAuthorityComments: { column: 'AC', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AD', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const onSiteWatercourseCreationSpec = {
    name: "C-2 On-Site WaterC' Creation",
    startRow: 11,
    dataDetectionColumn: 'C',
    columns: {
        watercourseType: { column: 'C', header: 'Watercourse type' },
        length: { column: 'D', header: 'Length (km)' },
        condition: { column: 'G', header: 'Condition' },
        strategicSignificance: { column: 'I', header: 'Strategic significance' },
        habitatCreatedInAdvance: { column: 'M', header: 'Habitat created in advance' },
        delayInStarting: { column: 'N', header: 'Delay in starting habitat creation' },
        watercourseEncroachment: { column: 'V', header: 'Extent of encroachment' },
        riparianEncroachment: { column: 'X', header: 'Extent of encroachment for both banks' },
        userComments: { column: 'AA', header: 'User comments' },
        planningAuthorityComments: { column: 'AB', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AC', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const onSiteWatercourseEnhancementSpec = {
    name: "C-3 On-Site WaterC' Enhancement",
    startRow: 11,
    dataDetectionColumn: 'N',
    columns: {
        baselineRef: { column: 'B', header: 'Baseline ref' },
        watercourseType: { column: 'N', header: 'Proposed habitat' },
        condition: { column: 'T', header: 'Condition' },
        strategicSignificance: { column: 'V', header: 'Strategic significance' },
        watercourseEnhancedInAdvance: { column: 'Z', header: 'Habitat enhanced in advance' },
        watercourseEnhancedDelay: { column: 'AA', header: 'Delay in starting habitat enhancement' },
        watercourseEncroachment: { column: 'AI', header: 'Extent of encroachment' },
        riparianEncroachment: { column: 'AK', header: 'Extent of encroachment for both banks' },
        userComments: { column: 'AN', header: 'User comments' },
        planningAuthorityComments: { column: 'AO', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AP', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const offSiteWatercourseBaselineSpec = {
    name: "F-1 Off-Site WaterC' Baseline",
    startRow: 9,
    dataDetectionColumn: 'E',
    // Bespoke compensation header lives in row 7 on this sheet — widen the window.
    headerRows: [6, 7, 8],
    columns: {
        ref: { column: 'C', header: 'Ref' },
        watercourseType: { column: 'D', header: 'Watercourse type' },
        length: { column: 'E', header: 'Length (km)' },
        condition: { column: 'H', header: 'Condition' },
        strategicSignificance: { column: 'J', header: 'Strategic significance' },
        watercourseEncroachment: { column: 'M', header: 'Extent of encroachment' },
        riparianEncroachment: { column: 'O', header: 'Extent of encroachment for both banks' },
        spatialRiskCategory: { column: 'S', header: 'Spatial risk category' },
        lengthRetained: { column: 'X', header: 'Length retained' },
        lengthEnhanced: { column: 'Y', header: 'Length enhanced' },
        bespokeCompensation: { column: 'AD', header: 'Bespoke compensation' },
        userComments: { column: 'AE', header: 'User comments' },
        planningAuthorityComments: { column: 'AF', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AG', header: 'Habitat reference' },
        offSiteReferenceNumber: { column: 'AH', header: 'Off-site reference' },
    },
} as const satisfies SheetSpec;

export const offSiteWatercourseCreationSpec = {
    name: "F-2 Off-Site WaterC' Creation",
    startRow: 11,
    dataDetectionColumn: 'C',
    columns: {
        watercourseType: { column: 'C', header: 'Watercourse type' },
        length: { column: 'D', header: 'Length (km)' },
        condition: { column: 'G', header: 'Condition' },
        strategicSignificance: { column: 'I', header: 'Strategic significance' },
        habitatCreatedInAdvance: { column: 'M', header: 'Habitat created in advance' },
        delayInStarting: { column: 'N', header: 'Delay in starting habitat creation' },
        watercourseEncroachment: { column: 'V', header: 'Extent of encroachment' },
        riparianEncroachment: { column: 'X', header: 'Extent of encroachment for both banks' },
        spatialRiskCategory: { column: 'Z', header: 'Spatial risk category' },
        userComments: { column: 'AD', header: 'User comments' },
        planningAuthorityComments: { column: 'AE', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AF', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const offSiteWatercourseEnhancementSpec = {
    name: 'F-3 Off-Site WaterC Enhancement',
    startRow: 11,
    dataDetectionColumn: 'AP',
    columns: {
        baselineRef: { column: 'B', header: 'Baseline ref' },
        watercourseType: { column: 'N', header: 'Proposed habitat' },
        condition: { column: 'T', header: 'Condition' },
        strategicSignificance: { column: 'V', header: 'Strategic significance' },
        watercourseEnhancedInAdvance: { column: 'Z', header: 'Habitat enhanced in advance' },
        watercourseEnhancedDelay: { column: 'AA', header: 'Delay in starting habitat enhancement' },
        watercourseEncroachment: { column: 'AI', header: 'Extent of encroachment' },
        riparianEncroachment: { column: 'AK', header: 'Extent of encroachment for both banks' },
        userComments: { column: 'AQ', header: 'User comments' },
        planningAuthorityComments: { column: 'AR', header: 'Planning authority' },
        habitatReferenceNumber: { column: 'AS', header: 'Habitat reference' },
    },
} as const satisfies SheetSpec;

export const allSheetSpecs = [
    onSiteHabitatBaselineSpec,
    onSiteHabitatCreationSpec,
    onSiteHabitatEnhancementSpec,
    offSiteHabitatBaselineSpec,
    offSiteHabitatCreationSpec,
    offSiteHabitatEnhancementSpec,
    onSiteHedgerowBaselineSpec,
    onSiteHedgerowCreationSpec,
    onSiteHedgerowEnhancementSpec,
    offSiteHedgerowBaselineSpec,
    offSiteHedgerowCreationSpec,
    offSiteHedgerowEnhancementSpec,
    onSiteWatercourseBaselineSpec,
    onSiteWatercourseCreationSpec,
    onSiteWatercourseEnhancementSpec,
    offSiteWatercourseBaselineSpec,
    offSiteWatercourseCreationSpec,
    offSiteWatercourseEnhancementSpec,
] as const satisfies readonly SheetSpec[];

export type HeaderMismatch = {
    sheet: string;
    column: string;
    expected: string;
    found: string | null;
};

export type ValidationResult = {
    missingSheets: string[];
    mismatches: HeaderMismatch[];
};

function normalize(value: unknown): string {
    if (value == null) return '';
    return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function validateWorkbookHeaders(workbook: WorkBook, specs: readonly SheetSpec[] = allSheetSpecs): ValidationResult {
    const missingSheets: string[] = [];
    const mismatches: HeaderMismatch[] = [];

    for (const spec of specs) {
        const sheet = getSheet(workbook, spec.name);
        if (!sheet) {
            missingSheets.push(spec.name);
            continue;
        }

        const rows = spec.headerRows ?? defaultHeaderRows(spec.startRow);
        for (const [, { column, header }] of Object.entries(spec.columns)) {
            if (!header) continue;
            const expected = normalize(header);
            let foundInColumn: string | null = null;
            let matched = false;
            for (const row of rows) {
                const value = getCellValue(sheet, row, column);
                if (value == null || value === '') continue;
                const normalized = normalize(value);
                if (foundInColumn === null) foundInColumn = String(value);
                if (normalized.includes(expected)) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                mismatches.push({
                    sheet: spec.name,
                    column,
                    expected: header,
                    found: foundInColumn,
                });
            }
        }
    }

    return { missingSheets, mismatches };
}

export function formatValidationErrors(result: ValidationResult): string {
    const lines: string[] = [];
    if (result.missingSheets.length > 0) {
        lines.push('Missing sheets:');
        for (const name of result.missingSheets) lines.push(`  - ${name}`);
    }
    if (result.mismatches.length > 0) {
        lines.push('Column header mismatches:');
        for (const m of result.mismatches) {
            lines.push(`  - ${m.sheet} column ${m.column}: expected "${m.expected}", found ${m.found === null ? 'empty' : `"${m.found}"`}`);
        }
    }
    return lines.join('\n');
}
