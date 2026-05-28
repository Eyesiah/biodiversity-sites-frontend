'use client'

import { useState, useCallback, useRef } from 'react';
import { read, utils } from 'xlsx';
import { parseFile, tradingSummaries as computeTradingSummaries, headlineResults as computeHeadlineResults, cumulativeBroadHabitatChange } from '@abitat/bng/browser';
import {
  Box, Text, VStack, HStack, Heading, Badge, Tabs, Spinner, SimpleGrid,
} from '@chakra-ui/react';
import { PrimaryCard, TableContainer } from '@/components/styles/PrimaryCard';
import { DataTable } from '@/components/styles/DataTable';
import Button from '@/components/styles/Button';
import { useSortableData } from '@/lib/hooks';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';

// ============================================================
// COLUMN DEFINITIONS
// ============================================================

const HABITAT_BASELINE_COLS = [
  { key: 'ref', label: 'Habitat Reference', centered: true },
  { key: 'broadHabitat', label: 'Broad Habitat' },
  { key: 'habitatType', label: 'Habitat Type' },
  { key: 'irreplaceableHabitat', label: 'Irreplaceable', centered: true },
  { key: 'area', label: 'Area (ha)' },
  { key: 'areaRetained', label: 'Area Retained' },
  { key: 'areaEnhanced', label: 'Area Enhanced' },
  { key: 'areaHabitatLost', label: 'Area Habitat Lost' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'totalHabitatUnits', label: 'Total Habitat Units' },
  { key: 'baselineUnitsRetained', label: 'Baseline Units Retained' },
  { key: 'baselineUnitsEnhanced', label: 'Baseline Units Enhanced' },
  { key: 'unitsLost', label: 'Units Lost' },
];

const IRREPLACEABLE_HABITAT_COLS = [
  { key: 'ref', label: 'Habitat Reference', centered: true },
  { key: 'habitatType', label: 'Metric Habitat Type' },
  { key: 'irreplaceableHabitatName', label: 'Irreplaceable Habitat Name' },
  { key: 'area', label: 'Total Area at Baseline (ha)' },
  { key: 'areaRetained', label: 'Area Retained' },
  { key: 'areaEnhanced', label: 'Area Enhanced' },
  { key: 'areaHabitatLost', label: 'Area Lost' },
  { key: 'bespokeCompensationAgreed', label: 'Bespoke Compensation Agreed for Losses?' },
  { key: 'userComments', label: 'User Comments' },
  { key: 'planningAuthorityComments', label: 'Planning Authority Comments' },
  { key: 'habitatReferenceNumber', label: 'Habitat Reference Number', centered: true },
];

