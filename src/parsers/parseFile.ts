import { read, readFile, type ParsingOptions, type WorkBook } from "xlsx";
import { decodeCol } from "./cellRef";
import { sheetJsView, type SheetView } from "./excelHelpers";
import * as v from 'valibot';
import {
    parseOnSiteHabitatBaselineRow,
    parseOnSiteHabitatCreationRow,
    parseOnSiteHabitatEnhancementRow,
    parseOffSiteHabitatBaselineRow,
    parseOffSiteHabitatCreationRow,
    parseOffSiteHabitatEnhancementRow,
    parseOnSiteHedgerowBaselineRow,
    parseOnSiteHedgerowCreationRow,
    parseOnSiteHedgerowEnhancementRow,
    parseOffSiteHedgerowBaselineRow,
    parseOffSiteHedgerowEnhancementRow,
    parseOffSiteHedgerowCreationRow,
    parseOnSiteWatercourseBaselineRow,
    parseOnSiteWatercourseCreationRow,
    parseOnSiteWatercourseEnhancementRow,
    parseOffSiteWatercourseBaselineRow,
    parseOffSiteWatercourseCreationRow,
    parseOffSiteWatercourseEnhancementRow
} from './rowParsers';
import { getCellValue, getSheet, MAX_DATA_ROWS } from "./excelHelpers";
import { onSiteHabitatBaselineSchema, onSiteHabitatBaselineUncheckedSchema } from "../onSite/habitatBaseline";
import { onSiteHabitatCreationSchema, onSiteHabitatCreationUncheckedSchema } from "../onSite/habitatCreation";
import { offSiteHabitatBaselineSchema, offSiteHabitatBaselineUncheckedSchema } from "../offSite/habitatBaseline";
import { offSiteHabitatCreationSchema, offSiteHabitatCreationUncheckedSchema } from "../offSite/habitatCreation";
import { onSiteHedgerowBaselineSchema, onSiteHedgerowBaselineUncheckedSchema } from "../onSite/hedgerowBaseline";
import { onSiteHedgerowCreationSchema, onSiteHedgerowCreationUncheckedSchema } from "../onSite/hedgerowCreation";
import { onSiteHedgerowEnhancementSchema, onSiteHedgerowEnhancementUncheckedSchema } from "../onSite/hedgerowEnhancement";
import { offSiteHedgerowBaselineSchema, offSiteHedgerowBaselineUncheckedSchema } from "../offSite/hedgerowBaseline";
import { offSiteHedgerowCreationSchema, offSiteHedgerowCreationUncheckedSchema } from "../offSite/hedgerowCreation";
import { offSiteHedgerowEnhancementSchema, offSiteHedgerowEnhancementUncheckedSchema } from "../offSite/hedgerowEnhancement";
import { type AllFeatures } from '../features';
import { onSiteHabitatEnhancementSchema, onSiteHabitatEnhancementUncheckedSchema } from "../onSite/habitatEnhancement";
import { offSiteHabitatEnhancementSchema, offSiteHabitatEnhancementUncheckedSchema } from "../offSite/habitatEnhancement";
import { onSiteWatercourseBaselineSchema, onSiteWatercourseBaselineUncheckedSchema } from "../onSite/watercourseBaseline";
import { onSiteWatercourseCreationSchema, onSiteWatercourseCreationUncheckedSchema } from "../onSite/watercourseCreation";
import { onSiteWatercourseEnhancementSchema, onSiteWatercourseEnhancementUncheckedSchema } from "../onSite/watercourseEnhancement";
import { offSiteWatercourseBaselineSchema, offSiteWatercourseBaselineUncheckedSchema } from "../offSite/watercourseBaseline";
import { offSiteWatercourseCreationSchema, offSiteWatercourseCreationUncheckedSchema } from "../offSite/watercourseCreation";
import { offSiteWatercourseEnhancementSchema, offSiteWatercourseEnhancementUncheckedSchema } from "../offSite/watercourseEnhancement";
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
    validateWorkbookHeaders,
    type SheetSpec,
} from './columnMappings';

const sheetsToGrab = [
    // 'Introduction',
    // 'Start',
    // 'Main Menu',
    // 'Unit shortfall summary',
    // 'Results',
    'Headline Results',
    // 'Detailed Results',
    'Trading Summary Area Habitats',
    'Trading Summary Hedgerows',
    "Trading Summary WaterC's",
    // 'Off-site gain site summary',
    // 'Irreplaceable Habitats',
    ...allSheetSpecs.map(s => s.name),
    'Unit shortfall calculations',
    // 'G-1 All Habitats',
    // 'G-2 Habitat groups',
    // 'G-3 Multipliers',
    // 'G-4 Temporal multipliers',
    // 'G-5 Enhancement Temporal',
    // 'G-6 Hedgerow Data',
    // "G-7 WaterC' Data",
    // 'G-8 Condition Look up',
    'Version History',
    // 'Phase 1 Translation Tool',
    // 'Technical Data',
    // 'Lists'
]

