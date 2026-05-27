import * as v from 'valibot';
import { decodeCol } from '../cellRef';
import { getCellValue, MAX_DATA_ROWS, type SheetView } from '../excelHelpers';
import {
    allSheetSpecs,
    formatValidationErrors,
    offSiteHabitatBaselineSpec,
    offSiteHabitatCreationSpec,
    offSiteHabitatEnhancementSpec,
    offSiteHedgerowBaselineSpec,
    offSiteHedgerowCreationSpec,
    offSiteHedgerowEnhancementSpec,
    offSiteWatercourseBaselineSpec,
    offSiteWatercourseCreationSpec,
    offSiteWatercourseEnhancementSpec,
    onSiteHabitatBaselineSpec,
    onSiteHabitatCreationSpec,
    onSiteHabitatEnhancementSpec,
    onSiteHedgerowBaselineSpec,
    onSiteHedgerowCreationSpec,
    onSiteHedgerowEnhancementSpec,
    onSiteWatercourseBaselineSpec,
    onSiteWatercourseCreationSpec,
    onSiteWatercourseEnhancementSpec,
    type HeaderMismatch,
    type SheetSpec,
    type ValidationResult,
} from '../columnMappings';
import {
    parseOffSiteHabitatBaselineRow,
    parseOffSiteHabitatCreationRow,
    parseOffSiteHabitatEnhancementRow,
    parseOffSiteHedgerowBaselineRow,
    parseOffSiteHedgerowCreationRow,
    parseOffSiteHedgerowEnhancementRow,
    parseOffSiteWatercourseBaselineRow,
    parseOffSiteWatercourseCreationRow,
    parseOffSiteWatercourseEnhancementRow,
    parseOnSiteHabitatBaselineRow,
    parseOnSiteHabitatCreationRow,
    parseOnSiteHabitatEnhancementRow,
    parseOnSiteHedgerowBaselineRow,
    parseOnSiteHedgerowCreationRow,
    parseOnSiteHedgerowEnhancementRow,
    parseOnSiteWatercourseBaselineRow,
    parseOnSiteWatercourseCreationRow,
    parseOnSiteWatercourseEnhancementRow,
} from '../rowParsers';
import { offSiteHabitatBaselineSchema, offSiteHabitatBaselineUncheckedSchema, type OffSiteHabitatBaseline } from '../../offSite/habitatBaseline';
import { offSiteHabitatCreationSchema, offSiteHabitatCreationUncheckedSchema, type OffSiteHabitatCreation } from '../../offSite/habitatCreation';
import { offSiteHabitatEnhancementSchema, offSiteHabitatEnhancementUncheckedSchema, type OffSiteHabitatEnhancement } from '../../offSite/habitatEnhancement';
import { offSiteHedgerowBaselineSchema, offSiteHedgerowBaselineUncheckedSchema, type OffSiteHedgerowBaseline } from '../../offSite/hedgerowBaseline';
import { offSiteHedgerowCreationSchema, offSiteHedgerowCreationUncheckedSchema, type OffSiteHedgerowCreation } from '../../offSite/hedgerowCreation';
import { offSiteHedgerowEnhancementSchema, offSiteHedgerowEnhancementUncheckedSchema, type OffSiteHedgerowEnhancement } from '../../offSite/hedgerowEnhancement';
import { offSiteWatercourseBaselineSchema, offSiteWatercourseBaselineUncheckedSchema, type OffSiteWatercourseBaseline } from '../../offSite/watercourseBaseline';
import { offSiteWatercourseCreationSchema, offSiteWatercourseCreationUncheckedSchema, type OffSiteWatercourseCreation } from '../../offSite/watercourseCreation';
import { offSiteWatercourseEnhancementSchema, offSiteWatercourseEnhancementUncheckedSchema, type OffSiteWatercourseEnhancement } from '../../offSite/watercourseEnhancement';
import { onSiteHabitatBaselineSchema, onSiteHabitatBaselineUncheckedSchema, type OnSiteHabitatBaseline } from '../../onSite/habitatBaseline';
import { onSiteHabitatCreationSchema, onSiteHabitatCreationUncheckedSchema, type OnSiteHabitatCreation } from '../../onSite/habitatCreation';
import { onSiteHabitatEnhancementSchema, onSiteHabitatEnhancementUncheckedSchema, type OnSiteHabitatEnhancement } from '../../onSite/habitatEnhancement';
import { onSiteHedgerowBaselineSchema, onSiteHedgerowBaselineUncheckedSchema, type OnSiteHedgerowBaseline } from '../../onSite/hedgerowBaseline';
import { onSiteHedgerowCreationSchema, onSiteHedgerowCreationUncheckedSchema, type OnSiteHedgerowCreation } from '../../onSite/hedgerowCreation';
import { onSiteHedgerowEnhancementSchema, onSiteHedgerowEnhancementUncheckedSchema, type OnSiteHedgerowEnhancement } from '../../onSite/hedgerowEnhancement';
import { onSiteWatercourseBaselineSchema, onSiteWatercourseBaselineUncheckedSchema, type OnSiteWatercourseBaseline } from '../../onSite/watercourseBaseline';
import { onSiteWatercourseCreationSchema, onSiteWatercourseCreationUncheckedSchema, type OnSiteWatercourseCreation } from '../../onSite/watercourseCreation';
import { onSiteWatercourseEnhancementSchema, onSiteWatercourseEnhancementUncheckedSchema, type OnSiteWatercourseEnhancement } from '../../onSite/watercourseEnhancement';
import type { ParseFileOptions } from '../parseFile';
import {
    loadWorkbookEntries,
    parseWorkbookIndex,
    parseWorksheet,
    sheetViewFromRows,
    toUint8Array,
    type ParseFileStreamInput,
} from './xlsxStream';

