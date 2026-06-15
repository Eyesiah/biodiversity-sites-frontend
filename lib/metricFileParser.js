import { read, utils } from 'xlsx';
import { parseFile, tradingSummaries as computeTradingSummaries, headlineResults as computeHeadlineResults } from '@abitat/bng/browser';

function extractSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const allRows = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  return allRows.filter(
    (row) =>
      Array.isArray(row) &&
      row.some((cell) =>
        cell !== null && cell !== undefined && String(cell).trim() !== ''
      )
  );
}

function extractStartData(workbook) {
  return extractSheetRows(workbook, 'Start');
}

/**
 * Find the first workbook sheet whose name matches any of the given patterns
 * (tried in order: exact match, then case-insensitive, then keyword scan).
 * Returns the matched sheet name, or null if none found.
 */
function findSheetName(workbook, ...candidates) {
  const sheetNames = workbook.SheetNames ?? Object.keys(workbook.Sheets ?? {});
  // 1. Exact match
  for (const candidate of candidates) {
    if (sheetNames.includes(candidate)) return candidate;
  }
  // 2. Case-insensitive match
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const found = sheetNames.find(n => n.toLowerCase() === lower);
    if (found) return found;
  }
  // 3. Keyword scan — every word (>2 chars) in the candidate must appear in the sheet name
  for (const candidate of candidates) {
    const keywords = candidate.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    const found = sheetNames.find(n =>
      keywords.every(k => n.toLowerCase().includes(k))
    );
    if (found) return found;
  }
  return null;
}

/**
 * Read the 'Ref' column (column D) values from a habitat baseline or enhancement sheet,
 * matching the same data rows that @abitat/bng would parse (non-empty detect column).
 * The @abitat/bng parser uses `ref` internally for row lookups but does not
 * include it in the returned parsed row objects — this fills that gap.
 * For enhancement sheets the detect column header may read "Proposed Broad Habitat"
 * rather than "Broad Habitat", so we skip any header-like row where the cell
 * contains "broad habitat" (case-insensitive).
 */
function extractBaselineRefs(workbook, sheetName, detectColumn, refColumn, startRow = 10) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const refs = [];
  for (let row = startRow; row < startRow + 1000; row++) {
    const detectCell = sheet[`${detectColumn}${row}`];
    if (!detectCell) continue;
    const detectVal = String(detectCell.v ?? '').trim();
    // Skip empty cells and any header row that mentions "broad habitat"
    if (detectVal === '' || detectVal.toLowerCase().includes('broad habitat')) continue;
    const refCell = sheet[`${refColumn}${row}`];
    // Store as string so it displays as "13" rather than "13.00"
    refs.push(refCell != null ? String(refCell.v) : null);
  }
  return refs;
}

/**
 * Find and parse the Credits Required by Tier/Module table from the workbook.
 * Scans all sheets for one whose name contains "credit" (case-insensitive),
 * then locates the header row and extracts tier/credits pairs.
 */
function extractCreditsData(workbook) {
  const sheetNames = workbook.SheetNames ?? Object.keys(workbook.Sheets);

  // Scan every sheet for one that has a "Tier" + "Credits" header row —
  // do NOT rely on the sheet name, which varies between metric versions.
  let allRows = null;
  let headerRowIdx = -1;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    for (let i = 0; i < rows.length; i++) {
      const rowStr = rows[i].map((c) => String(c ?? '').toLowerCase()).join(' ');
      if (rowStr.includes('tier') && rowStr.includes('credit')) {
        allRows = rows;
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }

  if (!allRows || headerRowIdx === -1) return null;

  // Collect footnote (any row after data that starts with *)
  const tiers = [];
  let footnote = null;

  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    // Find first non-null cell
    const cells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (cells.length === 0) continue;

    const firstCell = String(cells[0]).trim();

    // Footnote line
    if (firstCell.startsWith('*')) {
      footnote = firstCell;
      continue;
    }

    // Tier row: first cell is a short code (A1–A5, H, W, etc.)
    // Second non-null cell should be the numeric credits value
    if (/^[A-Za-z0-9]{1,3}$/.test(firstCell) && cells.length >= 2) {
      const creditsRaw = cells[1];
      const credits = typeof creditsRaw === 'number' ? creditsRaw : parseFloat(String(creditsRaw).replace(/,/g, ''));
      tiers.push({
        tier: firstCell,
        creditsRequired: Number.isFinite(credits) ? credits : 0,
      });
    }
  }

  return tiers.length > 0 ? { tiers, footnote } : null;
}

/**
 * Parse a statutory biodiversity metric workbook (.xlsm/.xlsx) ArrayBuffer into
 * the data needed to render a full report: start sheet rows, headline results,
 * trading summaries, augmented feature rows, and credits summary.
 */
