import { unzipSync, strFromU8 } from 'fflate';
import { decodeCol } from '../cellRef';
import type { SheetView } from '../excelHelpers';
import { MAX_DATA_ROWS } from '../excelHelpers';

export type CellValue = string | number | boolean | null;
export type SheetRows = Map<number, Map<number, CellValue>>;

const ENTITY_RE = /&(?:lt|gt|quot|apos|amp|#x?[0-9a-fA-F]+);/g;
function decodeEntity(m: string): string {
    switch (m) {
        case '&lt;': return '<';
        case '&gt;': return '>';
        case '&quot;': return '"';
        case '&apos;': return "'";
        case '&amp;': return '&';
    }
    if (m[2] === 'x' || m[2] === 'X') return String.fromCodePoint(parseInt(m.slice(3, -1), 16));
    return String.fromCodePoint(parseInt(m.slice(2, -1), 10));
}
function decodeXml(s: string): string {
    return s.indexOf('&') < 0 ? s : s.replace(ENTITY_RE, decodeEntity);
}

export function parseSharedStrings(xml: string): string[] {
    const out: string[] = [];
    const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let m: RegExpExecArray | null;
    while ((m = siRe.exec(xml)) !== null) {
        let text = '';
        let tm: RegExpExecArray | null;
        tRe.lastIndex = 0;
        while ((tm = tRe.exec(m[1]!)) !== null) text += tm[1]!;
        out.push(decodeXml(text));
    }
    return out;
}

export interface WorkbookIndex {
    /** Map of user-facing sheet name → zip entry path (e.g. "xl/worksheets/sheet1.xml") */
    sheetPath: Map<string, string>;
}

export function parseWorkbookIndex(workbookXml: string, relsXml: string): WorkbookIndex {
    const sheets: Array<{ name: string; rid: string }> = [];
    const sheetRe = /<sheet\b([^>]*?)\/?>/g;
    let m: RegExpExecArray | null;
    while ((m = sheetRe.exec(workbookXml)) !== null) {
        const attrs = m[1]!;
        const name = /\bname="([^"]*)"/.exec(attrs)?.[1];
        const rid = /\br:id="([^"]*)"/.exec(attrs)?.[1];
        if (name && rid) sheets.push({ name: decodeXml(name), rid });
    }

    const targetByRid = new Map<string, string>();
    const relRe = /<Relationship\b([^>]*?)\/?>/g;
    while ((m = relRe.exec(relsXml)) !== null) {
        const attrs = m[1]!;
        const id = /\bId="([^"]*)"/.exec(attrs)?.[1];
        const target = /\bTarget="([^"]*)"/.exec(attrs)?.[1];
        if (id && target) targetByRid.set(id, target);
    }

    const sheetPath = new Map<string, string>();
    for (const { name, rid } of sheets) {
        const target = targetByRid.get(rid);
        if (!target) continue;
        const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
        sheetPath.set(name, path);
    }
    return { sheetPath };
}

/**
 * Parse an xlsx worksheet XML into a sparse {row → {col → value}} map.
 * Only rows up to MAX_DATA_ROWS + a small header buffer are retained.
 */
