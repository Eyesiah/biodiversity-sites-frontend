'use client'

import { useState, useCallback, useRef, Fragment } from 'react';
import { read, utils } from 'xlsx';
import { parseFile } from '../../../src/parsers/parseFile';
import {
  Box, Text, VStack, HStack, Heading, Badge, Tabs, Spinner, SimpleGrid,
} from '@chakra-ui/react';
import { PrimaryCard, TableContainer } from '@/components/styles/PrimaryCard';
import { DataTable } from '@/components/styles/DataTable';
import Button from '@/components/styles/Button';
import { useSortableData } from '@/lib/hooks';

// ============================================================
// COLUMN DEFINITIONS
// ============================================================

const HABITAT_BASELINE_COLS = [
  { key: 'ref', label: 'Ref' },
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

const HABITAT_CREATION_COLS = [
  { key: 'broadHabitat', label: 'Broad Habitat' },
  { key: 'habitatType', label: 'Proposed Habitat' },
  { key: 'area', label: 'Area (ha)' },
  { key: 'condition', label: 'Condition' },
  { key: 'strategicSignificance', label: 'Strategic Sig.' },
  { key: 'habitatUnitsDelivered', label: 'Units Delivered' },
];

const HABITAT_ENHANCEMENT_COLS = [
  { key: 'baselineRef', label: 'Baseline Ref' },
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
  { key: 'baselineRef', label: 'Baseline Ref' },
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
  { key: 'baselineRef', label: 'Baseline Ref' },
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
 * Read a trading summary sheet and return only rows that contain actual data.
 * Keeps rows where at least one cell (beyond the first label column) is a
 * non-zero, non-blank value, OR where the row looks like a summary/total row.
 */
function extractTradingRows(workbook, sheetName) {
  const allRows = extractSheetRows(workbook, sheetName);
  if (allRows.length === 0) return [];

  // Always keep the first row (column headers) regardless of content
  const headerRow = allRows[0];
  const dataRows = allRows.slice(1).filter((row) => {
    if (!Array.isArray(row)) return false;
    // Always keep summary/total rows
    const rowText = row.map((c) => String(c ?? '').toLowerCase()).join(' ');
    if (rowText.includes('total') || rowText.includes('shortfall') || rowText.includes('surplus')) {
      return true;
    }
    // Keep rows where at least one cell after the first is a non-zero numeric value
    return row.slice(1).some((cell) => {
      const s = String(cell ?? '').trim();
      if (s === '' || s === '0' || s === '0.0' || s === '0.00') return false;
      return !isNaN(parseFloat(s));
    });
  });

  // Only return header + data if there is at least one data row
  return dataRows.length > 0 ? [headerRow, ...dataRows] : [];
}

/** Split an array into chunks of `size` elements. */
function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function countFeatureRows(features) {
  return Object.values(features).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );
}

// ============================================================
// FEATURE TABLE (with sortable column headers)
// ============================================================

function FeatureTable({ rows, columns }) {
  const { items: sortedRows, requestSort, getSortIndicator } = useSortableData(
    rows || []
  );

  if (!rows || rows.length === 0) {
    return (
      <Box py={3}>
        <Text color="fg.muted" fontStyle="italic" fontSize="sm">
          No data rows found for this section.
        </Text>
      </Box>
    );
  }

  return (
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
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {sortedRows.map((row, i) => (
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
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
  );
}

// ============================================================
// SECTION BLOCK (header + table)
// ============================================================

function SectionBlock({ title, rows, columns }) {
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
      <FeatureTable rows={rows || []} columns={columns} />
    </Box>
  );
}

// ============================================================
// START SHEET TABLE
// ============================================================

function StartDataTable({ rows, hasHeader = false, grouped = false }) {
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

  const headerRow = hasHeader ? rows[0] : null;
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  const renderDataCell = (cellStr, colIdx, isLabelRow, extraProps = {}) => {
    const isNumeric =
      cellStr !== '' &&
      !isNaN(parseFloat(cellStr)) &&
      isFinite(cellStr.replace(/,/g, ''));
    const isPercent = /^-?[\d,.]+%$/.test(cellStr.trim());
    const isNegativePercent = isPercent && cellStr.trim().startsWith('-');
    const isNegative = (isNumeric && parseFloat(cellStr) < 0) || isNegativePercent;
    const isCentred = isNumeric || isPercent;
    return (
      <DataTable.Cell
        key={colIdx}
        textAlign={isCentred ? 'center' : 'left'}
        fontFamily={isCentred ? 'mono' : undefined}
        color={isNegative ? 'red.600' : undefined}
        fontWeight={
          isLabelRow && colIdx === 0
            ? '800'
            : !isNumeric && cellStr && colIdx <= 1
            ? '500'
            : 'normal'
        }
        {...extraProps}
      >
        {isNumeric ? fmt2dp(cellStr) : cellStr}
      </DataTable.Cell>
    );
  };

  const renderBodyRow = (row, rowIdx) => {
    const cells = Array.from({ length: maxCols }, (_, colIdx) => {
      const val = row[colIdx];
      return val !== null && val !== undefined ? String(val).trim() : '';
    });
    const isLabelRow = cells[0] !== '' && cells[1] === '' && cells[2] === '';
    return (
      <DataTable.Row key={rowIdx}>
        {cells.map((cellStr, colIdx) => renderDataCell(cellStr, colIdx, isLabelRow))}
      </DataTable.Row>
    );
  };

  // ── Grouped mode: wrap each section in a bordered card ──────────
  if (grouped) {
    const getCells = (row) =>
      Array.from({ length: maxCols }, (_, i) => {
        const v = row[i];
        return v != null ? String(v).trim() : '';
      });

    // Split body rows into sections by detecting label rows
    const sections = [];
    let currentSection = null;

    for (const row of bodyRows) {
      const cells = getCells(row);
      const isLabelRow = cells[0] !== '' && cells[1] === '' && cells[2] === '';

      if (isLabelRow) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: cells[0], rows: [] };
      } else if (currentSection) {
        currentSection.rows.push(cells);
      } else {
        // Data before any section header — attach to an unnamed section
        if (!sections.length) sections.push({ title: null, rows: [] });
        sections[sections.length - 1].rows.push(cells);
      }
    }
    if (currentSection) sections.push(currentSection);

    return (
      <VStack gap={4} align="start" width="100%">
        {sections.map((section, sIdx) => (
          <Box
            key={sIdx}
            border="1px solid"
            borderColor="border"
            borderRadius="md"
            overflow="hidden"
            width="100%"
          >
            {section.title && (
              <Box bg="brand.500" px={3} py={2}>
                <Text color="white" fontWeight="700" fontSize="sm">
                  {section.title}
                </Text>
              </Box>
            )}
            {section.rows.length > 0 && (() => {
              // Compute active columns across the whole section
              const sectionColSet = new Set();
              for (const cells of section.rows) {
                cells.forEach((cellStr, i) => {
                  if (cellStr !== '') sectionColSet.add(i);
                });
              }
              const sectionActiveCols = [...sectionColSet].sort((a, b) => a - b);

              // Remove spacer rows — rows with no content in any section-active column
              const meaningfulRows = section.rows.filter((cells) =>
                sectionActiveCols.some((colIdx) => (cells[colIdx] ?? '') !== '')
              );

              if (meaningfulRows.length === 0) return null;

              // Merge an incomplete last chunk (< 3 rows) into the previous
              // chunk so the watercourse/final row is never isolated.
              const rawChunks = chunkArray(meaningfulRows, 3);
              const mergedChunks =
                rawChunks.length > 1 &&
                rawChunks[rawChunks.length - 1].length < 4
                  ? [
                      ...rawChunks.slice(0, -2),
                      [
                        ...rawChunks[rawChunks.length - 2],
                        ...rawChunks[rawChunks.length - 1],
                      ],
                    ]
                  : rawChunks;

              return (
                <VStack gap={0} p={2}>
                  {mergedChunks.map((chunk, chunkIdx) => {
                    // First chunk: use only its own data columns (may be 1 col).
                    // All subsequent chunks: use the full section columns so every
                    // non-first chunk is guaranteed to show all 4 value columns.
                    let activeCols;
                    if (chunkIdx === 0) {
                      const chunkColSet = new Set();
                      for (const cells of chunk) {
                        cells.forEach((cellStr, i) => {
                          if (cellStr !== '') chunkColSet.add(i);
                        });
                      }
                      activeCols = [...chunkColSet].sort((a, b) => a - b);
                    } else {
                      activeCols = sectionActiveCols;
                    }

                    return (
                      <Box
                        key={chunkIdx}
                        borderStyle="double"
                        borderWidth="3px"
                        borderColor="border"
                        borderRadius="sm"
                        overflow="hidden"
                        width="100%"
                        mt={chunkIdx > 0 ? 2 : 0}
                      >
                        <TableContainer>
                          <DataTable.Root tableLayout="fixed" width="100%">
                            <DataTable.Body>
                              {chunk.map((cells, rowIdx) => (
                                <DataTable.Row key={rowIdx}>
                                  {activeCols.map((colIdx, activeIdx) => {
                                    const colProps =
                                      activeIdx === 0 && activeCols.length > 1
                                        ? { width: '280px' }
                                        : activeIdx === 1 && activeCols.length > 1
                                        ? { width: '150px' }
                                        : activeIdx === 2 && activeCols.length > 2
                                        ? { width: '150px' }
                                        : activeIdx === 3 && activeCols.length > 3
                                        ? { width: '150px' }
                                        : {};
                                    return renderDataCell(
                                      cells[colIdx] ?? '',
                                      colIdx,
                                      colIdx === 0,
                                      colProps
                                    );
                                  })}
                                </DataTable.Row>
                              ))}
                            </DataTable.Body>
                          </DataTable.Root>
                        </TableContainer>
                      </Box>
                    );
                  })}
                </VStack>
              );
            })()}
          </Box>
        ))}
      </VStack>
    );
  }

  // ── Flat mode (default) ──────────────────────────────────────────
  return (
    <TableContainer>
      <DataTable.Root>
        {hasHeader && headerRow && (
          <DataTable.Header>
            <DataTable.Row>
              {Array.from({ length: maxCols }, (_, colIdx) => {
                const val = headerRow[colIdx];
                const cellStr = val !== null && val !== undefined ? String(val).trim() : '';
                return (
                  <DataTable.ColumnHeader key={colIdx}>
                    {cellStr}
                  </DataTable.ColumnHeader>
                );
              })}
            </DataTable.Row>
          </DataTable.Header>
        )}
        <DataTable.Body>
          {bodyRows.map((row, rowIdx) => renderBodyRow(row, rowIdx))}
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
  );
}

// ============================================================
// HEADLINE RESULTS DISPLAY
// Section titles span multiple unit-type rows via rowSpan,
// matching the original metric sheet layout.
// ============================================================

function HeadlineResultsDisplay({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <Text color="fg.muted" fontStyle="italic" fontSize="sm">
        No data found in the Headline Results sheet.
      </Text>
    );
  }

  const maxCols = Math.min(
    Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0))),
    10
  );

  // Build string cell arrays
  const allCells = rows.map((row) =>
    Array.from({ length: maxCols }, (_, i) => {
      const v = row[i];
      return v != null ? String(v).trim() : '';
    })
  );

  // Find active columns excluding col 0 (the title column)
  const colSet = new Set();
  for (const cells of allCells) {
    cells.forEach((cellStr, i) => {
      if (i > 0 && cellStr !== '') colSet.add(i);
    });
  }
  const valueCols = [...colSet].sort((a, b) => a - b);

  // Group rows: a new group starts when cells[0] is non-empty
  const groups = [];
  let currentGroup = null;
  for (const cells of allCells) {
    if (cells[0] !== '') {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { rows: [cells] };
    } else if (currentGroup) {
      currentGroup.rows.push(cells);
    } else {
      if (!groups.length) groups.push({ rows: [] });
      groups[groups.length - 1].rows.push(cells);
    }
  }
  if (currentGroup) groups.push(currentGroup);

  const renderValueCell = (cellStr, colIdx, bold = false) => {
    const isNumeric = cellStr !== '' && !isNaN(parseFloat(cellStr)) && isFinite(cellStr.replace(/,/g, ''));
    const isPercent = /^-?[\d,.]+%$/.test(cellStr.trim());
    const isNegativePercent = isPercent && cellStr.trim().startsWith('-');
    const isNegative = (isNumeric && parseFloat(cellStr) < 0) || isNegativePercent;
    const isCentred = isNumeric || isPercent;
    return (
      <DataTable.Cell
        key={colIdx}
        textAlign={isCentred ? 'center' : 'left'}
        fontFamily={isCentred ? 'mono' : undefined}
        color={isNegative ? 'red.600' : undefined}
        fontWeight={bold ? '700' : 'normal'}
        fontSize="0.875rem"
      >
        {isNumeric ? fmt2dp(cellStr) : cellStr}
      </DataTable.Cell>
    );
  };

  // Flatten all group rows into a single list with group metadata for styling
  const flatRows = groups.flatMap((group) => {
    const titleText = group.rows[0] ? group.rows[0][0] : '';
    const isFinal = titleText.toLowerCase().includes('final result');
    return group.rows.map((cells, rIdx) => ({
      cells,
      isFirstInGroup: rIdx === 0,
      isFinal,
      groupIdx: groups.indexOf(group),
    }));
  });

  return (
    <TableContainer>
      <DataTable.Root>
        <DataTable.Body>
          {flatRows.map((item, globalIdx) => {
            // Every 3rd row gets a thick bottom border, with manual adjustments
            // for rows 34→35, 37→38 and the 7th-last / 8th-last rows.
            const total = flatRows.length;
            const isEvery3rd =
              ((globalIdx + 1) % 3 === 0 &&
                globalIdx !== 33 &&
                globalIdx !== 36 &&
                globalIdx !== total - 8 &&
                globalIdx !== total - 11) ||
              globalIdx === 34 ||
              globalIdx === 37 ||
              globalIdx === total - 7 ||
              globalIdx === total - 10;
            return (
              <DataTable.Row
                key={globalIdx}
                borderTop={item.isFirstInGroup && item.groupIdx > 0 ? '2px solid' : undefined}
                borderTopColor="subtleBorder"
                borderBottom={isEvery3rd ? '3px solid' : undefined}
                borderBottomColor={isEvery3rd ? 'border' : undefined}
                bg={item.isFinal ? 'rgba(184,161,98,0.12)' : undefined}
              >
                {valueCols.map((colIdx) =>
                  renderValueCell(item.cells[colIdx] ?? '', colIdx, item.isFinal)
                )}
              </DataTable.Row>
            );
          })}
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
  );
}