export async function parseMetricWorkbook(buffer) {
  // Read workbook for Start sheet data and ref value extraction.
  // Reading all sheets here (rather than just 'Start') so we can also
  // extract the 'Ref' column (col D) from the habitat baseline sheets —
  // the @abitat/bng parser uses ref internally but does not return it.
  const rawWorkbook = read(buffer, {
    cellDates: false,
    cellNF: false,
    cellHTML: false,
  });
  const startRows = extractStartData(rawWorkbook);

  // Parse all feature data rows using @abitat/bng
  const features = parseFile(buffer, { validate: false });

  // Augment baseline rows with the 'Ref' value from column D of each sheet
  const onSiteHabitatRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'A-1 On-Site Habitat Baseline', 'A-1 On-site Habitat Baseline'),
    'E', 'D', 10
  );
  const offSiteHabitatRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'D-1 Off-Site Habitat Baseline', 'D-1 Off-site Habitat Baseline'),
    'E', 'D', 10
  );

  // Augment enhancement rows with the 'Baseline Ref' value from each enhancement sheet.
  // Sheet names, detect columns, ref columns, and start rows are taken directly from the
  // @abitat/bng column mappings spec.  findSheetName falls back to keyword scan so that
  // minor naming variations between metric versions are tolerated.

  // A-3: baselineRef in col E, detect via col E, data starts at Excel row 12
  // (library's startRow:11 is 0-indexed → 1-indexed Excel row 12; row 11 is the column header)
  const onSiteHabitatEnhancementRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'A-3 On-Site Habitat Enhancement', 'A-3 On-site Habitat Enhancement'),
    'E', 'E', 12
  );
  // B-3: baselineRef in col B, detect via col B, data starts at Excel row 12
  const onSiteHedgerowEnhancementRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'B-3 On-Site Hedge Enhancement', 'B-3 On-Site Hedgerow Enhancement', 'B-3 On-site Hedge Enhancement'),
    'B', 'B', 12
  );
  // C-3: baselineRef in col B, detect via col N (watercourse type), data starts at Excel row 12
  const onSiteWatercourseEnhancementRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, "C-3 On-Site WaterC' Enhancement", 'C-3 On-Site Watercourse Enhancement', 'C-3 On-site Watercourse Enhancement'),
    'N', 'B', 12
  );
  // D-3: baselineRef in col E, detect via col E, data starts at Excel row 12
  // Note: official sheet name has a typo "Enhancment" – include both spellings.
  const offSiteHabitatEnhancementRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'D-3 Off-Site Habitat Enhancment', 'D-3 Off-Site Habitat Enhancement', 'D-3 Off-site Habitat Enhancement'),
    'E', 'E', 12
  );
  // E-3: baselineRef in col B, detect via col B, data starts at Excel row 12
  const offSiteHedgerowEnhancementRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'E-3 Off-Site Hedge Enhancement', 'E-3 Off-Site Hedgerow Enhancement', 'E-3 Off-site Hedge Enhancement'),
    'B', 'B', 12
  );
  // F-3: baselineRef in col B, detect via col AP (watercourse type), data starts at Excel row 12
  const offSiteWatercourseEnhancementRefs = extractBaselineRefs(
    rawWorkbook,
    findSheetName(rawWorkbook, 'F-3 Off-Site WaterC Enhancement', 'F-3 Off-Site Watercourse Enhancement', 'F-3 Off-site Watercourse Enhancement'),
    'AP', 'B', 12
  );

  const augmentedFeatures = {
    ...features,
    onSiteHabitatBaselines: features.onSiteHabitatBaselines.map((row, i) => ({
      ref: onSiteHabitatRefs[i] ?? null,
      ...row,
    })),
    offSiteHabitatBaselines: features.offSiteHabitatBaselines.map((row, i) => ({
      ref: offSiteHabitatRefs[i] ?? null,
      ...row,
    })),
    onSiteHabitatEnhancements: features.onSiteHabitatEnhancements.map((row, i) => ({
      ...row,
      baselineRef: onSiteHabitatEnhancementRefs[i] ?? row.baselineRef ?? null,
    })),
    onSiteHedgerowEnhancements: features.onSiteHedgerowEnhancements.map((row, i) => ({
      ...row,
      baselineRef: onSiteHedgerowEnhancementRefs[i] ?? row.baselineRef ?? null,
    })),
    onSiteWatercourseEnhancements: features.onSiteWatercourseEnhancements.map((row, i) => ({
      ...row,
      baselineRef: onSiteWatercourseEnhancementRefs[i] ?? row.baselineRef ?? null,
    })),
    offSiteHabitatEnhancements: features.offSiteHabitatEnhancements.map((row, i) => ({
      ...row,
      baselineRef: offSiteHabitatEnhancementRefs[i] ?? row.baselineRef ?? null,
    })),
    offSiteHedgerowEnhancements: features.offSiteHedgerowEnhancements.map((row, i) => ({
      ...row,
      baselineRef: offSiteHedgerowEnhancementRefs[i] ?? row.baselineRef ?? null,
    })),
    offSiteWatercourseEnhancements: features.offSiteWatercourseEnhancements.map((row, i) => ({
      ...row,
      baselineRef: offSiteWatercourseEnhancementRefs[i] ?? row.baselineRef ?? null,
    })),
  };

  // Extract credits summary from the credits sheet (if present)
  const creditsData = extractCreditsData(rawWorkbook);

  // Compute trading summaries and headline results from parsed features
  const ts = computeTradingSummaries(features);
  const hr = computeHeadlineResults(features, ts);

  return {
    startRows,
    hr,
    ts,
    features: augmentedFeatures,
    creditsData,
  };
}