export type StreamedRow =
    | { kind: 'onSiteHabitatBaseline'; row: OnSiteHabitatBaseline }
    | { kind: 'onSiteHabitatCreation'; row: OnSiteHabitatCreation }
    | { kind: 'onSiteHabitatEnhancement'; row: OnSiteHabitatEnhancement }
    | { kind: 'offSiteHabitatBaseline'; row: OffSiteHabitatBaseline }
    | { kind: 'offSiteHabitatCreation'; row: OffSiteHabitatCreation }
    | { kind: 'offSiteHabitatEnhancement'; row: OffSiteHabitatEnhancement }
    | { kind: 'onSiteHedgerowBaseline'; row: OnSiteHedgerowBaseline }
    | { kind: 'onSiteHedgerowCreation'; row: OnSiteHedgerowCreation }
    | { kind: 'onSiteHedgerowEnhancement'; row: OnSiteHedgerowEnhancement }
    | { kind: 'offSiteHedgerowBaseline'; row: OffSiteHedgerowBaseline }
    | { kind: 'offSiteHedgerowCreation'; row: OffSiteHedgerowCreation }
    | { kind: 'offSiteHedgerowEnhancement'; row: OffSiteHedgerowEnhancement }
    | { kind: 'onSiteWatercourseBaseline'; row: OnSiteWatercourseBaseline }
    | { kind: 'onSiteWatercourseCreation'; row: OnSiteWatercourseCreation }
    | { kind: 'onSiteWatercourseEnhancement'; row: OnSiteWatercourseEnhancement }
    | { kind: 'offSiteWatercourseBaseline'; row: OffSiteWatercourseBaseline }
    | { kind: 'offSiteWatercourseCreation'; row: OffSiteWatercourseCreation }
    | { kind: 'offSiteWatercourseEnhancement'; row: OffSiteWatercourseEnhancement };

export type StreamedRowKind = StreamedRow['kind'];

export interface ParseFileStreamOptions extends ParseFileOptions {
    signal?: AbortSignal;
}

export type { ParseFileStreamInput };

const dataValueSchema = v.union([
    v.pipe(v.string(), v.trim(), v.minLength(1)),
    v.pipe(v.number()),
]);

function findAllDataRows(sheet: SheetView, columnToCheckPresence: number, startRow: number, maxRows: number = MAX_DATA_ROWS): number[] {
    const out: number[] = [];
    let consecutiveEmpty = 0;
    for (let row = startRow; row < startRow + maxRows; row++) {
        const value = getCellValue(sheet, row, columnToCheckPresence);
        const parsed = v.safeParse(dataValueSchema, value);
        if (parsed.success && parsed.output !== 'Broad Habitat') {
            out.push(row);
            consecutiveEmpty = 0;
        } else {
            consecutiveEmpty++;
            if (consecutiveEmpty > 10) break;
        }
    }
    return out;
}