const HABITAT_CREATION_COLS = [
  { key: 'broadHabitat', label: 'Broad Habitat' },
  { key: 'habitatType', label: 'Proposed Habitat' },
  { key: 'area', label: 'Area (ha)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'habitatUnitsDelivered', label: 'Units Delivered' },
];

const HABITAT_ENHANCEMENT_COLS = [
  { key: 'baselineRef', label: 'Baseline Ref', centered: true },
  { key: 'broadHabitat', label: 'Proposed Broad Habitat' },
  { key: 'habitatType', label: 'Proposed Habitat' },
  { key: 'area', label: 'Area (ha)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'habitatUnitsDelivered', label: 'Units Delivered' },
];

const HEDGEROW_BASELINE_COLS = [
  { key: 'habitatType', label: 'Hedgerow Type' },
  { key: 'length', label: 'Length (km)' },
  { key: 'lengthRetained', label: 'Length Retained' },
  { key: 'lengthEnhanced', label: 'Length Enhanced' },
  { key: 'lengthLost', label: 'Length Lost' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'totalHedgerowUnits', label: 'Total Hedgerow Units' },
  { key: 'unitsRetained', label: 'Units Retained' },
  { key: 'unitsEnhanced', label: 'Units Enhanced' },
  { key: 'unitsLost', label: 'Units Lost' },
];

const HEDGEROW_CREATION_COLS = [
  { key: 'habitatType', label: 'Hedgerow Type' },
  { key: 'length', label: 'Length (km)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'hedgerowUnitsDelivered', label: 'Units Delivered' },
];

const HEDGEROW_ENHANCEMENT_COLS = [
  { key: 'baselineRef', label: 'Baseline Ref', centered: true },
  { key: 'habitatType', label: 'Hedgerow Type' },
  { key: 'length', label: 'Length (km)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'hedgerowUnitsDelivered', label: 'Units Delivered' },
];

const WATERCOURSE_BASELINE_COLS = [
  { key: 'habitatType', label: 'Watercourse Type' },
  { key: 'length', label: 'Length (km)' },
  { key: 'lengthRetained', label: 'Length Retained' },
  { key: 'lengthEnhanced', label: 'Length Enhanced' },
  { key: 'lengthLost', label: 'Length Lost' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'totalWatercourseUnits', label: 'Total Watercourse Units' },
  { key: 'unitsRetained', label: 'Units Retained' },
  { key: 'unitsEnhanced', label: 'Units Enhanced' },
  { key: 'unitsLost', label: 'Units Lost' },
];

const WATERCOURSE_CREATION_COLS = [
  { key: 'habitatType', label: 'Watercourse Type' },
  { key: 'length', label: 'Length (km)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'watercourseUnitsDelivered', label: 'Units Delivered' },
];

const WATERCOURSE_ENHANCEMENT_COLS = [
  { key: 'baselineRef', label: 'Baseline Ref', centered: true },
  { key: 'habitatType', label: 'Watercourse Type' },
  { key: 'length', label: 'Length (km)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'watercourseUnitsDelivered', label: 'Units Delivered' },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatCellValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '—';
    return val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const str = String(val).trim();
  return str === '' ? '—' : str;
}

/** Re-format a plain numeric string to 2 decimal places with en-GB locale. */
function fmt2dp(cellStr) {
  const n = parseFloat(cellStr.replace(/,/g, ''));
  if (!Number.isFinite(n)) return cellStr;
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

function countFeatureRows(features) {
  return Object.values(features).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );
}

// ============================================================
// FEATURE TABLE (with sortable column headers + comments modal)
// ============================================================

const COMMENT_FIELDS = [
  { key: 'habitatReferenceNumber', label: 'Habitat Reference Number', inline: true },
  { key: 'userComments', label: 'User Comments' },
  { key: 'planningAuthorityComments', label: 'Planning Authority Comments' },
];

function FeatureTable({ rows, columns, hideComments = false }) {
  const { items: sortedRows, requestSort, getSortIndicator } = useSortableData(
    rows || []
  );
  const [selectedRow, setSelectedRow] = useState(null);

  if (!rows || rows.length === 0) {
    return (
      <Box py={3}>
        <Text color="fg.muted" fontStyle="italic" fontSize="sm">
          No data rows found for this section.
        </Text>
      </Box>
    );
  }

  // Only show the comments modal column if enabled and at least one row has comments
  const hasAnyComments = !hideComments && sortedRows.some((row) =>
    COMMENT_FIELDS.some(({ key }) => row[key] && String(row[key]).trim() !== '')
  );

  const getRowTitle = (row) => {
    const label = row.habitatType || row.broadHabitat || '';
    return label || 'Habitat Row';
  };

  return (
    <>
      <TableContainer>
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader width="3rem" textAlign="center">
                #
              </DataTable.ColumnHeader>
              {columns.map((col) => (
                <DataTable.ColumnHeader
                  key={col.key}
                  onClick={() => requestSort(col.key)}
                >
                  {col.label}{getSortIndicator(col.key)}
                </DataTable.ColumnHeader>
              ))}
              {hasAnyComments && (
                <DataTable.ColumnHeader width="3rem" textAlign="center" title="Comments">
                  💬
                </DataTable.ColumnHeader>
              )}
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {sortedRows.map((row, i) => {
              const rowComments = COMMENT_FIELDS.reduce((acc, { key, label, inline }) => {
                const v = row[key] ? String(row[key]).trim() : '';
                if (v) acc.push({ label, text: v, inline });
                return acc;
              }, []);
              const hasComments = rowComments.length > 0;

              return (
                <DataTable.Row key={i}>
                  <DataTable.CenteredNumericCell color="fg.muted" fontWeight="500">
                    {i + 1}
                  </DataTable.CenteredNumericCell>
                  {columns.map((col) => {
                    const val = row[col.key];
                    const isNumeric = typeof val === 'number' && Number.isFinite(val);
                    if (isNumeric) {
                      return (
                        <DataTable.CenteredNumericCell
                          key={col.key}
                          color={val < 0 ? 'red.600' : undefined}
                        >
                          {formatCellValue(val)}
                        </DataTable.CenteredNumericCell>
                      );
                    }
                    if (col.centered) {
                      return (
                        <DataTable.Cell key={col.key} textAlign="center">
                          {formatCellValue(val)}
                        </DataTable.Cell>
                      );
                    }
                    return (
                      <DataTable.Cell key={col.key}>
                        {formatCellValue(val)}
                      </DataTable.Cell>
                    );
                  })}
                  {hasAnyComments && (
                    <DataTable.Cell textAlign="center" padding="0.25rem">
                      {hasComments && (
                        <Box
                          as="button"
                          fontSize="1rem"
                          lineHeight="1"
                          cursor="pointer"
                          bg="transparent"
                          border="none"
                          padding="0.25rem"
                          borderRadius="sm"
                          title="View comments"
                          onClick={() => setSelectedRow({ title: getRowTitle(row), comments: rowComments })}
                          _hover={{ bg: 'tableHoverBg', transform: 'scale(1.15)' }}
                          transition="all 0.15s"
                        >
                          💬
                        </Box>
                      )}
                    </DataTable.Cell>
                  )}
                </DataTable.Row>
              );
            })}
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>

      {selectedRow && (
        <Modal
          show={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          title={`Comments — ${selectedRow.title}`}
          size="md"
        >
          <Box bg="bg" color="fg" padding="1rem" borderRadius="md">
            {selectedRow.comments.map(({ label, text, inline }, idx) => (
              <Box key={label} mb={idx < selectedRow.comments.length - 1 ? 4 : 0}>
                {inline ? (
                  <Text fontSize="0.95rem">
                    <Text as="span" fontWeight="600">{label}: </Text>
                    {text}
                  </Text>
                ) : (
                  <>
                    <Text fontWeight="600" mb={1} fontSize="0.95rem">{label}</Text>
                    <Text fontSize="0.95rem" lineHeight="1.6">{text}</Text>
                  </>
                )}
              </Box>
            ))}
          </Box>
        </Modal>
      )}
    </>
  );
}

// ============================================================
// SECTION BLOCK (header + table)
// ============================================================

function SectionBlock({ title, rows, columns, hideComments = false }) {
  const count = rows ? rows.length : 0;
  return (
    <Box mb={8}>
      <HStack mb={3} gap={2} alignItems="center">
        <Heading as="h3" size="sm" color="fg">
          {title}
        </Heading>
        <Badge
          colorPalette={count > 0 ? 'green' : 'gray'}
          variant="subtle"
          fontSize="xs"
        >
          {count} row{count !== 1 ? 's' : ''}
        </Badge>
      </HStack>
      <FeatureTable rows={rows || []} columns={columns} hideComments={hideComments} />
    </Box>
  );
}

// ============================================================
// START SHEET TABLE (flat display of raw sheet data)
// ============================================================

function StartDataTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <Text color="fg.muted" fontStyle="italic" fontSize="sm">
        No data found in the Start sheet.
      </Text>
    );
  }

  const maxCols = Math.min(
    Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0))),
    10
  );

  return (
    <TableContainer>
      <DataTable.Root>
        <DataTable.Body>
          {rows.map((row, rowIdx) => {
            const cells = Array.from({ length: maxCols }, (_, colIdx) => {
              const val = row[colIdx];
              return val !== null && val !== undefined ? String(val).trim() : '';
            });
            const isLabelRow = cells[0] !== '' && cells[1] === '' && cells[2] === '';
            return (
              <DataTable.Row key={rowIdx}>
                {cells.map((cellStr, colIdx) => {
                  const isNumeric = cellStr !== '' && !isNaN(parseFloat(cellStr)) && isFinite(cellStr.replace(/,/g, ''));
                  const isPercent = /^-?[\d,.]+%$/.test(cellStr.trim());
                  const isNegative = (isNumeric && parseFloat(cellStr) < 0) || (isPercent && cellStr.startsWith('-'));
                  const isCentred = isNumeric || isPercent;
                  return (
                    <DataTable.Cell
                      key={colIdx}
                      textAlign={isCentred ? 'center' : 'left'}
                      fontFamily={isCentred ? 'mono' : undefined}
                      color={isNegative ? 'red.600' : undefined}
                      fontWeight={
                        isLabelRow && colIdx === 0 ? '800'
                        : !isNumeric && cellStr && colIdx <= 1 ? '500'
                        : 'normal'
                      }
                    >
                      {isNumeric ? fmt2dp(cellStr) : cellStr}
                    </DataTable.Cell>
                  );
                })}
              </DataTable.Row>
            );
          })}
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
  );
}

// ============================================================
// COMPUTED HEADLINE RESULTS
// Uses the headlineResults() function from @abitat/bng
// ============================================================

function ComputedHeadlineResults({ hr }) {
  if (!hr) {
    return (
      <Text color="fg.muted" fontStyle="italic" fontSize="sm">
        No headline results available.
      </Text>
    );
  }

  const fmtN = (n) => {
    if (n === undefined || n === null || (typeof n === 'string' && n === 'N/A')) return '—';
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtP = (n) => {
    if (!Number.isFinite(n)) return '—';
    return `${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };
  const numColor = (n) => (typeof n === 'number' && n < 0 ? 'red.600' : undefined);
  const pctColor = (n) => (typeof n === 'number' && n < 0 ? 'red.600' : n > 0 ? 'green.600' : undefined);

  const NC = ({ v }) => (
    <DataTable.CenteredNumericCell color={numColor(v)} fontSize="0.875rem">{fmtN(v)}</DataTable.CenteredNumericCell>
  );
  const PC = ({ v }) => (
    <DataTable.CenteredNumericCell color={pctColor(v)} fontSize="0.875rem">{fmtP(v)}</DataTable.CenteredNumericCell>
  );

  const LabelCell = ({ children, subtitle, isFinal }) => (
    <DataTable.Cell fontWeight={isFinal ? '700' : '600'} fontSize="0.9rem">
      {children}
      {subtitle && <Text as="span" display="block" fontSize="0.72rem" fontWeight="400" color="fg.muted" mt="2px" fontStyle="italic">{subtitle}</Text>}
    </DataTable.Cell>
  );

  const SepRow = () => (
    <DataTable.Row><DataTable.Cell colSpan={4} py={1} borderBottom="2px solid" borderBottomColor="subtleBorder" /></DataTable.Row>
  );
  const FinalHeader = () => (
    <DataTable.Row>
      <DataTable.Cell colSpan={4} bg="brand.500" color="white" fontWeight="900" textAlign="center" py={2} fontSize="1rem">
        FINAL RESULTS
      </DataTable.Cell>
    </DataTable.Row>
  );

  return (
    <VStack gap={4} align="start" width="100%">
      <TableContainer width="100%">
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader textAlign="left" fontWeight="700">Section</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Area habitat units</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Hedgerow units</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Watercourse units</DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            <DataTable.Row><LabelCell>On-site baseline</LabelCell><NC v={hr.onSiteHabitatBaseline} /><NC v={hr.onSiteHedgerowBaseline} /><NC v={hr.onSiteWatercourseBaseline} /></DataTable.Row>
            <DataTable.Row><LabelCell subtitle="Including habitat retention, creation & enhancement">On-site post-intervention</LabelCell><NC v={hr.onSiteHabitatPostIntervention} /><NC v={hr.onSiteHedgerowPostIntervention} /><NC v={hr.onSiteWatercoursePostIntervention} /></DataTable.Row>
            <DataTable.Row><LabelCell subtitle="units">On-site net change</LabelCell><NC v={hr.onSiteHabitatNetChange.units} /><NC v={hr.onSiteHedgerowNetChange.units} /><NC v={hr.onSiteWatercourseNetChange.units} /></DataTable.Row>
            <DataTable.Row><LabelCell subtitle="percentage">On-site net change</LabelCell><PC v={hr.onSiteHabitatNetChange.percentage} /><PC v={hr.onSiteHedgerowNetChange.percentage} /><PC v={hr.onSiteWatercourseNetChange.percentage} /></DataTable.Row>
            <SepRow />
            <DataTable.Row><LabelCell>Off-site baseline</LabelCell><NC v={hr.offSiteHabitatBaseline} /><NC v={hr.offSiteHedgerowBaseline} /><NC v={hr.offSiteWatercourseBaseline} /></DataTable.Row>
            <DataTable.Row><LabelCell subtitle="Including habitat retention, creation & enhancement">Off-site post-intervention</LabelCell><NC v={hr.offSiteHabitatPostIntervention} /><NC v={hr.offSiteHedgerowPostIntervention} /><NC v={hr.offSiteWatercoursePostIntervention} /></DataTable.Row>
            <DataTable.Row><LabelCell subtitle="units">Off-site net change</LabelCell><NC v={hr.offSiteHabitatNetChange.units} /><NC v={hr.offSiteHedgerowNetChange.units} /><NC v={hr.offSiteWatercourseNetChange.units} /></DataTable.Row>
            <DataTable.Row><LabelCell subtitle="percentage">Off-site net change</LabelCell><PC v={hr.offSiteHabitatNetChange.percentage} /><PC v={hr.offSiteHedgerowNetChange.percentage} /><PC v={hr.offSiteWatercourseNetChange.percentage} /></DataTable.Row>
            <SepRow />
            <DataTable.Row><LabelCell subtitle="Including all on-site & off-site habitat retention, creation & enhancement">Combined net unit change</LabelCell><NC v={hr.combinedNetUnitChange.habitat} /><NC v={hr.combinedNetUnitChange.hedgerow} /><NC v={hr.combinedNetUnitChange.watercourse} /></DataTable.Row>
            <DataTable.Row><LabelCell>Spatial risk multiplier (SRM) deductions</LabelCell><NC v={hr.totalSRMDeductions.habitat} /><NC v={hr.totalSRMDeductions.hedgerow} /><NC v={hr.totalSRMDeductions.watercourse} /></DataTable.Row>
            <FinalHeader />
            <DataTable.Row bg="rgba(184,161,98,0.12)"><LabelCell subtitle="Including all on-site & off-site habitat retention, creation & enhancement" isFinal>Total net unit change</LabelCell><NC v={hr.totalNetUnitChange.habitat} /><NC v={hr.totalNetUnitChange.hedgerow} /><NC v={hr.totalNetUnitChange.watercourse} /></DataTable.Row>
            <DataTable.Row bg="rgba(184,161,98,0.12)"><LabelCell subtitle="Including all on-site & off-site habitat retention, creation & enhancement" isFinal>Total net % change</LabelCell><PC v={hr.totalNetPercentageChange.habitat * 100} /><PC v={hr.totalNetPercentageChange.hedgerow * 100} /><PC v={hr.totalNetPercentageChange.watercourse * 100} /></DataTable.Row>
            <DataTable.Row bg="rgba(184,161,98,0.12)">
              <DataTable.Cell fontWeight="700">Trading rules satisfied?</DataTable.Cell>
              <DataTable.Cell colSpan={3} textAlign="center" fontWeight="700" color={hr.tradingRulesSatisfied ? 'green.600' : 'red.600'}>
                {hr.tradingRulesSatisfied ? '✓ Yes — Trading Rules Satisfied' : '✗ No — Check Trading Summaries'}
              </DataTable.Cell>
            </DataTable.Row>
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>

      {/* Unit deficit summary */}
      <Heading as="h3" size="sm" mt={2}>Unit Deficit Summary</Heading>
      <TableContainer width="100%">
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader textAlign="left" fontWeight="700">Unit Type</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Target</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Baseline Units</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Units Required</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Unit Deficit</DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {[
              { label: 'Area habitat units', s: hr.habitatUnitSummary },
              { label: 'Hedgerow units', s: hr.hedgerowUnitSummary },
              { label: 'Watercourse units', s: hr.watercourseUnitSummary },
            ].map(({ label, s }) => (
              <DataTable.Row key={label}>
                <DataTable.Cell fontStyle="italic">{label}</DataTable.Cell>
                <DataTable.CenteredNumericCell>{fmtP(s.target)}</DataTable.CenteredNumericCell>
                <DataTable.CenteredNumericCell>{fmtN(s.baselineUnits)}</DataTable.CenteredNumericCell>
                <DataTable.CenteredNumericCell>{fmtN(s.requiredUnits)}</DataTable.CenteredNumericCell>
                <DataTable.CenteredNumericCell color={s.unitDeficit > 0 ? 'red.600' : undefined}>{fmtN(s.unitDeficit)}</DataTable.CenteredNumericCell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>
    </VStack>
  );
}

// ============================================================
// COMPUTED TRADING SUMMARIES
// Uses the tradingSummaries() function from @abitat/bng
// ============================================================

/** Human-readable labels for trading summary detail fields */
const DETAIL_LABEL_MAP = {
  unitsAvailableToOffsetDownwards: 'Units available to offset downwards',
  unitsAvailableToOffsetUpwards:   'Units available to offset upwards (losses)',
  remainingLosses:                 'Remaining losses',
  surplusUnitsMinusDeficit:        'Surplus units minus deficit',
  cumulativeSurplus:               'Cumulative surplus / deficit',
  netChangeInUnits:                'Net change in units',
};

/**
 * The key fields that determine pass/fail per band — highlighted prominently
 * when the band is not satisfied.
 */
const KEY_METRIC_FIELDS = new Set([
  'remainingLosses',
  'cumulativeSurplus',
  'surplusUnitsMinusDeficit',
]);

/**
 * Compute net unit change per habitat type from raw feature rows.
 * Used for hedgerow and watercourse shortfall breakdowns.
 */
function computeTypeNetChanges(allBaselines, allCreations, allEnhancements, deliveredKey) {
  const map = {};
  const add = (type, val) => { map[type] = (map[type] ?? 0) + (val ?? 0); };
  for (const row of allBaselines)    add(row.habitatType || 'Unknown', -(row.unitsLost ?? 0));
  for (const row of allCreations)    add(row.habitatType || 'Unknown', row[deliveredKey] ?? 0);
  for (const row of allEnhancements) add(row.habitatType || 'Unknown', row[deliveredKey] ?? 0);
  return map;
}

/**
 * Alert panel that appears at the top of the Trading Summary tab whenever one
 * or more distinctiveness bands are not satisfied.  For each failing band it
 * shows a table of habitat/hedgerow/watercourse groups with their cumulative
 * unit change across the whole project (on-site + off-site).
 *
 * Area habitats use the library's exported `cumulativeBroadHabitatChange()`
 * which matches the exact values used internally by `tradingSummaries()`.
 * Hedgerows and watercourses are aggregated directly from the feature rows.
 */
function ShortfallAlertPanel({ ts, features }) {
  const { habitats: h, hedgerows: hr, watercourses: wc } = ts;

  const habitatBands = [
    { key: 'vHigh',  label: 'Very High Distinctiveness', satisfied: h.vHighSatisfied,  category: 'V.High'  },
    { key: 'high',   label: 'High Distinctiveness',      satisfied: h.highSatisfied,   category: 'High'    },
    { key: 'medium', label: 'Medium Distinctiveness',    satisfied: h.mediumSatisfied, category: 'Medium'  },
    { key: 'low',    label: 'Low Distinctiveness',       satisfied: h.lowSatisfied,    category: 'Low'     },
  ];
  const hedgerowBands = [
    { key: 'vHigh',  label: 'Very High Distinctiveness', satisfied: hr.vHighSatisfied  },
    { key: 'high',   label: 'High Distinctiveness',      satisfied: hr.highSatisfied   },
    { key: 'medium', label: 'Medium Distinctiveness',    satisfied: hr.mediumSatisfied },
    { key: 'low',    label: 'Low Distinctiveness',       satisfied: hr.lowSatisfied    },
    { key: 'vLow',   label: 'Very Low Distinctiveness',  satisfied: hr.vLowSatisfied   },
  ];
  const watercourseBands = [
    { key: 'vHigh',  label: 'Very High Distinctiveness', satisfied: wc.vHighSatisfied  },
    { key: 'high',   label: 'High Distinctiveness',      satisfied: wc.highSatisfied   },
    { key: 'medium', label: 'Medium Distinctiveness',    satisfied: wc.mediumSatisfied },
    { key: 'low',    label: 'Low Distinctiveness',       satisfied: wc.lowSatisfied    },
  ];

  const failingHabitat     = habitatBands.filter(b => !b.satisfied);
  const failingHedgerow    = hedgerowBands.filter(b => !b.satisfied);
  const failingWatercourse = watercourseBands.filter(b => !b.satisfied);

  if (!failingHabitat.length && !failingHedgerow.length && !failingWatercourse.length) return null;

  // Per-band broad-habitat cumulative changes (area habitats only)
  const habitatBandGroups = {};
  for (const band of failingHabitat) {
    habitatBandGroups[band.key] = cumulativeBroadHabitatChange(features, band.category);
  }

  // Net change per type for hedgerows and watercourses
  const hedgerowTypeChanges = computeTypeNetChanges(
    [...(features.onSiteHedgerowBaselines  ?? []), ...(features.offSiteHedgerowBaselines  ?? [])],
    [...(features.onSiteHedgerowCreations  ?? []), ...(features.offSiteHedgerowCreations  ?? [])],
    [...(features.onSiteHedgerowEnhancements ?? []), ...(features.offSiteHedgerowEnhancements ?? [])],
    'hedgerowUnitsDelivered'
  );
  const watercourseTypeChanges = computeTypeNetChanges(
    [...(features.onSiteWatercourseBaselines  ?? []), ...(features.offSiteWatercourseBaselines  ?? [])],
    [...(features.onSiteWatercourseCreations  ?? []), ...(features.offSiteWatercourseCreations  ?? [])],
    [...(features.onSiteWatercourseEnhancements ?? []), ...(features.offSiteWatercourseEnhancements ?? [])],
    'watercourseUnitsDelivered'
  );

  const fmtN = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

  const renderGroupTable = (groupChanges) => {
    const entries = Object.entries(groupChanges).filter(([, v]) => Number.isFinite(v) && v !== 0);
    if (entries.length === 0) {
      return (
        <Text fontSize="sm" color="fg.muted" fontStyle="italic" mt={1}>
          No data rows found for this band.
        </Text>
      );
    }
    return (
      <TableContainer mt={2}>
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader textAlign="left">Habitat Group</DataTable.ColumnHeader>
              <DataTable.ColumnHeader textAlign="center">Cumulative Unit Change</DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {entries.map(([group, change]) => (
              <DataTable.Row key={group}>
                <DataTable.Cell fontSize="sm">{group}</DataTable.Cell>
                <DataTable.CenteredNumericCell
                  fontSize="sm"
                  fontWeight={change < 0 ? '700' : 'normal'}
                  color={change < 0 ? 'red.600' : 'green.600'}
                >
                  {fmtN(change)}
                </DataTable.CenteredNumericCell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>
    );
  };

  const renderBandBlock = (band, groupChanges, sectionLabel) => (
    <Box
      key={`${sectionLabel}-${band.key}`}
      mb={4}
      p={4}
      bg="bg"
      borderRadius="md"
      border="1px solid"
      borderColor="red.200"
    >
      <Text fontWeight="700" color="red.700" fontSize="sm" mb={1}>
        ✗ {sectionLabel} — {band.label}
      </Text>
      {renderGroupTable(groupChanges)}
    </Box>
  );

  return (
    <Box mb={8} p={5} bg="red.subtle" borderRadius="lg" border="1px solid" borderColor="red.300">
      <HStack mb={3} gap={2} alignItems="center">
        <Text fontSize="xl" lineHeight="1">⚠️</Text>
        <Heading as="h3" size="md" color="red.700">Trading Rule Shortfalls</Heading>
      </HStack>
      <Text fontSize="sm" color="red.700" mb={5}>
        One or more distinctiveness bands are not satisfied. The tables below show the cumulative
        unit change by broad habitat group across the whole project (on-site and off-site combined)
        for each failing band.
      </Text>

      {failingHabitat.length > 0 && (
        <Box mb={5}>
          <Heading as="h4" size="sm" mb={3} color="red.800">Area Habitats</Heading>
          {failingHabitat.map(band =>
            renderBandBlock(band, habitatBandGroups[band.key] ?? {}, 'Area Habitats')
          )}
        </Box>
      )}

      {failingHedgerow.length > 0 && (
        <Box mb={5}>
          <Heading as="h4" size="sm" mb={3} color="red.800">Hedgerow Habitats</Heading>
          {failingHedgerow.map(band =>
            renderBandBlock(band, hedgerowTypeChanges, 'Hedgerow Habitats')
          )}
        </Box>
      )}

      {failingWatercourse.length > 0 && (
        <Box>
          <Heading as="h4" size="sm" mb={3} color="red.800">Watercourse Habitats</Heading>
          {failingWatercourse.map(band =>
            renderBandBlock(band, watercourseTypeChanges, 'Watercourse Habitats')
          )}
        </Box>
      )}
    </Box>
  );
}

function ComputedTradingSummaries({ ts, features }) {
  if (!ts) {
    return (
      <Text color="fg.muted" fontStyle="italic" fontSize="sm">
        No trading summaries available.
      </Text>
    );
  }

  const fmtN = (n) => {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderDetail = (detail, satisfied) => {
    if (!detail) return null;
    return Object.entries(detail).map(([k, v]) => {
      const label = DETAIL_LABEL_MAP[k] ?? k.replace(/([A-Z])/g, ' $1').toLowerCase();
      const isKeyMetric = !satisfied && KEY_METRIC_FIELDS.has(k);
      return (
        <Text key={k} as="span" display="block" fontSize="0.85rem">
          <Text as="span" color="fg.muted">{label}: </Text>
          <Text
            as="span"
            fontFamily="mono"
            fontWeight={isKeyMetric ? '700' : 'normal'}
            color={
              isKeyMetric && typeof v === 'number' && v < 0
                ? 'red.600'
                : typeof v === 'number' && v < 0
                ? 'red.500'
                : undefined
            }
          >
            {fmtN(v)}
          </Text>
        </Text>
      );
    });
  };

  const renderSection = (title, summary, bands) => (
    <Box width="100%">
      <Heading as="h3" size="md" mb={3}>{title}</Heading>
      <TableContainer>
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader textAlign="left" fontWeight="700">Distinctiveness Band</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Trading Rule</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700">Detail</DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {bands.map(({ label, key, satisfied }) => (
              <DataTable.Row key={key}>
                <DataTable.Cell fontWeight="600">{label}</DataTable.Cell>
                <DataTable.Cell textAlign="center" fontWeight="700" color={satisfied ? 'green.600' : 'red.600'}>
                  {satisfied ? '✓ Satisfied' : '✗ Not satisfied'}
                </DataTable.Cell>
                <DataTable.Cell fontSize="0.85rem">
                  {renderDetail(summary.details[key], satisfied)}
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>
    </Box>
  );

  const habitatBands = [
    { label: 'Very High Distinctiveness', key: 'vHigh',  satisfied: ts.habitats.vHighSatisfied  },
    { label: 'High Distinctiveness',      key: 'high',   satisfied: ts.habitats.highSatisfied   },
    { label: 'Medium Distinctiveness',    key: 'medium', satisfied: ts.habitats.mediumSatisfied },
    { label: 'Low Distinctiveness',       key: 'low',    satisfied: ts.habitats.lowSatisfied    },
  ];
  const hedgerowBands = [
    { label: 'Very High Distinctiveness', key: 'vHigh',  satisfied: ts.hedgerows.vHighSatisfied  },
    { label: 'High Distinctiveness',      key: 'high',   satisfied: ts.hedgerows.highSatisfied   },
    { label: 'Medium Distinctiveness',    key: 'medium', satisfied: ts.hedgerows.mediumSatisfied },
    { label: 'Low Distinctiveness',       key: 'low',    satisfied: ts.hedgerows.lowSatisfied    },
    { label: 'Very Low Distinctiveness',  key: 'vLow',   satisfied: ts.hedgerows.vLowSatisfied   },
  ];
  const watercourseBands = [
    { label: 'Very High Distinctiveness', key: 'vHigh',  satisfied: ts.watercourses.vHighSatisfied  },
    { label: 'High Distinctiveness',      key: 'high',   satisfied: ts.watercourses.highSatisfied   },
    { label: 'Medium Distinctiveness',    key: 'medium', satisfied: ts.watercourses.mediumSatisfied },
    { label: 'Low Distinctiveness',       key: 'low',    satisfied: ts.watercourses.lowSatisfied    },
  ];

  return (
    <VStack gap={8} align="start" width="100%">
      {features && <ShortfallAlertPanel ts={ts} features={features} />}
      {renderSection('Area Habitats Trading Summary', ts.habitats, habitatBands)}
      {renderSection('Hedgerow Habitats Trading Summary', ts.hedgerows, hedgerowBands)}
      {renderSection('Watercourse Habitats Trading Summary', ts.watercourses, watercourseBands)}
    </VStack>
  );
}

// ============================================================
// DATA ROW COUNT SUMMARY TABLE
// ============================================================

const SHEET_SECTIONS = [
  { label: 'A-1: On-Site Habitat Baseline', key: 'onSiteHabitatBaselines' },
  { label: 'A-2: On-Site Habitat Creation', key: 'onSiteHabitatCreations' },
  { label: 'A-3: On-Site Habitat Enhancement', key: 'onSiteHabitatEnhancements' },
  { label: 'B-1: On-Site Hedgerow Baseline', key: 'onSiteHedgerowBaselines' },
  { label: 'B-2: On-Site Hedgerow Creation', key: 'onSiteHedgerowCreations' },
  { label: 'B-3: On-Site Hedgerow Enhancement', key: 'onSiteHedgerowEnhancements' },
  { label: 'C-1: On-Site Watercourse Baseline', key: 'onSiteWatercourseBaselines' },
  { label: 'C-2: On-Site Watercourse Creation', key: 'onSiteWatercourseCreations' },
  { label: 'C-3: On-Site Watercourse Enhancement', key: 'onSiteWatercourseEnhancements' },
  { label: 'D-1: Off-Site Habitat Baseline', key: 'offSiteHabitatBaselines' },
  { label: 'D-2: Off-Site Habitat Creation', key: 'offSiteHabitatCreations' },
  { label: 'D-3: Off-Site Habitat Enhancement', key: 'offSiteHabitatEnhancements' },
  { label: 'E-1: Off-Site Hedgerow Baseline', key: 'offSiteHedgerowBaselines' },
  { label: 'E-2: Off-Site Hedgerow Creation', key: 'offSiteHedgerowCreations' },
  { label: 'E-3: Off-Site Hedgerow Enhancement', key: 'offSiteHedgerowEnhancements' },
  { label: 'F-1: Off-Site Watercourse Baseline', key: 'offSiteWatercourseBaselines' },
  { label: 'F-2: Off-Site Watercourse Creation', key: 'offSiteWatercourseCreations' },
  { label: 'F-3: Off-Site Watercourse Enhancement', key: 'offSiteWatercourseEnhancements' },
];

function CountSummaryTable({ features }) {
  const total = SHEET_SECTIONS.reduce(
    (sum, s) => sum + (features[s.key]?.length ?? 0),
    0
  );

  return (
    <TableContainer>
      <DataTable.Root>
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader textAlign="left">Sheet</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>Rows</DataTable.ColumnHeader>
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {SHEET_SECTIONS.map(({ label, key }) => {
            const count = features[key]?.length ?? 0;
            return (
              <DataTable.Row key={key}>
                <DataTable.Cell>{label}</DataTable.Cell>
                <DataTable.CenteredNumericCell>
                  <Badge
                    colorPalette={count > 0 ? 'green' : 'gray'}
                    variant="subtle"
                  >
                    {count}
                  </Badge>
                </DataTable.CenteredNumericCell>
              </DataTable.Row>
            );
          })}
          <DataTable.Row>
            <DataTable.Cell fontWeight="600">Total</DataTable.Cell>
            <DataTable.CenteredNumericCell>
              <Badge colorPalette="blue" variant="subtle">
                {total}
              </Badge>
            </DataTable.CenteredNumericCell>
          </DataTable.Row>
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
  );
}

// ============================================================
// CREDITS SUMMARY TABLE
// ============================================================

function CreditsSummaryTable({ creditsData }) {
  if (!creditsData) {
    return (
      <Box
        p={6}
        bg="bg.muted"
        borderRadius="md"
        border="1px solid"
        borderColor="border"
        textAlign="center"
      >
        <Text fontSize="2xl" mb={3}>🏅</Text>
        <Text fontWeight="600" fontSize="lg" mb={1}>No Credits Summary Found</Text>
        <Text color="fg.muted" fontSize="sm">
          This metric file does not contain a recognised Credits Summary sheet.
        </Text>
      </Box>
    );
  }

  const { tiers, footnote } = creditsData;
  const totalCredits = tiers.reduce((sum, t) => sum + t.creditsRequired, 0);

  const fmtN = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';

  return (
    <VStack gap={4} align="start" maxWidth="480px">
      <Heading as="h3" size="md">Credits Required by Tier / Module</Heading>
      <TableContainer width="100%">
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader fontWeight="700" textAlign="center">Tier</DataTable.ColumnHeader>
              <DataTable.ColumnHeader fontWeight="700" textAlign="center">Credits Required</DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {tiers.map(({ tier, creditsRequired }) => {
              const hasCredits = creditsRequired > 0;
              return (
                <DataTable.Row key={tier} bg={hasCredits ? 'rgba(234,179,8,0.08)' : undefined}>
                  <DataTable.Cell
                    textAlign="center"
                    fontWeight="700"
                    fontSize="1rem"
                    color={hasCredits ? 'orange.700' : 'fg.muted'}
                  >
                    {tier}
                  </DataTable.Cell>
                  <DataTable.CenteredNumericCell
                    fontWeight={hasCredits ? '700' : 'normal'}
                    color={hasCredits ? 'orange.700' : 'fg.muted'}
                  >
                    {fmtN(creditsRequired)}
                    {hasCredits && (
                      <Text as="span" ml={2} fontSize="0.8em" color="orange.600">▲</Text>
                    )}
                  </DataTable.CenteredNumericCell>
                </DataTable.Row>
              );
            })}
            <DataTable.Row borderTop="2px solid" borderTopColor="subtleBorder">
              <DataTable.Cell fontWeight="700" textAlign="center">Total</DataTable.Cell>
              <DataTable.CenteredNumericCell
                fontWeight="700"
                color={totalCredits > 0 ? 'orange.700' : undefined}
              >
                {fmtN(totalCredits)}
              </DataTable.CenteredNumericCell>
            </DataTable.Row>
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>
      {footnote && (
        <Text fontSize="xs" color="fg.muted" fontStyle="italic">
          {footnote}
        </Text>
      )}
    </VStack>
  );
}

// ============================================================
// UPLOAD DROP ZONE
// ============================================================

function UploadZone({
  isDragging,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  error,
}) {
  return (
    <Box>
      <Box
        border="2px dashed"
        borderColor={isDragging ? 'brand.500' : error ? 'red.400' : 'border'}
        borderRadius="xl"
        p={{ base: 8, md: 14 }}
        textAlign="center"
        bg={isDragging ? 'rgba(34,139,34,0.05)' : 'cardBg'}
        cursor="pointer"
        transition="all 0.2s"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        _hover={{ borderColor: 'brand.500', bg: 'rgba(34,139,34,0.04)' }}
        role="button"
        aria-label="Upload metric file"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm"
          style={{ display: 'none' }}
          onChange={onFileChange}
          aria-label="Select metric file"
        />
        <VStack gap={4}>
          <Text fontSize="4xl" lineHeight="1">
            📊
          </Text>
          <VStack gap={1}>
            <Text fontSize="lg" fontWeight="600" color="fg">
              {isDragging
                ? 'Drop your metric file here'
                : 'Drag & drop your metric file here'}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              or click to browse for a file
            </Text>
          </VStack>
          <Text
            fontSize="xs"
            color="fg.muted"
            bg="bg.muted"
            px={3}
            py={1}
            borderRadius="full"
            border="1px solid"
            borderColor="border"
          >
            Accepts .xlsm and .xlsx statutory metric files
          </Text>
        </VStack>
      </Box>

      {error && (
        <Box
          mt={4}
          p={4}
          bg="red.subtle"
          borderRadius="md"
          border="1px solid"
          borderColor="red.400"
        >
          <HStack gap={3} alignItems="flex-start">
            <Text fontSize="xl" flexShrink={0}>
              ⚠️
            </Text>
            <VStack align="start" gap={1}>
              <Text fontWeight="600" color="red.600">
                Failed to parse file
              </Text>
              <Text fontSize="sm" color="red.600">
                {error}
              </Text>
              <Text fontSize="xs" color="red.500" mt={1}>
                Please ensure the file is a valid statutory biodiversity metric
                (.xlsm or .xlsx) and try again.
              </Text>
            </VStack>
          </HStack>
        </Box>
      )}
    </Box>
  );
}

// ============================================================
// RESULTS VIEW
// ============================================================

function tabRowCount(features, keys) {
  return keys.reduce((sum, key) => sum + (features[key]?.length ?? 0), 0);
}

function ResultsView({ result, onReset }) {
  const { fileName, fileSize, startRows, hr, ts, features, creditsData } = result;
  const totalRows = countFeatureRows(features);

  const isIrreplaceable = (row) => {
    const v = row.irreplaceableHabitat;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s !== '' && s !== 'no' && s !== 'false' && s !== '0';
    }
    return false;
  };

  const irreplaceableOnSite = (features.onSiteHabitatBaselines ?? []).filter(isIrreplaceable);
  const irreplaceableOffSite = (features.offSiteHabitatBaselines ?? []).filter(isIrreplaceable);
  const irreplaceableCount = irreplaceableOnSite.length + irreplaceableOffSite.length;

  const areaHabitatCount = tabRowCount(features, [
    'onSiteHabitatBaselines',
    'onSiteHabitatCreations',
    'onSiteHabitatEnhancements',
    'offSiteHabitatBaselines',
    'offSiteHabitatCreations',
    'offSiteHabitatEnhancements',
  ]);
  const hedgerowCount = tabRowCount(features, [
    'onSiteHedgerowBaselines',
    'onSiteHedgerowCreations',
    'onSiteHedgerowEnhancements',
    'offSiteHedgerowBaselines',
    'offSiteHedgerowCreations',
    'offSiteHedgerowEnhancements',
  ]);
  const watercourseCount = tabRowCount(features, [
    'onSiteWatercourseBaselines',
    'onSiteWatercourseCreations',
    'onSiteWatercourseEnhancements',
    'offSiteWatercourseBaselines',
    'offSiteWatercourseCreations',
    'offSiteWatercourseEnhancements',
  ]);

  return (
    <Box>
      {/* File header bar */}
      <PrimaryCard mb={5}>
        <HStack justifyContent="space-between" flexWrap="wrap" gap={3}>
          <HStack gap={3} flexWrap="wrap">
            <Text fontSize="2xl" lineHeight="1">
              📊
            </Text>
            <VStack align="start" gap={0}>
              <Heading as="h3" size="sm">
                {fileName}
              </Heading>
              <HStack gap={3} mt={1} flexWrap="wrap">
                <Text fontSize="xs" color="fg.muted">
                  {formatFileSize(fileSize)}
                </Text>
                <Badge colorPalette="green" variant="subtle">
                  {totalRows} total data rows
                </Badge>
              </HStack>
            </VStack>
          </HStack>
          <Button onClick={onReset}>Upload Different File</Button>
        </HStack>
      </PrimaryCard>

      {/* Main tabbed view */}
      <Tabs.Root defaultValue="summary" lazyMount>
        <Tabs.List flexWrap="wrap" gap={1}>
          <Tabs.Trigger value="summary">📋 Summary</Tabs.Trigger>
          <Tabs.Trigger value="headline-results">📈 Headline Results</Tabs.Trigger>
          <Tabs.Trigger value="trading-summary">🔄 Trading Summary</Tabs.Trigger>
          <Tabs.Trigger value="credits-summary">🏅 Credits Summary</Tabs.Trigger>
          <Tabs.Trigger value="irreplaceable-habitats">
            🌿 Irreplaceable Habitats&nbsp;
            <Badge
              variant="subtle"
              colorPalette={irreplaceableCount > 0 ? 'orange' : 'gray'}
              fontSize="xs"
            >
              {irreplaceableCount}
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="area-habitats">
            Area Habitats&nbsp;
            <Badge
              variant="subtle"
              colorPalette={areaHabitatCount > 0 ? 'green' : 'gray'}
              fontSize="xs"
            >
              {areaHabitatCount}
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="hedgerows">
            Hedgerow Habitats&nbsp;
            <Badge
              variant="subtle"
              colorPalette={hedgerowCount > 0 ? 'green' : 'gray'}
              fontSize="xs"
            >
              {hedgerowCount}
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="watercourses">
            Watercourse Habitats&nbsp;
            <Badge
              variant="subtle"
              colorPalette={watercourseCount > 0 ? 'green' : 'gray'}
              fontSize="xs"
            >
              {watercourseCount}
            </Badge>
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Summary ─────────────────────────────────────────── */}
        <Tabs.Content value="summary">
          <Box py={5}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
              <Box>
                <Heading as="h3" size="sm" mb={3}>
                  Start Sheet Data
                </Heading>
                <StartDataTable rows={startRows} />
              </Box>
              <Box>
                <Heading as="h3" size="sm" mb={3}>
                  Data Row Counts
                </Heading>
                <CountSummaryTable features={features} />
              </Box>
            </SimpleGrid>
          </Box>
        </Tabs.Content>

        {/* ── Headline Results ─────────────────────────────────── */}
        <Tabs.Content value="headline-results">
          <Box py={5}>
            <ComputedHeadlineResults hr={hr} />
          </Box>
        </Tabs.Content>

        {/* ── Trading Summary ──────────────────────────────────── */}
        <Tabs.Content value="trading-summary">
          <Box py={5}>
            <ComputedTradingSummaries ts={ts} features={features} />
          </Box>
        </Tabs.Content>

        {/* ── Credits Summary ──────────────────────────────────── */}
        <Tabs.Content value="credits-summary">
          <Box py={5}>
            <CreditsSummaryTable creditsData={creditsData} />
          </Box>
        </Tabs.Content>

        {/* ── Irreplaceable Habitats ───────────────────────────── */}
        <Tabs.Content value="irreplaceable-habitats">
          <Box py={5}>
            {irreplaceableCount === 0 ? (
              <Box
                p={6}
                bg="bg.muted"
                borderRadius="md"
                border="1px solid"
                borderColor="border"
                textAlign="center"
              >
                <Text fontSize="2xl" mb={3}>🌿</Text>
                <Text fontWeight="600" fontSize="lg" mb={1}>No Irreplaceable Habitats Found</Text>
                <Text color="fg.muted" fontSize="sm">
                  This metric file contains no baseline habitat rows flagged as irreplaceable.
                </Text>
              </Box>
            ) : (
              <>
                <Heading as="h3" size="md" mb={4}>
                  On-Site Irreplaceable Habitats
                </Heading>
                <SectionBlock
                  title="On-Site Baseline — Irreplaceable Habitats"
                  rows={irreplaceableOnSite}
                  columns={IRREPLACEABLE_HABITAT_COLS}
                  hideComments
                />
                <Heading as="h3" size="md" mb={4} mt={8}>
                  Off-Site Irreplaceable Habitats
                </Heading>
                <SectionBlock
                  title="Off-Site Baseline — Irreplaceable Habitats"
                  rows={irreplaceableOffSite}
                  columns={IRREPLACEABLE_HABITAT_COLS}
                  hideComments
                />
              </>
            )}
          </Box>
        </Tabs.Content>

        {/* ── Area Habitats ─────────────────────────────────────── */}
        <Tabs.Content value="area-habitats">
          <Box py={5}>
            <Heading as="h3" size="md" mb={4}>
              On-Site Habitats
            </Heading>
            <SectionBlock
              title="A-1: On-Site Habitat Baseline"
              rows={features.onSiteHabitatBaselines}
              columns={HABITAT_BASELINE_COLS}
            />
            <SectionBlock
              title="A-2: On-Site Habitat Creation"
              rows={features.onSiteHabitatCreations}
              columns={HABITAT_CREATION_COLS}
            />
            <SectionBlock
              title="A-3: On-Site Habitat Enhancement"
              rows={features.onSiteHabitatEnhancements}
              columns={HABITAT_ENHANCEMENT_COLS}
            />
            <Heading as="h3" size="md" mb={4} mt={8}>
              Off-Site Habitats
            </Heading>
            <SectionBlock
              title="D-1: Off-Site Habitat Baseline"
              rows={features.offSiteHabitatBaselines}
              columns={HABITAT_BASELINE_COLS}
            />
            <SectionBlock
              title="D-2: Off-Site Habitat Creation"
              rows={features.offSiteHabitatCreations}
              columns={HABITAT_CREATION_COLS}
            />
            <SectionBlock
              title="D-3: Off-Site Habitat Enhancement"
              rows={features.offSiteHabitatEnhancements}
              columns={HABITAT_ENHANCEMENT_COLS}
            />
          </Box>
        </Tabs.Content>

        {/* ── Hedgerows ────────────────────────────────────────── */}
        <Tabs.Content value="hedgerows">
          <Box py={5}>
            <Heading as="h3" size="md" mb={4}>
              On-Site Hedgerows
            </Heading>
            <SectionBlock
              title="B-1: On-Site Hedgerow Baseline"
              rows={features.onSiteHedgerowBaselines}
              columns={HEDGEROW_BASELINE_COLS}
            />
            <SectionBlock
              title="B-2: On-Site Hedgerow Creation"
              rows={features.onSiteHedgerowCreations}
              columns={HEDGEROW_CREATION_COLS}
            />
            <SectionBlock
              title="B-3: On-Site Hedgerow Enhancement"
              rows={features.onSiteHedgerowEnhancements}
              columns={HEDGEROW_ENHANCEMENT_COLS}
            />
            <Heading as="h3" size="md" mb={4} mt={8}>
              Off-Site Hedgerows
            </Heading>
            <SectionBlock
              title="E-1: Off-Site Hedgerow Baseline"
              rows={features.offSiteHedgerowBaselines}
              columns={HEDGEROW_BASELINE_COLS}
            />
            <SectionBlock
              title="E-2: Off-Site Hedgerow Creation"
              rows={features.offSiteHedgerowCreations}
              columns={HEDGEROW_CREATION_COLS}
            />
            <SectionBlock
              title="E-3: Off-Site Hedgerow Enhancement"
              rows={features.offSiteHedgerowEnhancements}
              columns={HEDGEROW_ENHANCEMENT_COLS}
            />
          </Box>
        </Tabs.Content>

        {/* ── Watercourses ─────────────────────────────────────── */}
        <Tabs.Content value="watercourses">
          <Box py={5}>
            <Heading as="h3" size="md" mb={4}>
              On-Site Watercourses
            </Heading>
            <SectionBlock
              title="C-1: On-Site Watercourse Baseline"
              rows={features.onSiteWatercourseBaselines}
              columns={WATERCOURSE_BASELINE_COLS}
            />
            <SectionBlock
              title="C-2: On-Site Watercourse Creation"
              rows={features.onSiteWatercourseCreations}
              columns={WATERCOURSE_CREATION_COLS}
            />
            <SectionBlock
              title="C-3: On-Site Watercourse Enhancement"
              rows={features.onSiteWatercourseEnhancements}
              columns={WATERCOURSE_ENHANCEMENT_COLS}
            />
            <Heading as="h3" size="md" mb={4} mt={8}>
              Off-Site Watercourses
            </Heading>
            <SectionBlock
              title="F-1: Off-Site Watercourse Baseline"
              rows={features.offSiteWatercourseBaselines}
              columns={WATERCOURSE_BASELINE_COLS}
            />
            <SectionBlock
              title="F-2: Off-Site Watercourse Creation"
              rows={features.offSiteWatercourseCreations}
              columns={WATERCOURSE_CREATION_COLS}
            />
            <SectionBlock
              title="F-3: Off-Site Watercourse Enhancement"
              rows={features.offSiteWatercourseEnhancements}
              columns={WATERCOURSE_ENHANCEMENT_COLS}
            />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function MetricFileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xlsm'].includes(ext)) {
      setError(
        `Unsupported file type ".${ext}". Please upload a .xlsm or .xlsx statutory metric file.`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();

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

      setResult({
        fileName: file.name,
        fileSize: file.size,
        startRows,
        hr,
        ts,
        features: augmentedFeatures,
        creditsData,
      });
    } catch (err) {
      const raw = err?.message ?? 'Failed to parse the metric file.';
      // Keep only the first line for brevity — full detail is in the console
      setError(raw.includes('\n') ? raw.split('\n')[0] : raw);
      console.error('[MetricFileUpload] parse error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
        // Reset so the same file can be re-selected after a reset
        e.target.value = '';
      }
    },
    [processFile]
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <Box px={{ base: 3, md: 6 }} py={6} maxWidth="1600px" mx="auto">
      {/* Page header */}
      <HStack justifyContent="space-between" alignItems="flex-start" mb={6}>
        <VStack align="start" gap={1}>
          <Heading as="h2" size="xl">
            Statutory Metric Viewer
          </Heading>
          <Text color="fg.muted" maxWidth="780px">
            Upload your statutory biodiversity metric calculation file (.xlsm or
            .xlsx) to view its project information and all parsed habitat,
            hedgerow, and watercourse data rows. All processing happens entirely
            in your browser so no data is sent to any server.
          </Text>
        </VStack>
        <Box flexShrink={0} pt={1}>
          <a href="https://intel.abitat.dev/" target="_blank" rel="noopener noreferrer">
            <Image
              src="https://assets.intel.abitat.dev/built-with-abitat-intel-light.svg"
              alt="Built with Abitat Intel"
              width={300}
              height={112}
              unoptimized
              style={{ height: '7rem', width: 'auto' }}
            />
          </a>
        </Box>
      </HStack>

      {/* Upload zone (hidden once a result is loaded) */}
      {!result && !isProcessing && (
        <UploadZone
          isDragging={isDragging}
          fileInputRef={fileInputRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          error={error}
        />
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <Box textAlign="center" py={20}>
          <VStack gap={4}>
            <Spinner size="xl" color="brand.500" />
            <Text fontWeight="500">Parsing metric file…</Text>
            <Text fontSize="sm" color="fg.muted">
              This may take a moment for large files
            </Text>
          </VStack>
        </Box>
      )}

      {/* Results */}
      {result && <ResultsView result={result} onReset={handleReset} />}
    </Box>
  );
}