const options: ParsingOptions = {
    cellFormula: false,
    cellHTML: false,
    sheetRows: MAX_DATA_ROWS,
    sheets: sheetsToGrab,
}

/**
 * Parse a statutory metric file and get the underlying workbook object
 *
 * ```ts
// for local files
const workbook =  parseFile("MY_BNG_METRIC.xlsm");
// for in-memory files, like those in a website input field
const workbook = parseFile(await file.arrayBuffer());
```
 * Throws an error when required sheets or column headers are missing/mismatched.
 */
export function parseWorkbook(file: string | ArrayBuffer) {
    let workbook: WorkBook;

    if (typeof file === "string") {
        workbook = readFile(file, options);
    } else {
        workbook = read(file, options);
    }

    const validation = validateWorkbookHeaders(workbook);
    if (validation.missingSheets.length > 0 || validation.mismatches.length > 0) {
        throw new Error(`Unsupported metric layout:\n${formatValidationErrors(validation)}`);
    }

    return workbook
}

/**
 * Parse a statutory metric file and to get all parsed rows
 *
 * ```ts
// for local files
const localResults =  parseFile("MY_BNG_METRIC.xlsm");
// for in-memory files, like those in a website input field
const results = parseFile(await file.arrayBuffer());
```
 * Throws an error when the metric version is unsupported.
 */
export interface ParseFileOptions {
    /**
     * When true (default), every row is run through the full validating schema
     * (`v.check` business-logic guards included) and the first failure throws.
     *
     * When false, business-logic checks are skipped: each row passes through
     * the input shape parser (so picklists and field types are still parsed)
     * and then through the same enrichment/calculation transforms. If a
     * transform throws (e.g. an unknown habitat lookup), the row is passed on
     * with whatever fields had already been computed; downstream unit values
     * for that row will be `undefined`. Other rows are unaffected.
     *
     * Rows whose input shape itself can't be parsed (e.g. an unrecognised
     * picklist value) are logged and skipped.
     */
    validate?: boolean;
}