function normalize(value: unknown): string {
    if (value == null) return '';
    return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function validateHeaders(views: Map<string, SheetView>, specs: readonly SheetSpec[]): ValidationResult {
    const missingSheets: string[] = [];
    const mismatches: HeaderMismatch[] = [];
    for (const spec of specs) {
        const sheet = views.get(spec.name);
        if (!sheet) { missingSheets.push(spec.name); continue; }
        const rows = spec.headerRows ?? [spec.startRow - 3, spec.startRow - 2, spec.startRow - 1];
        for (const [, { column, header }] of Object.entries(spec.columns)) {
            if (!header) continue;
            const expected = normalize(header);
            let foundInColumn: string | null = null;
            let matched = false;
            for (const row of rows) {
                const value = getCellValue(sheet, row, column);
                if (value == null || value === '') continue;
                const norm = normalize(value);
                if (foundInColumn === null) foundInColumn = String(value);
                if (norm.includes(expected)) { matched = true; break; }
            }
            if (!matched) mismatches.push({ sheet: spec.name, column, expected: header, found: foundInColumn });
        }
    }
    return { missingSheets, mismatches };
}

type SimpleEntry = {
    kind: StreamedRowKind;
    spec: SheetSpec;
    parseRow: (sheet: SheetView, row: number) => unknown;
    checked: v.BaseSchema<any, any, any>;
    unchecked: v.BaseSchema<any, any, any>;
};

type EnhancementEntry = {
    kind: StreamedRowKind;
    spec: SheetSpec;
    baselineSpec: SheetSpec;
    parseRow: (baselineSheet: SheetView, sheet: SheetView, row: number) => unknown;
    checked: v.BaseSchema<any, any, any>;
    unchecked: v.BaseSchema<any, any, any>;
};

type PipelineEntry = (SimpleEntry & { tag: 'simple' }) | (EnhancementEntry & { tag: 'enhancement' });

const PIPELINE: readonly PipelineEntry[] = [
    { tag: 'simple', kind: 'onSiteHabitatBaseline', spec: onSiteHabitatBaselineSpec, parseRow: parseOnSiteHabitatBaselineRow, checked: onSiteHabitatBaselineSchema, unchecked: onSiteHabitatBaselineUncheckedSchema },
    { tag: 'simple', kind: 'onSiteHabitatCreation', spec: onSiteHabitatCreationSpec, parseRow: parseOnSiteHabitatCreationRow, checked: onSiteHabitatCreationSchema, unchecked: onSiteHabitatCreationUncheckedSchema },
    { tag: 'enhancement', kind: 'onSiteHabitatEnhancement', spec: onSiteHabitatEnhancementSpec, baselineSpec: onSiteHabitatBaselineSpec, parseRow: parseOnSiteHabitatEnhancementRow, checked: onSiteHabitatEnhancementSchema, unchecked: onSiteHabitatEnhancementUncheckedSchema },
    { tag: 'simple', kind: 'offSiteHabitatBaseline', spec: offSiteHabitatBaselineSpec, parseRow: parseOffSiteHabitatBaselineRow, checked: offSiteHabitatBaselineSchema, unchecked: offSiteHabitatBaselineUncheckedSchema },
    { tag: 'simple', kind: 'offSiteHabitatCreation', spec: offSiteHabitatCreationSpec, parseRow: parseOffSiteHabitatCreationRow, checked: offSiteHabitatCreationSchema, unchecked: offSiteHabitatCreationUncheckedSchema },
    { tag: 'enhancement', kind: 'offSiteHabitatEnhancement', spec: offSiteHabitatEnhancementSpec, baselineSpec: offSiteHabitatBaselineSpec, parseRow: parseOffSiteHabitatEnhancementRow, checked: offSiteHabitatEnhancementSchema, unchecked: offSiteHabitatEnhancementUncheckedSchema },
    { tag: 'simple', kind: 'onSiteHedgerowBaseline', spec: onSiteHedgerowBaselineSpec, parseRow: parseOnSiteHedgerowBaselineRow, checked: onSiteHedgerowBaselineSchema, unchecked: onSiteHedgerowBaselineUncheckedSchema },
    { tag: 'simple', kind: 'onSiteHedgerowCreation', spec: onSiteHedgerowCreationSpec, parseRow: parseOnSiteHedgerowCreationRow, checked: onSiteHedgerowCreationSchema, unchecked: onSiteHedgerowCreationUncheckedSchema },
    { tag: 'enhancement', kind: 'onSiteHedgerowEnhancement', spec: onSiteHedgerowEnhancementSpec, baselineSpec: onSiteHedgerowBaselineSpec, parseRow: parseOnSiteHedgerowEnhancementRow, checked: onSiteHedgerowEnhancementSchema, unchecked: onSiteHedgerowEnhancementUncheckedSchema },
    { tag: 'simple', kind: 'offSiteHedgerowBaseline', spec: offSiteHedgerowBaselineSpec, parseRow: parseOffSiteHedgerowBaselineRow, checked: offSiteHedgerowBaselineSchema, unchecked: offSiteHedgerowBaselineUncheckedSchema },
    { tag: 'simple', kind: 'offSiteHedgerowCreation', spec: offSiteHedgerowCreationSpec, parseRow: parseOffSiteHedgerowCreationRow, checked: offSiteHedgerowCreationSchema, unchecked: offSiteHedgerowCreationUncheckedSchema },
    { tag: 'enhancement', kind: 'offSiteHedgerowEnhancement', spec: offSiteHedgerowEnhancementSpec, baselineSpec: offSiteHedgerowBaselineSpec, parseRow: parseOffSiteHedgerowEnhancementRow, checked: offSiteHedgerowEnhancementSchema, unchecked: offSiteHedgerowEnhancementUncheckedSchema },
    { tag: 'simple', kind: 'onSiteWatercourseBaseline', spec: onSiteWatercourseBaselineSpec, parseRow: parseOnSiteWatercourseBaselineRow, checked: onSiteWatercourseBaselineSchema, unchecked: onSiteWatercourseBaselineUncheckedSchema },
    { tag: 'simple', kind: 'onSiteWatercourseCreation', spec: onSiteWatercourseCreationSpec, parseRow: parseOnSiteWatercourseCreationRow, checked: onSiteWatercourseCreationSchema, unchecked: onSiteWatercourseCreationUncheckedSchema },
    { tag: 'enhancement', kind: 'onSiteWatercourseEnhancement', spec: onSiteWatercourseEnhancementSpec, baselineSpec: onSiteWatercourseBaselineSpec, parseRow: parseOnSiteWatercourseEnhancementRow, checked: onSiteWatercourseEnhancementSchema, unchecked: onSiteWatercourseEnhancementUncheckedSchema },
    { tag: 'simple', kind: 'offSiteWatercourseBaseline', spec: offSiteWatercourseBaselineSpec, parseRow: parseOffSiteWatercourseBaselineRow, checked: offSiteWatercourseBaselineSchema, unchecked: offSiteWatercourseBaselineUncheckedSchema },
    { tag: 'simple', kind: 'offSiteWatercourseCreation', spec: offSiteWatercourseCreationSpec, parseRow: parseOffSiteWatercourseCreationRow, checked: offSiteWatercourseCreationSchema, unchecked: offSiteWatercourseCreationUncheckedSchema },
    { tag: 'enhancement', kind: 'offSiteWatercourseEnhancement', spec: offSiteWatercourseEnhancementSpec, baselineSpec: offSiteWatercourseBaselineSpec, parseRow: parseOffSiteWatercourseEnhancementRow, checked: offSiteWatercourseEnhancementSchema, unchecked: offSiteWatercourseEnhancementUncheckedSchema },
];

export function parseFileStream(
    input: ParseFileStreamInput,
    options: ParseFileStreamOptions = {},
): AsyncIterable<StreamedRow> {
    const validate = options.validate !== false;
    return {
        [Symbol.asyncIterator]: () => iterate(input, validate, options.signal),
    };
}

async function* iterate(input: ParseFileStreamInput, validate: boolean, signal?: AbortSignal): AsyncGenerator<StreamedRow> {
    const data = await toUint8Array(input);
    if (signal?.aborted) throw signal.reason ?? new Error('aborted');

    let nameToPath: Map<string, string> | null = null;
    const { sharedStrings, takeWorksheet } = loadWorkbookEntries(data, (wbXml, relsXml) => {
        const idx = parseWorkbookIndex(wbXml, relsXml);
        nameToPath = idx.sheetPath;
        const out = new Set<string>();
        for (const spec of allSheetSpecs) {
            const p = idx.sheetPath.get(spec.name);
            if (p) out.add(p);
        }
        return out;
    });
    const sheetPath = nameToPath!;

    const viewCache = new Map<string, SheetView>();
    const loadView = (name: string): SheetView => {
        const cached = viewCache.get(name);
        if (cached) return cached;
        const path = sheetPath.get(name);
        if (!path) throw new Error(`xlsx: sheet "${name}" not found`);
        const xml = takeWorksheet(path);
        if (xml == null) throw new Error(`xlsx: worksheet entry "${path}" missing or already consumed`);
        const rows = parseWorksheet(xml, sharedStrings);
        const view = sheetViewFromRows(rows);
        viewCache.set(name, view);
        return view;
    };
    const dropView = (name: string) => viewCache.delete(name);

    // Header validation — match parseWorkbook's eager check.
    {
        const views = new Map<string, SheetView>();
        for (const spec of allSheetSpecs) views.set(spec.name, loadView(spec.name));
        const result = validateHeaders(views, allSheetSpecs);
        if (result.missingSheets.length > 0 || result.mismatches.length > 0) {
            throw new Error(`Unsupported metric layout:\n${formatValidationErrors(result)}`);
        }
    }

    // Track which baseline a future enhancement will need so we keep it cached.
    const baselineNeededBy = new Map<string, string>(); // baselineSheetName → enhancementSheetName
    for (const entry of PIPELINE) {
        if (entry.tag === 'enhancement') baselineNeededBy.set(entry.baselineSpec.name, entry.spec.name);
    }
    const stillNeeded = new Set(baselineNeededBy.keys());

    for (const entry of PIPELINE) {
        if (signal?.aborted) throw signal.reason ?? new Error('aborted');
        const schema = validate ? entry.checked : entry.unchecked;
        const sheet = loadView(entry.spec.name);
        const detectionCol = decodeCol(entry.spec.dataDetectionColumn);
        const dataRows = findAllDataRows(sheet, detectionCol, entry.spec.startRow);

        if (entry.tag === 'simple') {
            for (const r of dataRows) {
                const inputData = entry.parseRow(sheet, r);
                const result = v.safeParse(schema, inputData);
                if (result.success) {
                    yield { kind: entry.kind, row: result.output } as StreamedRow;
                } else if (validate) {
                    console.error(`Error: parsing ${entry.spec.name} row ${r}`, v.flatten(result.issues));
                    throw new Error(`Error: parsing ${entry.spec.name} row ${r}`);
                } else {
                    console.warn(`Skipping ${entry.spec.name} row ${r}: input shape failed`, v.flatten(result.issues));
                }
            }
        } else {
            const baselineSheet = loadView(entry.baselineSpec.name);
            for (const r of dataRows) {
                const inputData = entry.parseRow(baselineSheet, sheet, r);
                const result = v.safeParse(schema, inputData);
                if (result.success) {
                    yield { kind: entry.kind, row: result.output } as StreamedRow;
                } else if (validate) {
                    console.error(`Error: parsing ${entry.spec.name} row ${r}`, v.flatten(result.issues));
                    throw new Error(`Error: parsing ${entry.spec.name} row ${r}`);
                } else {
                    console.warn(`Skipping ${entry.spec.name} row ${r}: input shape failed`, v.flatten(result.issues));
                }
            }
            // Done with this baseline → drop it so the sparse row Map can be GC'd.
            stillNeeded.delete(entry.baselineSpec.name);
            dropView(entry.baselineSpec.name);
        }

        // Drop this sheet's view unless a later enhancement still needs it as a baseline.
        if (!stillNeeded.has(entry.spec.name)) dropView(entry.spec.name);
    }
}