export function parseWorksheet(xml: string, sharedStrings: string[], maxRow = MAX_DATA_ROWS + 20): SheetRows {
    const rows: SheetRows = new Map();
    const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
    const cellRe = /<c\b([^/>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(xml)) !== null) {
        const rowAttrMatch = /\br="(\d+)"/.exec(rm[1]!);
        if (!rowAttrMatch) continue;
        const rowIdx = Number(rowAttrMatch[1]) - 1;
        if (rowIdx >= maxRow) continue;

        const inner = rm[2]!;
        const cells = new Map<number, CellValue>();
        let cm: RegExpExecArray | null;
        cellRe.lastIndex = 0;
        while ((cm = cellRe.exec(inner)) !== null) {
            const attrs = cm[1]!;
            const body = cm[2] ?? '';
            const refMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
            if (!refMatch) continue;
            const col = decodeCol(refMatch[1]!);
            const t = /\bt="([^"]*)"/.exec(attrs)?.[1] ?? 'n';

            let value: CellValue = null;
            if (t === 's') {
                const v = /<v\b[^>]*>([^<]*)<\/v>/.exec(body)?.[1];
                if (v != null) value = sharedStrings[Number(v)] ?? null;
            } else if (t === 'inlineStr') {
                // <is><t>...</t></is> — concatenate all <t> children for rich text
                let text = '';
                const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
                let tm: RegExpExecArray | null;
                while ((tm = tRe.exec(body)) !== null) text += tm[1];
                value = decodeXml(text);
            } else if (t === 'str') {
                const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
                if (v != null) value = decodeXml(v);
            } else if (t === 'b') {
                const v = /<v\b[^>]*>([^<]*)<\/v>/.exec(body)?.[1];
                value = v === '1';
            } else if (t === 'e') {
                value = null;
            } else {
                // 'n' or default — number
                const v = /<v\b[^>]*>([^<]*)<\/v>/.exec(body)?.[1];
                if (v != null && v !== '') {
                    const n = Number(v);
                    value = Number.isFinite(n) ? n : null;
                }
            }
            cells.set(col, value);
        }
        rows.set(rowIdx, cells);
    }
    return rows;
}

export function sheetViewFromRows(rows: SheetRows): SheetView {
    return {
        getCell(row, col) {
            const r = rows.get(row);
            if (!r) return null;
            const v = r.get(col);
            return v === undefined ? null : v;
        },
    };
}

export type ParseFileStreamInput =
    | Uint8Array
    | ArrayBuffer
    | Blob
    | ReadableStream<Uint8Array>;

export async function toUint8Array(input: ParseFileStreamInput): Promise<Uint8Array> {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (typeof Blob !== 'undefined' && input instanceof Blob) return new Uint8Array(await input.arrayBuffer());
    // ReadableStream
    const reader = (input as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
}

/**
 * Two-pass loader:
 *  1. Decompress workbook.xml + rels to discover which worksheet entries we actually need.
 *  2. Decompress only the needed worksheets (plus sharedStrings.xml).
 *
 * Returns a function `takeWorksheet(path)` that returns and *removes* a sheet's
 * decompressed XML — the caller is expected to parse and drop it before
 * requesting the next, so peak memory stays bounded by a single sheet's XML.
 */
export function loadWorkbookEntries(data: Uint8Array, neededSheetPaths: (workbookXml: string, relsXml: string) => Set<string>): {
    workbookXml: string;
    relsXml: string;
    sharedStrings: string[];
    takeWorksheet(path: string): string | undefined;
} {
    // Pass 1: index
    const index = unzipSync(data, {
        filter: (f) => f.name === 'xl/workbook.xml' || f.name === 'xl/_rels/workbook.xml.rels',
    });
    const workbookBytes = index['xl/workbook.xml'];
    const relsBytes = index['xl/_rels/workbook.xml.rels'];
    if (!workbookBytes || !relsBytes) throw new Error('xlsx: missing workbook.xml or workbook rels');
    const workbookXml = strFromU8(workbookBytes);
    const relsXml = strFromU8(relsBytes);

    const needed = neededSheetPaths(workbookXml, relsXml);

    // Pass 2: only sharedStrings + the worksheets we need
    const entries = unzipSync(data, {
        filter: (f) => f.name === 'xl/sharedStrings.xml' || needed.has(f.name),
    });

    const sharedStringsBytes = entries['xl/sharedStrings.xml'];
    const sharedStrings = sharedStringsBytes ? parseSharedStrings(strFromU8(sharedStringsBytes)) : [];

    const sheetBytes = new Map<string, Uint8Array>();
    for (const path of needed) {
        const bytes = entries[path];
        if (bytes) sheetBytes.set(path, bytes);
    }

    return {
        workbookXml,
        relsXml,
        sharedStrings,
        takeWorksheet(path) {
            const bytes = sheetBytes.get(path);
            if (!bytes) return undefined;
            sheetBytes.delete(path);
            return strFromU8(bytes);
        },
    };
}
