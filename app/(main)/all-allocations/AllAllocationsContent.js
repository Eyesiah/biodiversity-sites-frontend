'use client'

import { useState, useCallback, useMemo } from 'react';
import { formatNumber, calcMedian, calcMean } from '@/lib/format';
import { bootstrapMedianCI } from '@/lib/Stats';
import { XMLBuilder } from 'fast-xml-parser';
import Papa from 'papaparse';
import { triggerDownload } from '@/lib/utils';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { FilteredAllocationsPieChart } from '@/components/charts/FilteredHabitatPieChart'
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import AllocationList from '@/components/data/AllocationList';
import AllocationAnalysis from '@/components/charts/AllocationAnalysis';

const CustomIMDTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#36454F' }}>
          IMD Difference: {label}
        </p>
        <p style={{ margin: '0 0 4px 0', color: '#36454F' }}>
          Count: {data.count}
        </p>
        <p style={{ margin: '0 0 4px 0', color: '#36454F' }}>
          Mean Allocation IMD Score: {data.meanAllocIMD.toFixed(2)}
        </p>
        <p style={{ margin: 0, color: '#36454F' }}>
          Mean Site IMD Score: {data.meanSiteIMD.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

const filterPredicate = (alloc, searchTerm) => {
  const lowercasedTerm = searchTerm.toLowerCase();
  const spatialRiskString = alloc.sr ? `${alloc.sr.cat}${alloc.sr.cat !== 'Outside' ? ` (${alloc.sr.from})` : ''}`.toLowerCase() : '';
  const rbString = Array.isArray(alloc.rb) ? alloc.rb.join(', ').toLowerCase() : (alloc.rb?.toLowerCase() || '');
  return (
    (alloc.srn?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.siteName?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.pr?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.lpa?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.lnrs?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.pn?.toLowerCase() || '').includes(lowercasedTerm) ||
    spatialRiskString.includes(lowercasedTerm) ||
    rbString.includes(lowercasedTerm)
  );
}

export default function AllAllocationsContent({ allocations, siteSupply }) {

  const handleExportXML = (items) => {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const xmlDataStr = builder.build({ allocations: { allocation: items } });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'bgs-allocations.xml');
  };

  const handleExportJSON = (items) => {
    const jsonDataStr = JSON.stringify({ allocations: items }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'bgs-allocations.json');
  };

  const handleExportCSV = (items) => {
    // Sort by BGS site reference so allocations are grouped by site
    const sorted = [...items].sort((a, b) => (a.srn || '').localeCompare(b.srn || ''));

    const csvData = sorted.flatMap(alloc => {
      // Flatten all habitats across all modules for this allocation
      const allHabitats = [];
      if (alloc.habitats) {
        for (const unit of ['areas', 'trees', 'hedgerows', 'watercourses']) {
          if (alloc.habitats[unit]) {
            allHabitats.push(...alloc.habitats[unit]);
          }
        }
      }

      const baseRow = {
        'BGS Reference': alloc.srn ?? '',
        'Site Name': alloc.siteName ?? '',
        'Responsible Bodies': Array.isArray(alloc.rb) ? alloc.rb.join('; ') : (alloc.rb ?? ''),
        'Planning Reference': alloc.pr ?? '',
        'Planning Address': alloc.pn ?? '',
        'LPA': alloc.lpa ?? '',
        'LNRS': alloc.lnrs ?? '',
        'Spatial Risk': alloc.sr ? `${alloc.sr.cat}${alloc.sr.cat !== 'Outside' ? ` (${alloc.sr.from})` : ''}` : '',
        'Allocation IMD Decile': alloc.imd ?? '',
        'Site IMD Decile': alloc.simd ?? '',
        'Distance (km)': typeof alloc.d === 'number' ? formatNumber(alloc.d, 2) : (alloc.d ?? ''),
        'Area HUs': alloc.au && alloc.au > 0 ? formatNumber(alloc.au, 4) : '',
        'Hedgerow HUs': alloc.hu && alloc.hu > 0 ? formatNumber(alloc.hu, 4) : '',
        'Watercourse HUs': alloc.wu && alloc.wu > 0 ? formatNumber(alloc.wu, 4) : '',
      };

      if (allHabitats.length === 0) {
        // No habitat detail available — emit a single row with empty habitat fields
        return [{ ...baseRow, 'Broad Habitat': '', 'Habitat Type': '', 'Module': '', 'Condition': '', 'Habitat Size': '' }];
      }

      // One row per habitat, repeating the allocation-level fields
      return allHabitats.map(habitat => ({
        ...baseRow,
        'Broad Habitat': habitat.broadHabitat ?? '',
        'Habitat Type': habitat.type ?? '',
        'Module': habitat.module ?? '',
        'Condition': habitat.condition ?? '',
        'Habitat Size': habitat.size != null ? formatNumber(habitat.size, 4) : '',
      }));
    });

    // Deduplicate: the same planning application's habitat list is repeated across
    // every BGS site linked to that application. Keep only the first occurrence of
    // each unique (Planning Reference + Module + Habitat Type + Condition + Size).
    const seen = new Set();
    const dedupedCsvData = csvData.filter(row => {
      const key = `${row['Planning Reference']}|${row['Module']}|${row['Habitat Type']}|${row['Condition']}|${row['Habitat Size']}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const csv = Papa.unparse(dedupedCsvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'bgs-allocations.csv');
  };

  const handleExportSummaryCSV = async (items) => {
    const XLSX = await import('xlsx-js-style');

    // Sort by planning reference; deduplicate exact (BGS ref, planning ref) pairs
    const sorted = [...items].sort((a, b) => {
      const srnCmp = (a.srn || '').localeCompare(b.srn || '');
      return srnCmp !== 0 ? srnCmp : (a.pr || '').localeCompare(b.pr || '');
    });
    const seen = new Set();
    const deduped = sorted.filter(alloc => {
      const key = `${alloc.srn}|${alloc.pr}|${alloc.dr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Col 0 = empty spacer; Site HUs (4-6) precede Allocated HUs (7-9)
    const HEADERS = [
      '', 'BGS Reference', 'Planning Reference', 'BGS Allocation Count',
      'Site Area HUs', 'Site Hedgerow HUs', 'Site Watercourse HUs',
      'Allocated Area HUs', 'Allocated Hedgerow HUs', 'Allocated Watercourse HUs',
      '% Area HUs Allocated', '% Hedgerow HUs Allocated', '% Watercourse HUs Allocated',
    ];
    const INT_COLS = new Set([3]);
    const NUM_COLS = new Set([4, 5, 6, 7, 8, 9]);
    const PCT_COLS = new Set([10, 11, 12]);

    const BORDER = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };
    const ALIGN = { horizontal: 'center', vertical: 'center', wrapText: true };
    const HEADER_STYLE = { alignment: ALIGN, fill: { fgColor: { rgb: '36454F' } }, font: { color: { rgb: 'FFFFFF' }, bold: true }, border: BORDER };
    const CELL_STYLE = { alignment: ALIGN, border: BORDER };
    const SUMMARY_STYLE = { alignment: ALIGN, fill: { fgColor: { rgb: 'D9E1F2' } }, font: { bold: true }, border: BORDER };

    // Count allocations per BGS reference (in the deduped/filtered set)
    const bgsCount = {};
    deduped.forEach(alloc => { bgsCount[alloc.srn] = (bgsCount[alloc.srn] || 0) + 1; });

    // Pre-compute all row values so we can derive stats before writing
    // Col layout: 0=empty, 1=BGS ref, 2=PR, 3=count, 4=siteArea, 5=siteHedge, 6=siteWater, 7=allocArea, 8=allocHedge, 9=allocWater, 10=%area, 11=%hedge, 12=%water
    const rowData = deduped.map(alloc => {
      const supply = siteSupply?.[alloc.srn] || {};
      const siteAreaHUs = (supply.areaHUs || 0) + (supply.treeHUs || 0);
      return [
        null,
        alloc.srn ?? '',
        alloc.pr ?? '',
        bgsCount[alloc.srn] ?? null,
        siteAreaHUs > 0 ? siteAreaHUs : null,
        supply.hedgerowHUs > 0 ? supply.hedgerowHUs : null,
        supply.watercourseHUs > 0 ? supply.watercourseHUs : null,
        alloc.au > 0 ? alloc.au : null,
        alloc.hu > 0 ? alloc.hu : null,
        alloc.wu > 0 ? alloc.wu : null,
        siteAreaHUs > 0 ? (alloc.au || 0) / siteAreaHUs : null,
        supply.hedgerowHUs > 0 ? (alloc.hu || 0) / supply.hedgerowHUs : null,
        supply.watercourseHUs > 0 ? (alloc.wu || 0) / supply.watercourseHUs : null,
      ];
    });

    // Null out merged columns on non-first rows within each BGS group
    let prevSrn = null;
    rowData.forEach(row => {
      if (row[1] === prevSrn) { row[1] = null; row[3] = null; row[4] = null; row[5] = null; row[6] = null; }
      prevSrn = row[1] ?? prevSrn;
    });

    // For summary rows: count col uses per-BGS-ref counts (not per-row values)
    const bgsCountValues = Object.values(bgsCount);
    const STAT_COLS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const colArrays = Object.fromEntries(
      STAT_COLS.map(c => [c, rowData.map(row => row[c]).filter(v => v !== null)])
    );
    const colSum = c => colArrays[c].length ? colArrays[c].reduce((s, v) => s + v, 0) : null;
    const colAvg = c => colArrays[c].length ? colArrays[c].reduce((s, v) => s + v, 0) / colArrays[c].length : null;
    const colMedian = c => {
      const arr = colArrays[c];
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const medianOf = arr => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };
    const countSummary = {
      Total:   deduped.length,
      Average: bgsCountValues.length ? bgsCountValues.reduce((s, v) => s + v, 0) / bgsCountValues.length : null,
      Median:  medianOf(bgsCountValues),
    };

    const writeCell = (r, c, v, style) => {
      const isInt = INT_COLS.has(c);
      const isNum = NUM_COLS.has(c);
      const isPct = PCT_COLS.has(c);
      const numeric = v !== null && (isInt || isNum || isPct);
      const cell = { v: v ?? '', t: numeric ? 'n' : 's', s: style };
      if (isInt && v !== null) cell.z = '#,##0';
      if (isNum && v !== null) cell.z = '#,##0.00';
      if (isPct && v !== null) cell.z = '0.00%';
      ws[XLSX.utils.encode_cell({ r, c })] = cell;
    };

    const uniqueBGSCount = Object.keys(bgsCount).length;
    const uniquePRCount = new Set(deduped.map(a => a.pr)).size;

    const writeSummaryRow = (r, label, valFn, countVal, bgsRefCount, prCount) => {
      HEADERS.forEach((_, c) => {
        const v = c === 0 ? label : c === 1 ? (bgsRefCount ?? '') : c === 2 ? (prCount ?? '') : c === 3 ? countVal : valFn(c);
        if ((c === 1 || c === 2) && typeof v === 'number') {
          ws[XLSX.utils.encode_cell({ r, c })] = { v, t: 'n', z: '#,##0', s: SUMMARY_STYLE };
        } else {
          writeCell(r, c, v, SUMMARY_STYLE);
        }
      });
    };

    const ws = {};
    HEADERS.forEach((h, c) => {
      ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: h, t: 's', s: HEADER_STYLE };
    });
    writeSummaryRow(1, 'Total', c => {
      if (c === 10) return colSum(4) > 0 ? colSum(7) / colSum(4) : null;
      if (c === 11) return colSum(5) > 0 ? colSum(8) / colSum(5) : null;
      if (c === 12) return colSum(6) > 0 ? colSum(9) / colSum(6) : null;
      return colSum(c);
    }, countSummary.Total, uniqueBGSCount, uniquePRCount);
    writeSummaryRow(2, 'Average', c => colAvg(c),    countSummary.Average, null, null);
    writeSummaryRow(3, 'Median',  c => colMedian(c), countSummary.Median,  null, null);

    // Merge BGS ref, count and site HU cols across consecutive rows sharing the same BGS ref
    const MERGE_COLS = [1, 3, 4, 5, 6];
    const merges = [];
    // Use original srn values from deduped (rowData[1] is nulled for non-first rows)
    const srnSequence = deduped.map(a => a.srn || '');
    let groupStart = 4;
    srnSequence.forEach((srn, i) => {
      const isLast = i === srnSequence.length - 1;
      if (isLast || srnSequence[i + 1] !== srn) {
        const groupEnd = 4 + i;
        if (groupEnd > groupStart) {
          MERGE_COLS.forEach(c => merges.push({ s: { r: groupStart, c }, e: { r: groupEnd, c } }));
        }
        groupStart = groupEnd + 1;
      }
    });

    let r = 4;
    for (const values of rowData) {
      values.forEach((v, c) => writeCell(r, c, v, CELL_STYLE));
      r++;
    }

    // Summary table at col O (14): one row per unique BGS ref, summed allocation %s
    const BGS_SUMMARY_COL = 14;
    const BGS_SUMMARY_HEADERS = ['BGS Reference', '% Area HUs Allocated', '% Hedgerow HUs Allocated', '% Watercourse HUs Allocated', 'Total % Allocated'];
    BGS_SUMMARY_HEADERS.forEach((h, i) => {
      ws[XLSX.utils.encode_cell({ r: 0, c: BGS_SUMMARY_COL + i })] = { v: h, t: 's', s: HEADER_STYLE };
    });

    const bgsSummed = {};
    deduped.forEach(alloc => {
      if (!bgsSummed[alloc.srn]) bgsSummed[alloc.srn] = { au: 0, hu: 0, wu: 0 };
      bgsSummed[alloc.srn].au += (alloc.au || 0);
      bgsSummed[alloc.srn].hu += (alloc.hu || 0);
      bgsSummed[alloc.srn].wu += (alloc.wu || 0);
    });

    const sortedBGS = Object.keys(bgsSummed).sort();
    const bgsStatArrays = { pctArea: [], pctHedge: [], pctWater: [], pctTotal: [] };
    let totalAllocArea = 0, totalAllocHedge = 0, totalAllocWater = 0;
    let totalSiteArea = 0, totalSiteHedge = 0, totalSiteWater = 0;

    const bgsRows = sortedBGS.map(srn => {
      const supply = siteSupply?.[srn] || {};
      const siteAreaHUs = (supply.areaHUs || 0) + (supply.treeHUs || 0);
      const sums = bgsSummed[srn];
      totalAllocArea += sums.au; totalSiteArea += siteAreaHUs;
      totalAllocHedge += sums.hu; totalSiteHedge += (supply.hedgerowHUs || 0);
      totalAllocWater += sums.wu; totalSiteWater += (supply.watercourseHUs || 0);
      const pctArea  = siteAreaHUs > 0         ? sums.au / siteAreaHUs         : null;
      const pctHedge = supply.hedgerowHUs > 0   ? sums.hu / supply.hedgerowHUs   : null;
      const pctWater = supply.watercourseHUs > 0 ? sums.wu / supply.watercourseHUs : null;
      const totalSiteHUs = siteAreaHUs + (supply.hedgerowHUs || 0) + (supply.watercourseHUs || 0);
      const pctTotal = totalSiteHUs > 0 ? (sums.au + sums.hu + sums.wu) / totalSiteHUs : null;
      if (pctArea  !== null) bgsStatArrays.pctArea.push(pctArea);
      if (pctHedge !== null) bgsStatArrays.pctHedge.push(pctHedge);
      if (pctWater !== null) bgsStatArrays.pctWater.push(pctWater);
      if (pctTotal !== null) bgsStatArrays.pctTotal.push(pctTotal);
      return { srn, pctArea, pctHedge, pctWater, pctTotal };
    });

    const bgsAvg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    const bgsMedian = arr => {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const bgsPctCell = (v, style) => ({ v: v ?? '', t: v !== null ? 'n' : 's', z: '0.00%', s: style });
    const bgsSummaryLabel = (v) => ({ v, t: 's', s: SUMMARY_STYLE });

    const totalPctArea  = totalSiteArea  > 0 ? totalAllocArea  / totalSiteArea  : null;
    const totalPctHedge = totalSiteHedge > 0 ? totalAllocHedge / totalSiteHedge : null;
    const totalPctWater = totalSiteWater > 0 ? totalAllocWater / totalSiteWater : null;
    const totalAllHUs = totalSiteArea + totalSiteHedge + totalSiteWater;
    const totalPctSum = totalAllHUs > 0 ? (totalAllocArea + totalAllocHedge + totalAllocWater) / totalAllHUs : null;

    [[1, 'Total',   [totalPctArea, totalPctHedge, totalPctWater, totalPctSum]],
     [2, 'Average', [bgsAvg(bgsStatArrays.pctArea), bgsAvg(bgsStatArrays.pctHedge), bgsAvg(bgsStatArrays.pctWater), bgsAvg(bgsStatArrays.pctTotal)]],
     [3, 'Median',  [bgsMedian(bgsStatArrays.pctArea), bgsMedian(bgsStatArrays.pctHedge), bgsMedian(bgsStatArrays.pctWater), bgsMedian(bgsStatArrays.pctTotal)]],
    ].forEach(([row, label, vals]) => {
      ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL })] = bgsSummaryLabel(label);
      vals.forEach((v, i) => { ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL + 1 + i })] = bgsPctCell(v, SUMMARY_STYLE); });
    });

    bgsRows.sort((a, b) => (b.pctTotal ?? -Infinity) - (a.pctTotal ?? -Infinity));

    bgsRows.forEach(({ srn, pctArea, pctHedge, pctWater, pctTotal }, i) => {
      const row = i + 4;
      ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL })]     = { v: srn, t: 's', s: CELL_STYLE };
      ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL + 1 })] = bgsPctCell(pctArea, CELL_STYLE);
      ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL + 2 })] = bgsPctCell(pctHedge, CELL_STYLE);
      ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL + 3 })] = bgsPctCell(pctWater, CELL_STYLE);
      ws[XLSX.utils.encode_cell({ r: row, c: BGS_SUMMARY_COL + 4 })] = bgsPctCell(pctTotal, CELL_STYLE);
    });

    const lastRow = Math.max(r - 1, sortedBGS.length + 3);
    const lastCol = BGS_SUMMARY_COL + BGS_SUMMARY_HEADERS.length - 1;
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
    if (r > 5) merges.push({ s: { r: 4, c: 0 }, e: { r: r - 1, c: 0 } });
    if (merges.length) ws['!merges'] = merges;
    ws['!sheetViews'] = [{ state: 'frozen', ySplit: 4, topLeftCell: 'A5' }];
    ws['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 4 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 24 }, { wch: 16 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Allocations');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(blob, 'bgs-allocations-summary.xlsx');
  };

  const calcSummaryData = useCallback((filteredAllocations) => {

    const totalArea = filteredAllocations.reduce((sum, alloc) => sum + (alloc.au || 0), 0);
    const totalHedgerow = filteredAllocations.reduce((sum, alloc) => sum + (alloc.hu || 0), 0);
    const totalWatercourse = filteredAllocations.reduce((sum, alloc) => sum + (alloc.wu || 0), 0);

    const uniquePlanningRefs = new Set(filteredAllocations.map(alloc => alloc.pr)).size;
    const totalUniquePlanningRefs = new Set(allocations.map(alloc => alloc.pr)).size;

    let medianDistance = calcMedian(filteredAllocations, 'd');
    let meanIMD = calcMean(filteredAllocations, 'imd');
    let meanSiteIMD = calcMean(filteredAllocations, 'simd');

    return {
      totalArea,
      totalHedgerow,
      totalWatercourse,
      medianDistance,
      meanIMD,
      meanSiteIMD,
      uniquePlanningRefs,
      totalUniquePlanningRefs,
    };
  }, [allocations]);

  const [summaryData, setSummaryData] = useState(calcSummaryData(allocations));
  const [binWidth, setBinWidth] = useState(2);

  const handleSortedItemsChange = useCallback((sortedItems) => {
    setSummaryData(calcSummaryData(sortedItems));
  }, [calcSummaryData]);

  const calcIMDHistogramData = useCallback((filteredAllocations, binWidth = 1) => {
    // Calculate IMD differences (Site IMD - Allocation IMD) for histogram
    const validAllocations = filteredAllocations.filter(alloc =>
      typeof alloc.simdS === 'number' && typeof alloc.imdS === 'number' &&
      alloc.simdS !== 'N/A' && alloc.imdS !== 'N/A'
    );

    // Group by configurable bin width
    const diffCounts = {};
    const diffAllocIMDs = {};
    const diffSiteIMDs = {};
    let minDiff = -10;
    let maxDiff = 10;
    validAllocations.forEach(alloc => {
      const rawDiff = alloc.simdS - alloc.imdS;
      const diff = Math.round(rawDiff / binWidth) * binWidth;
      minDiff = Math.min(minDiff, diff);
      maxDiff = Math.max(maxDiff, diff);
      diffCounts[diff] = (diffCounts[diff] || 0) + 1;
      if (!diffAllocIMDs[diff]) diffAllocIMDs[diff] = [];
      if (!diffSiteIMDs[diff]) diffSiteIMDs[diff] = [];
      diffAllocIMDs[diff].push(alloc.imdS);
      diffSiteIMDs[diff].push(alloc.simdS);
    });

    // Convert to chart data format
    const chartData = [];
    for (let i = minDiff; i <= maxDiff; i += binWidth) {
      if (diffCounts[i] || i === 0) { // Include 0 even if no data
        const allocIMDs = diffAllocIMDs[i] || [];
        const siteIMDs = diffSiteIMDs[i] || [];
        const meanAllocIMD = allocIMDs.length > 0 ? allocIMDs.reduce((sum, val) => sum + val, 0) / allocIMDs.length : 0;
        const meanSiteIMD = siteIMDs.length > 0 ? siteIMDs.reduce((sum, val) => sum + val, 0) / siteIMDs.length : 0;

        chartData.push({
          name: i === 0 ? '0' : i.toString(),
          count: diffCounts[i] || 0,
          meanAllocIMD: meanAllocIMD,
          meanSiteIMD: meanSiteIMD
        });
      }
    }

    // Calculate IMD statistics
    if (validAllocations.length > 0) {
      const differences = validAllocations.map(alloc => alloc.simdS - alloc.imdS);
      const meanDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;

      // Calculate median difference
      const sortedDifferences = [...differences].sort((a, b) => a - b);
      const medianDiff = sortedDifferences.length % 2 === 0
        ? (sortedDifferences[sortedDifferences.length / 2 - 1] + sortedDifferences[sortedDifferences.length / 2]) / 2
        : sortedDifferences[Math.floor(sortedDifferences.length / 2)];

      // Calculate 95% confidence interval for median
      const medianCI = bootstrapMedianCI(differences);

      // Calculate correlation between site IMD and allocation IMD scores
      const siteIMDs = validAllocations.map(alloc => alloc.simdS);
      const allocIMDs = validAllocations.map(alloc => alloc.imdS);

      const meanSiteIMD = siteIMDs.reduce((sum, val) => sum + val, 0) / siteIMDs.length;
      const meanAllocIMD = allocIMDs.reduce((sum, val) => sum + val, 0) / allocIMDs.length;

      let correlation = 0;
      let numerator = 0;
      let denom1 = 0;
      let denom2 = 0;

      for (let i = 0; i < validAllocations.length; i++) {
        const siteDiff = siteIMDs[i] - meanSiteIMD;
        const allocDiff = allocIMDs[i] - meanAllocIMD;
        numerator += siteDiff * allocDiff;
        denom1 += siteDiff * siteDiff;
        denom2 += allocDiff * allocDiff;
      }

      if (denom1 > 0 && denom2 > 0) {
        correlation = numerator / Math.sqrt(denom1 * denom2);
      }

      const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - meanDiff, 2), 0) / differences.length;
      const stdDevDiff = Math.sqrt(variance);

      return {
        chartData,
        stats: {
          count: validAllocations.length,
          correlation,
          meanDifference: meanDiff,
          medianDifference: medianDiff,
          medianCI,
          stdDevDifference: stdDevDiff
        }
      };
    }

    return { chartData: [], stats: {} };
  }, []);

  const tabs = [
    {
      title: 'All Allocations',
      content: ({ sortedItems, requestSort, sortConfig }) => <AllocationList sortedItems={sortedItems} requestSort={requestSort} sortConfig={sortConfig} summaryData={summaryData} />
    },
    {
      title: 'Area<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='areas' name='Area' />
    },
    {
      title: 'Tree<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='trees' name='Individual Tree' />
    },
    {
      title: 'Hedgerow<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='hedgerows' name='Hedgerow' />
    },
    {
      title: 'Watercourse<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='watercourses' name='Watercourse' />
    },
    {
      title: 'Analysis Charts',
      content: ({ sortedItems }) => <AllocationAnalysis allocations={sortedItems} />
    },
    {
      title: 'IMD Score Transfers Histogram',
      content: ({ sortedItems }) => {
        const { chartData, stats } = calcIMDHistogramData(sortedItems, binWidth);
        return (
          <>            
            <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 50, right: 30, left: 20, bottom: 15 }} barCategoryGap={0}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" name="IMD Difference" label={{ value: 'Site IMD Score - Allocation IMD Score', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                  <YAxis tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                  <Tooltip content={<CustomIMDTooltip />} />
                  <Bar dataKey="count" fill="#afcd81ff">
                    <LabelList />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {stats.count && stats.count > 0 && (
              <Box marginTop="6" border="1px" borderColor="#e2e8f0" borderRadius="md" padding="4">
                <Text fontSize="1.1rem" fontWeight="bold" color="#36454F" marginBottom="4" textAlign="center">
                  IMD Score Transfer Histogram - a negative value indicates a transfer to a less-deprived LSOA. A positive value indicates a transfer to a more-deprived LSOA.
                </Text>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing="4">
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Allocation Count</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{formatNumber(stats.count, 0)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Correlation</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.correlation?.toFixed(4)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Mean Difference</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.meanDifference?.toFixed(4)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Median Difference</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.medianDifference?.toFixed(4)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Median 95% Confidence Interval</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                      {stats.medianCI?.lower !== null && stats.medianCI?.upper !== null
                        ? `${stats.medianCI.lower.toFixed(4)} - ${stats.medianCI.upper.toFixed(4)}`
                        : 'N/A'}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Standard Deviation Difference</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.stdDevDifference?.toFixed(4)}</Text>
                  </Box>
                </SimpleGrid>
              </Box>
            )}
          </>
        );
      }
    },

  ]

  return (
    <SearchableTableLayout
      initialItems={allocations}
      filterPredicate={filterPredicate}
      initialSortConfig={{ key: 'srn', direction: 'ascending' }}
      placeholder="Filter by BGS Ref, Site Name, Responsible Body, Planning Ref, Planning Address, LPA, LNRS or Spatial Risk ..."
      exportConfig={{ onExportXml: handleExportXML, onExportJson: handleExportJSON, onExportCsv: handleExportCSV, onExportCsvSummary: handleExportSummaryCSV }}
      summary={(filteredCount, totalCount) => (
        <Box textAlign='center'>
          <Text fontSize='1.2rem'>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> out of <strong>{formatNumber(totalCount, 0)}</strong> allocations arising from <strong>{formatNumber(summaryData.uniquePlanningRefs,0)}</strong> out of <strong>{formatNumber(summaryData.totalUniquePlanningRefs,0)}</strong> planning applications.</Text>
        </Box>
      )}
      onSortedItemsChange={handleSortedItemsChange}
      tabs={tabs}
    />
  );
}