export function parseFile(file: string | ArrayBuffer, options: ParseFileOptions = {}): AllFeatures {
    const validate = options.validate !== false;
    const workbook = parseWorkbook(file);

    const schemas = validate ? checkedSchemas : uncheckedSchemas;

    const onSiteHabitatBaselines = parseAllRows(workbook, onSiteHabitatBaselineSpec, schemas.onSiteHabitatBaseline, parseOnSiteHabitatBaselineRow, validate);
    const onSiteHabitatCreations = parseAllRows(workbook, onSiteHabitatCreationSpec, schemas.onSiteHabitatCreation, parseOnSiteHabitatCreationRow, validate);
    const onSiteHabitatEnhancements = parseAllEnhancementRows(workbook, onSiteHabitatBaselineSpec, onSiteHabitatEnhancementSpec, schemas.onSiteHabitatEnhancement, parseOnSiteHabitatEnhancementRow, validate);

    const offSiteHabitatBaselines = parseAllRows(workbook, offSiteHabitatBaselineSpec, schemas.offSiteHabitatBaseline, parseOffSiteHabitatBaselineRow, validate);
    const offSiteHabitatCreations = parseAllRows(workbook, offSiteHabitatCreationSpec, schemas.offSiteHabitatCreation, parseOffSiteHabitatCreationRow, validate);
    const offSiteHabitatEnhancements = parseAllEnhancementRows(workbook, offSiteHabitatBaselineSpec, offSiteHabitatEnhancementSpec, schemas.offSiteHabitatEnhancement, parseOffSiteHabitatEnhancementRow, validate);

    const onSiteHedgerowBaselines = parseAllRows(workbook, onSiteHedgerowBaselineSpec, schemas.onSiteHedgerowBaseline, parseOnSiteHedgerowBaselineRow, validate);
    const onSiteHedgerowCreations = parseAllRows(workbook, onSiteHedgerowCreationSpec, schemas.onSiteHedgerowCreation, parseOnSiteHedgerowCreationRow, validate);
    const onSiteHedgerowEnhancements = parseAllEnhancementRows(workbook, onSiteHedgerowBaselineSpec, onSiteHedgerowEnhancementSpec, schemas.onSiteHedgerowEnhancement, parseOnSiteHedgerowEnhancementRow, validate);

    const offSiteHedgerowBaselines = parseAllRows(workbook, offSiteHedgerowBaselineSpec, schemas.offSiteHedgerowBaseline, parseOffSiteHedgerowBaselineRow, validate);
    const offSiteHedgerowCreations = parseAllRows(workbook, offSiteHedgerowCreationSpec, schemas.offSiteHedgerowCreation, parseOffSiteHedgerowCreationRow, validate);
    const offSiteHedgerowEnhancements = parseAllEnhancementRows(workbook, offSiteHedgerowBaselineSpec, offSiteHedgerowEnhancementSpec, schemas.offSiteHedgerowEnhancement, parseOffSiteHedgerowEnhancementRow, validate);

    const onSiteWatercourseBaselines = parseAllRows(workbook, onSiteWatercourseBaselineSpec, schemas.onSiteWatercourseBaseline, parseOnSiteWatercourseBaselineRow, validate);
    const onSiteWatercourseCreations = parseAllRows(workbook, onSiteWatercourseCreationSpec, schemas.onSiteWatercourseCreation, parseOnSiteWatercourseCreationRow, validate);
    const onSiteWatercourseEnhancements = parseAllEnhancementRows(workbook, onSiteWatercourseBaselineSpec, onSiteWatercourseEnhancementSpec, schemas.onSiteWatercourseEnhancement, parseOnSiteWatercourseEnhancementRow, validate);

    const offSiteWatercourseBaselines = parseAllRows(workbook, offSiteWatercourseBaselineSpec, schemas.offSiteWatercourseBaseline, parseOffSiteWatercourseBaselineRow, validate);
    const offSiteWatercourseCreations = parseAllRows(workbook, offSiteWatercourseCreationSpec, schemas.offSiteWatercourseCreation, parseOffSiteWatercourseCreationRow, validate);
    const offSiteWatercourseEnhancements = parseAllEnhancementRows(workbook, offSiteWatercourseBaselineSpec, offSiteWatercourseEnhancementSpec, schemas.offSiteWatercourseEnhancement, parseOffSiteWatercourseEnhancementRow, validate);

    // Create the input object
    const parsedRows: AllFeatures = {
        onSiteHabitatBaselines,
        onSiteHabitatCreations,
        onSiteHabitatEnhancements,
        offSiteHabitatBaselines,
        offSiteHabitatCreations,
        offSiteHabitatEnhancements,
        onSiteHedgerowBaselines,
        onSiteHedgerowCreations,
        onSiteHedgerowEnhancements,
        offSiteHedgerowBaselines,
        offSiteHedgerowCreations,
        offSiteHedgerowEnhancements,
        onSiteWatercourseBaselines,
        onSiteWatercourseCreations,
        onSiteWatercourseEnhancements,
        offSiteWatercourseBaselines,
        offSiteWatercourseCreations,
        offSiteWatercourseEnhancements,
    };


    // NOTE: various downstream implementations rely on this object being frozen
    // in order to cache computed results. Create a new version by spreading if necessary.
    return Object.freeze(parsedRows);
}
export default parseFile;

const checkedSchemas = {
    onSiteHabitatBaseline: onSiteHabitatBaselineSchema,
    onSiteHabitatCreation: onSiteHabitatCreationSchema,
    onSiteHabitatEnhancement: onSiteHabitatEnhancementSchema,
    offSiteHabitatBaseline: offSiteHabitatBaselineSchema,
    offSiteHabitatCreation: offSiteHabitatCreationSchema,
    offSiteHabitatEnhancement: offSiteHabitatEnhancementSchema,
    onSiteHedgerowBaseline: onSiteHedgerowBaselineSchema,
    onSiteHedgerowCreation: onSiteHedgerowCreationSchema,
    onSiteHedgerowEnhancement: onSiteHedgerowEnhancementSchema,
    offSiteHedgerowBaseline: offSiteHedgerowBaselineSchema,
    offSiteHedgerowCreation: offSiteHedgerowCreationSchema,
    offSiteHedgerowEnhancement: offSiteHedgerowEnhancementSchema,
    onSiteWatercourseBaseline: onSiteWatercourseBaselineSchema,
    onSiteWatercourseCreation: onSiteWatercourseCreationSchema,
    onSiteWatercourseEnhancement: onSiteWatercourseEnhancementSchema,
    offSiteWatercourseBaseline: offSiteWatercourseBaselineSchema,
    offSiteWatercourseCreation: offSiteWatercourseCreationSchema,
    offSiteWatercourseEnhancement: offSiteWatercourseEnhancementSchema,
} as const;