// ============================================================
// TRADING DATA SECTION
// Column headers shown once; each distinctiveness band gets a
// branded sub-header row; summary rows styled at the bottom.
// ============================================================

function TradingDataSection({ rows, habitatGroup = '' }) {
  if (!rows || rows.length < 2) {
    return (
      <Text color="fg.muted" fontStyle="italic" fontSize="sm">
        No trading data found.
      </Text>
    );
  }

  const maxCols = Math.min(
    Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0))),
    12
  );

  // Row 0 = column headers
  const headerCells = Array.from({ length: maxCols }, (_, i) => {
    const v = rows[0][i];
    return v != null ? String(v).trim() : '';
  });

  // Parse remaining rows into typed groups
  const parsedRows = rows.slice(1).map((row) => {
    const cells = Array.from({ length: maxCols }, (_, i) => {
      const v = row[i];
      return v != null ? String(v).trim() : '';
    });
    const first = cells[0].toLowerCase();
    const isSummary =
      first.includes('total') ||
      first.includes('shortfall') ||
      first.includes('surplus');
    const isNumericFirst =
      cells[0] !== '' &&
      !isNaN(parseFloat(cells[0])) &&
      isFinite(cells[0].replace(/,/g, ''));
    // A group-header row: non-empty, non-numeric first cell, not a summary
    const isGroupHeader = cells[0] !== '' && !isNumericFirst && !isSummary;
    return { cells, isGroupHeader, isSummary };
  });

  const renderCells = (cells, bold = false) =>
    cells.map((cellStr, colIdx) => {
      const isNumeric =
        cellStr !== '' &&
        !isNaN(parseFloat(cellStr)) &&
        isFinite(cellStr.replace(/,/g, ''));
      const isNegative = isNumeric && parseFloat(cellStr) < 0;
      return (
        <DataTable.Cell
          key={colIdx}
          textAlign={isNumeric ? 'center' : 'left'}
          fontFamily={isNumeric ? 'mono' : undefined}
          fontWeight={bold ? '700' : 'normal'}
          color={isNegative ? 'red.600' : undefined}
        >
          {isNumeric ? fmt2dp(cellStr) : cellStr}
        </DataTable.Cell>
      );
    });

  let groupIndex = -1;

  return (
    <TableContainer>
      <DataTable.Root>
        <DataTable.Header>
          <DataTable.Row>
            {/* Skip column 0 — it's the distinctiveness label column */}
            {headerCells.slice(1).map((label, i) => (
              <DataTable.ColumnHeader key={i} fontWeight="700">{label}</DataTable.ColumnHeader>
            ))}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {parsedRows.map((parsed, rowIdx) => {
            if (parsed.isGroupHeader) {
              groupIndex++;
              const dataCols = maxCols - 1;
              return (
                <Fragment key={rowIdx}>
                  {/* Full-width green row showing the distinctiveness type name */}
                  <DataTable.Row>
                    <DataTable.Cell
                      colSpan={dataCols}
                      bg="brand.500"
                      color="white"
                      fontWeight="700"
                      fontSize="0.9rem"
                      py={2}
                      borderTop={groupIndex > 0 ? '3px solid' : undefined}
                      borderTopColor="border"
                    >
                      {habitatGroup ? `${habitatGroup} — ${parsed.cells[0]}` : parsed.cells[0]}
                    </DataTable.Cell>
                  </DataTable.Row>
                  {/* Data row — skip first cell (the distinctiveness name shown above) */}
                  <DataTable.Row>
                    {parsed.cells.slice(1).map((cellStr, i) => {
                      const isNumeric =
                        cellStr !== '' &&
                        !isNaN(parseFloat(cellStr)) &&
                        isFinite(cellStr.replace(/,/g, ''));
                      const isNegative = isNumeric && parseFloat(cellStr) < 0;
                      return (
                        <DataTable.Cell
                          key={i}
                          textAlign={isNumeric ? 'center' : 'left'}
                          fontFamily={isNumeric ? 'mono' : undefined}
                          color={isNegative ? 'red.600' : undefined}
                        >
                          {isNumeric ? fmt2dp(cellStr) : cellStr}
                        </DataTable.Cell>
                      );
                    })}
                  </DataTable.Row>
                </Fragment>
              );
            }

            if (parsed.isSummary) {
              return (
                <DataTable.Row
                  key={rowIdx}
                  borderTop="3px solid"
                  borderTopColor="border"
                >
                  {renderCells(parsed.cells.slice(1), true)}
                </DataTable.Row>
              );
            }

            // Regular sub-row — skip first cell
            return (
              <DataTable.Row key={rowIdx}>
                {renderCells(parsed.cells.slice(1))}
              </DataTable.Row>
            );
          })}
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
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
  const { fileName, fileSize, startRows, headlineRows, tradingSummary, features } = result;
  const totalRows = countFeatureRows(features);

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
            <HeadlineResultsDisplay rows={headlineRows} />
          </Box>
        </Tabs.Content>

        {/* ── Trading Summary ──────────────────────────────────── */}
        <Tabs.Content value="trading-summary">
          <Box py={5}>
            <VStack align="start" gap={8}>
              <Box width="100%">
                <Heading as="h3" size="md" mb={3}>
                  Area Habitats Trading Summary
                </Heading>
                {tradingSummary?.area?.length > 0 ? (
                  <TradingDataSection rows={tradingSummary.area} habitatGroup="Area Habitats" />
                ) : (
                  <Text color="fg.muted" fontStyle="italic" fontSize="sm">
                    No area habitat trading data with non-zero values found.
                  </Text>
                )}
              </Box>
              <Box width="100%">
                <Heading as="h3" size="md" mb={3}>
                  Hedgerow Habitats Trading Summary
                </Heading>
                {tradingSummary?.hedgerows?.length > 0 ? (
                  <TradingDataSection rows={tradingSummary.hedgerows} habitatGroup="Hedgerow Habitats" />
                ) : (
                  <Text color="fg.muted" fontStyle="italic" fontSize="sm">
                    No hedgerow trading data with non-zero values found.
                  </Text>
                )}
              </Box>
              <Box width="100%">
                <Heading as="h3" size="md" mb={3}>
                  Watercourse Habitats Trading Summary
                </Heading>
                {tradingSummary?.watercourses?.length > 0 ? (
                  <TradingDataSection rows={tradingSummary.watercourses} habitatGroup="Watercourse Habitats" />
                ) : (
                  <Text color="fg.muted" fontStyle="italic" fontSize="sm">
                    No watercourse trading data with non-zero values found.
                  </Text>
                )}
              </Box>
            </VStack>
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

      // Read raw sheets for display
      const rawWorkbook = read(buffer, {
        sheets: [
          'Start',
          'Headline Results',
          'Trading Summary Area Habitats',
          'Trading Summary Hedgerows',
          "Trading Summary WaterC's",
        ],
        cellDates: false,
        cellNF: false,
        cellHTML: false,
      });
      const startRows = extractStartData(rawWorkbook);
      const headlineRows = extractSheetRows(rawWorkbook, 'Headline Results');
      const tradingSummary = {
        area:        extractTradingRows(rawWorkbook, 'Trading Summary Area Habitats'),
        hedgerows:   extractTradingRows(rawWorkbook, 'Trading Summary Hedgerows'),
        watercourses: extractTradingRows(rawWorkbook, "Trading Summary WaterC's"),
      };

      // Parse all feature data rows (lenient mode tolerates real-world imperfections)
      const features = parseFile(buffer, { validate: false });

      setResult({
        fileName: file.name,
        fileSize: file.size,
        startRows,
        headlineRows,
        tradingSummary,
        features,
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
      <VStack align="start" gap={1} mb={6}>
        <Heading as="h2" size="xl">
          Statutory Metric Viewer
        </Heading>
        <Text color="fg.muted" maxWidth="780px">
          Upload a statutory biodiversity metric calculation file (.xlsm or
          .xlsx) to view its project information and all parsed habitat,
          hedgerow, and watercourse data rows. All processing happens entirely
          in your browser — no data is sent to any server.
        </Text>
      </VStack>

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
