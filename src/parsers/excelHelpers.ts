import XLSX, { utils } from 'xlsx';
import { Decimal } from '../decimal';
import { decodeCol } from './cellRef';

/**
 * Maximum number of rows to process in Excel sheets
 */
export const MAX_DATA_ROWS = 200;

/**
 * Backend-agnostic view onto a sheet. Implementations only have to return
 * the cell value at a given (row, col) — letter or 0-indexed integer for col.
 */
export interface SheetView {
    getCell(row: number, col: number): string | number | boolean | null;
}

function isSheetView(x: unknown): x is SheetView {
    return typeof x === 'object' && x !== null && typeof (x as SheetView).getCell === 'function';
}

/**
 * Cache for sheet data converted to array of arrays
 * Uses WeakMap so memory is freed when sheets are garbage collected
 */
const sheetDataCache = new WeakMap<XLSX.WorkSheet, any[][]>();

function sheetJsData(sheet: XLSX.WorkSheet): any[][] {
    let data = sheetDataCache.get(sheet);
    if (!data) {
        data = utils.sheet_to_json(
            sheet,
            {
                header: 1,
                raw: true,
                range: `A1:ZZ${MAX_DATA_ROWS}`,
            },
        ) as any[][];
        sheetDataCache.set(sheet, data);
    }
    return data;
}

/** Wrap a SheetJS WorkSheet as a SheetView so the rest of the parser stays backend-agnostic. */
export function sheetJsView(sheet: XLSX.WorkSheet): SheetView {
    return {
        getCell(row, col) {
            const data = sheetJsData(sheet);
            if (row < data.length && data[row] && col < data[row].length) {
                const value = data[row][col];
                return value === undefined ? null : value;
            }
            return null;
        },
    };
}

export function getSheet(workbook: XLSX.WorkBook, sheetName: string) {
    return workbook.Sheets[sheetName];
}

/**
 * Helper function to get cell value. Accepts either a SheetView (preferred,
 * used by the streaming path) or a SheetJS WorkSheet (back-compat).
 */
export function getCellValue(sheet: SheetView | XLSX.WorkSheet, row: number | string, col: number | string): any {
    const rowIndex = typeof row === 'number' ? row : utils.decode_row(row);
    const colIndex = typeof col === 'number' ? col : decodeCol(col);

    if (isSheetView(sheet)) return sheet.getCell(rowIndex, colIndex);

    const data = sheetJsData(sheet);
    if (rowIndex < data.length && data[rowIndex] && colIndex < data[rowIndex].length) {
        const value = data[rowIndex][colIndex];
        return value === undefined ? null : value;
    }
    return null;
}

/**
 * Helper to convert Excel true/false to boolean
 */
export function parseBoolean(value: any): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        return lower === "yes" || lower === "true" || lower === "y";
    }
    return false;
}

/**
 * Helper to normalize numeric values for comparison (handles floating point precision)
 */
export function normalizeNumber(value: any): number {
    if (typeof value === "number") {
        return new Decimal(value).toDecimalPlaces(8).toNumber();
    }
    return 0;
}

/**
 * Normalise a years cell. Returns a non-negative integer or the literal "30+",
 * defaulting to 0 for empty/non-numeric cells.
 */
export function normalizeYears(value: any): number | "30+" {
    if (typeof value === "string" && value.trim() === "30+") return "30+";
    return normalizeNumber(value);
}

/**
 * Find a specific row in a sheet by matching a value in a given column
 */
export function findRow(sheet: SheetView | XLSX.WorkSheet, columnToCheckPresence: number, value: unknown, maxRows: number = MAX_DATA_ROWS): number | null {
    for (let row = 0; row < maxRows; row++) {
        const cellValue = getCellValue(sheet, row, columnToCheckPresence);
        if (value === cellValue) return row;
    }
    return null;
}