const uncheckedSchemas = {
    onSiteHabitatBaseline: onSiteHabitatBaselineUncheckedSchema,
    onSiteHabitatCreation: onSiteHabitatCreationUncheckedSchema,
    onSiteHabitatEnhancement: onSiteHabitatEnhancementUncheckedSchema,
    offSiteHabitatBaseline: offSiteHabitatBaselineUncheckedSchema,
    offSiteHabitatCreation: offSiteHabitatCreationUncheckedSchema,
    offSiteHabitatEnhancement: offSiteHabitatEnhancementUncheckedSchema,
    onSiteHedgerowBaseline: onSiteHedgerowBaselineUncheckedSchema,
    onSiteHedgerowCreation: onSiteHedgerowCreationUncheckedSchema,
    onSiteHedgerowEnhancement: onSiteHedgerowEnhancementUncheckedSchema,
    offSiteHedgerowBaseline: offSiteHedgerowBaselineUncheckedSchema,
    offSiteHedgerowCreation: offSiteHedgerowCreationUncheckedSchema,
    offSiteHedgerowEnhancement: offSiteHedgerowEnhancementUncheckedSchema,
    onSiteWatercourseBaseline: onSiteWatercourseBaselineUncheckedSchema,
    onSiteWatercourseCreation: onSiteWatercourseCreationUncheckedSchema,
    onSiteWatercourseEnhancement: onSiteWatercourseEnhancementUncheckedSchema,
    offSiteWatercourseBaseline: offSiteWatercourseBaselineUncheckedSchema,
    offSiteWatercourseCreation: offSiteWatercourseCreationUncheckedSchema,
    offSiteWatercourseEnhancement: offSiteWatercourseEnhancementUncheckedSchema,
} as const;

function parseAllRows<Schema extends v.BaseSchema<any, any, any>, Input extends v.InferInput<Schema>, Output extends v.InferOutput<Schema>>(
    workbook: WorkBook,
    spec: SheetSpec,
    schema: Schema,
    parseRow: (sheet: SheetView, row: number) => Input,
    throwOnFailure: boolean = true,
): Output[] {
    const sheet = sheetJsView(getSheet(workbook, spec.name)!);
    const detectionCol = decodeCol(spec.dataDetectionColumn);

    const dataRows = findAllDataRows(sheet, detectionCol, spec.startRow);
    const results: Output[] = [];

    for (const row of dataRows) {
        const inputData = parseRow(sheet, row);
        const result = v.safeParse(schema, inputData);

        if (result.success) {
            results.push(result.output);
        } else if (throwOnFailure) {
            console.error(`Error: parsing ${spec.name} row ${row}`, v.flatten(result.issues));
            throw new Error(`Error: parsing ${spec.name} row ${row}`);
        } else {
            console.warn(`Skipping ${spec.name} row ${row}: input shape failed`, v.flatten(result.issues));
        }
    }

    return results;
}

function parseAllEnhancementRows<Schema extends v.BaseSchema<any, any, any>, Input extends v.InferInput<Schema>, Output extends v.InferOutput<Schema>>(
    workbook: WorkBook,
    baselineSpec: SheetSpec,
    spec: SheetSpec,
    schema: Schema,
    parseRow: (baselineSheet: SheetView, sheet: SheetView, row: number) => Input,
    throwOnFailure: boolean = true,
): Output[] {
    const sheet = sheetJsView(getSheet(workbook, spec.name)!);
    const baselineSheet = sheetJsView(getSheet(workbook, baselineSpec.name)!);
    const detectionCol = decodeCol(spec.dataDetectionColumn);

    const dataRows = findAllDataRows(sheet, detectionCol, spec.startRow);
    const results: Output[] = [];

    for (const row of dataRows) {
        const inputData = parseRow(baselineSheet, sheet, row);
        const result = v.safeParse(schema, inputData);

        if (result.success) {
            results.push(result.output);
        } else if (throwOnFailure) {
            console.error(`Error: parsing ${spec.name} row ${row}`, v.flatten(result.issues));
            throw new Error(`Error: parsing ${spec.name} row ${row}`);
        } else {
            console.warn(`Skipping ${spec.name} row ${row}: input shape failed`, v.flatten(result.issues));
        }
    }

    return results;
}

const dataValueSchema = v.union([
    v.pipe(v.string(), v.trim(), v.minLength(1)),
    v.pipe(v.number()),
])

/**
 * Find all data rows in a sheet
 */
export function findAllDataRows(sheet: SheetView, columnToCheckPresence: number, startRow: number = 10, maxRows: number = MAX_DATA_ROWS): number[] {
    const dataRows: number[] = [];
    let consecutiveEmpty = 0;
    for (let row = startRow; row < startRow + maxRows; row++) {
        const value = getCellValue(sheet, row, columnToCheckPresence);
        const parsed = v.safeParse(dataValueSchema, value);
        if (parsed.success && parsed.output !== "Broad Habitat") {
            dataRows.push(row);
            consecutiveEmpty = 0;
        } else {
            consecutiveEmpty++;
            if (consecutiveEmpty > 10) break; // Stop after 10 empty rows
        }
    }
    return dataRows;
}
