import { formatNumber } from '@/lib/format';
import { formatAreaWithTreeCount, formatTreeCountWithTooltipData } from '@/lib/tree-utils';
import { DataTable } from '@/components/styles/DataTable';
import { Box } from '@chakra-ui/react';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Tooltip from '../ui/Tooltip';

// Helper function to format tree count with tooltip
const formatTreeCountWithTooltip = (area) => {
  const { display, tooltipText } = formatTreeCountWithTooltipData(area);
  return <Tooltip text={tooltipText}>{display}</Tooltip>;
};

export const HabitatSummaryTable = ({ site }) => {

  const habitats = site.habitats || {};
  const improvements = site.improvements || {};
  const allocations = site.allocations || [];

  const baselineArea = habitats.areas.reduce((acc, h) => acc + h.size, 0);
  const baselineIndividualTrees = (habitats.trees || []).reduce((acc, h) => acc + h.size, 0);
  const baselineHedgerow = (habitats.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const baselineWatercourse = (habitats.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const baselineAreaParcels = habitats.areas.reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineIndividualTreesParcels = (habitats.trees || []).reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineHedgerowParcels = (habitats.hedgerows || []).reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineWatercourseParcels = (habitats.watercourses || []).reduce((acc, h) => acc + (h.parcels || 1), 0);

  const baselineAreaHUs = habitats.areas.reduce((acc, h) => acc + h.HUs, 0);
  const baselineIndividualTreesHUs = (habitats.trees || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineHedgerowHUs = (habitats.hedgerows || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineWatercourseHUs = (habitats.watercourses || []).reduce((acc, h) => acc + h.HUs, 0);

  const improvementArea = (improvements.areas || []).reduce((acc, h) => acc + h.size, 0);
  const improvementTrees = (improvements.trees || []).reduce((acc, h) => acc + h.size, 0);
  const improvementHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const improvementWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const createdArea = (improvements.areas || []).reduce((acc, h) => acc + (h.createdSize || 0), 0);
  const createdTrees = (improvements.trees || []).reduce((acc, h) => acc + (h.createdSize || 0), 0);
  const createdHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.createdSize || 0), 0);
  const createdWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + (h.createdSize || 0), 0);

  const enhancedArea = (improvements.areas || []).reduce((acc, h) => acc + (h.enhancedSize || 0), 0);
  const enhancedTrees = (improvements.trees || []).reduce((acc, h) => acc + (h.enhancedSize || 0), 0);
  const enhancedHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.enhancedSize || 0), 0);
  const enhancedWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + (h.enhancedSize || 0), 0);

  const createdAreaHUs = (improvements.areas || []).reduce((acc, h) => acc + (h.createdHUs || 0), 0);
  const createdTreesHUs = (improvements.trees || []).reduce((acc, h) => acc + (h.createdHUs || 0), 0);
  const createdHedgerowHUs = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.createdHUs || 0), 0);
  const createdWatercourseHUs = (improvements.watercourses || []).reduce((acc, h) => acc + (h.createdHUs || 0), 0);

  const enhancedAreaHUs = (improvements.areas || []).reduce((acc, h) => acc + (h.enhancedHUs || 0), 0);
  const enhancedTreesHUs = (improvements.trees || []).reduce((acc, h) => acc + (h.enhancedHUs || 0), 0);
  const enhancedHedgerowHUs = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.enhancedHUs || 0), 0);
  const enhancedWatercourseHUs = (improvements.watercourses || []).reduce((acc, h) => acc + (h.enhancedHUs || 0), 0);

  const improvementAreaHUs = (improvements.areas || []).reduce((acc, h) => acc + h.HUs, 0);
  const improvementTreesHUs = (improvements.trees || []).reduce((acc, h) => acc + h.HUs, 0);
  const improvementHedgerowHUs = (improvements.hedgerows || []).reduce((acc, h) => acc + h.HUs, 0);
  const improvementWatercourseHUs = (improvements.watercourses || []).reduce((acc, h) => acc + h.HUs, 0);

  const improvementAreaHUGain = (improvements.areas || []).reduce((acc, h) => acc + h.HUs - h.baselineHUs, 0);
  const improvementTreesHUGain = (improvements.trees || []).reduce((acc, h) => acc + h.HUs - h.baselineHUs, 0);
  const improvementHedgerowHUGain = (improvements.hedgerows || []).reduce((acc, h) => acc + h.HUs - h.baselineHUs, 0);
  const improvementWatercourseHUGain = (improvements.watercourses || []).reduce((acc, h) => acc + h.HUs - h.baselineHUs, 0);

  let allocationArea = 0;
  let allocationHedgerow = 0;
  let allocationWatercourse = 0;
  let allocationIndividualTrees = 0;
  let allocationAreaHUs = 0;
  let allocationHedgerowHUs = 0;
  let allocationWatercourseHUs = 0;
  if (site.allocations != null) {
    // use the allocations themselves
    allocationArea = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.areas?.reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);
    allocationHedgerow = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.hedgerows?.reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);
    allocationWatercourse = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.watercourses?.reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);

    allocationAreaHUs = allocations.reduce((acc, a) => acc + a.areaUnits, 0);
    allocationHedgerowHUs = allocations.reduce((acc, a) => acc + a.hedgerowUnits, 0);
    allocationWatercourseHUs = allocations.reduce((acc, a) => acc + a.watercoursesUnits, 0);
  } else {
    // fall back to the improvement habitats' allocated data
    allocationArea = (improvements.areas || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    // Use proportional allocated HUs (allocatedHUs = HUs × allocated fraction, computed in collateHabitats)
    allocationAreaHUs = (improvements.areas || []).reduce((acc, h) => acc + (h.allocatedHUs || 0), 0);
    allocationHedgerowHUs = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.allocatedHUs || 0), 0);
    allocationWatercourseHUs = (improvements.watercourses || []).reduce((acc, h) => acc + (h.allocatedHUs || 0), 0);
  }

  // Individual trees allocation size and HUs are always derived from improvement trees' allocated data,
  // since processSiteHabitatData populates allocatedSize on improvement trees and there is no separate
  // treeUnits field on the allocation API object.
  allocationIndividualTrees = (improvements.trees || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
  const allocationTreesHUs = (improvements.trees || []).reduce((acc, h) => acc + (h.allocatedHUs || 0), 0);

  const hasAllocs = allocationArea > 0 || allocationHedgerow > 0 || allocationWatercourse > 0 || allocationIndividualTrees > 0 || site.allocations != null;
  const hasAllocHUs = allocationAreaHUs > 0 || allocationHedgerowHUs > 0 || allocationWatercourseHUs > 0 || allocationTreesHUs > 0;
  const hasIndividualTrees = baselineIndividualTrees > 0 || improvementTrees > 0 || allocationIndividualTrees > 0;
  const hasArea = baselineArea > 0 || improvementArea > 0 || allocationArea > 0;
  const hasHedgerow = baselineHedgerow > 0 || improvementHedgerow > 0 || allocationHedgerow > 0;
  const hasWatercourse = baselineWatercourse > 0 || improvementWatercourse > 0 || allocationWatercourse > 0;

  // Totals (only summing rows that are actually rendered)
  const totalParcels = (hasArea ? baselineAreaParcels : 0) + (hasIndividualTrees ? baselineIndividualTreesParcels : 0) + (hasHedgerow ? baselineHedgerowParcels : 0) + (hasWatercourse ? baselineWatercourseParcels : 0);
  const totalBaselineHUs = (hasArea ? baselineAreaHUs : 0) + (hasIndividualTrees ? baselineIndividualTreesHUs : 0) + (hasHedgerow ? baselineHedgerowHUs : 0) + (hasWatercourse ? baselineWatercourseHUs : 0);
  const totalCreatedHUs = (hasArea ? createdAreaHUs : 0) + (hasIndividualTrees ? createdTreesHUs : 0) + (hasHedgerow ? createdHedgerowHUs : 0) + (hasWatercourse ? createdWatercourseHUs : 0);
  const totalEnhancedHUs = (hasArea ? enhancedAreaHUs : 0) + (hasIndividualTrees ? enhancedTreesHUs : 0) + (hasHedgerow ? enhancedHedgerowHUs : 0) + (hasWatercourse ? enhancedWatercourseHUs : 0);
  const totalImprovementHUs = (hasArea ? improvementAreaHUs : 0) + (hasIndividualTrees ? improvementTreesHUs : 0) + (hasHedgerow ? improvementHedgerowHUs : 0) + (hasWatercourse ? improvementWatercourseHUs : 0);
  const totalHUGain = (hasArea ? improvementAreaHUGain : 0) + (hasIndividualTrees ? improvementTreesHUGain : 0) + (hasHedgerow ? improvementHedgerowHUGain : 0) + (hasWatercourse ? improvementWatercourseHUGain : 0);
  const totalAllocationHUs = (hasAllocHUs && hasArea ? allocationAreaHUs : 0) + (hasAllocHUs && hasIndividualTrees ? allocationTreesHUs : 0) + (hasAllocHUs && hasHedgerow ? allocationHedgerowHUs : 0) + (hasAllocHUs && hasWatercourse ? allocationWatercourseHUs : 0);

  const headerFontSize = '14px';

  return (
    <Box overflowX="auto" display="flex" justifyContent="center">
      <DataTable.Root width="auto" margin="0" style={{ border: "3px solid #878080" }}>
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader fontSize={headerFontSize} rowSpan={2}><GlossaryTooltip term='Habitat'>Habitat</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize} rowSpan={2}># <GlossaryTooltip term='Parcel'>Parcels</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize} colSpan={4 + (hasAllocs ? 2 : 0)} textAlign="center" style={{ borderLeft: "3px solid #878080" }}>Size</DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize} colSpan={5 + (hasAllocHUs ? 2 : 0)} textAlign="center" style={{ borderLeft: "3px solid #878080" }}>Habitat Units</DataTable.ColumnHeader>
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.ColumnHeader fontSize={headerFontSize} style={{ borderLeft: "3px solid #878080" }}><GlossaryTooltip term='Baseline habitat'>Baseline</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Created</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Enhanced</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Improvements</GlossaryTooltip></DataTable.ColumnHeader>
            {hasAllocs && <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Allocation'>Allocations</GlossaryTooltip></DataTable.ColumnHeader>}
            {hasAllocs && <DataTable.ColumnHeader fontSize={headerFontSize}>% <GlossaryTooltip term='Allocation'>Allocated</GlossaryTooltip></DataTable.ColumnHeader>}
            <DataTable.ColumnHeader fontSize={headerFontSize} style={{ borderLeft: "3px solid #878080" }}><GlossaryTooltip term='Baseline habitat'>Baseline</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Created</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Enhanced</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Improvements</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='HU Gain'>HU Gain</GlossaryTooltip></DataTable.ColumnHeader>
            {hasAllocHUs && <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Allocation'>Allocations</GlossaryTooltip></DataTable.ColumnHeader>}
            {hasAllocHUs && <DataTable.ColumnHeader fontSize={headerFontSize}>% <GlossaryTooltip term='Allocation'>Allocated</GlossaryTooltip></DataTable.ColumnHeader>}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {hasArea && <DataTable.Row>
            <DataTable.Cell>Areas</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineAreaParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineArea, 2)} ha</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdArea, 2)} ha</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedArea, 2)} ha</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementArea, 2)} ha</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationArea, 2)} ha</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementArea > 0 ? formatNumber((allocationArea / improvementArea) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineAreaHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdAreaHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedAreaHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementAreaHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementAreaHUGain, 2)}</DataTable.NumericCell>
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationAreaHUs)}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{improvementAreaHUs > 0 ? formatNumber((allocationAreaHUs / improvementAreaHUs) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasIndividualTrees && <DataTable.Row>
            <DataTable.Cell>Individual trees</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineIndividualTreesParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>
              {formatTreeCountWithTooltip(baselineIndividualTrees)}
            </DataTable.NumericCell>
            <DataTable.NumericCell>
              {formatTreeCountWithTooltip(createdTrees)}
            </DataTable.NumericCell>
            <DataTable.NumericCell>
              {formatTreeCountWithTooltip(enhancedTrees)}
            </DataTable.NumericCell>
            <DataTable.NumericCell>
              {formatTreeCountWithTooltip(improvementTrees)}
            </DataTable.NumericCell>
            {hasAllocs && (
              <DataTable.NumericCell>
                {formatTreeCountWithTooltip(allocationIndividualTrees)}
              </DataTable.NumericCell>
            )}
            {hasAllocs && <DataTable.NumericCell>{improvementTrees > 0 ? formatNumber((allocationIndividualTrees / improvementTrees) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineIndividualTreesHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdTreesHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedTreesHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementTreesHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementTreesHUGain, 2)}</DataTable.NumericCell>
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationTreesHUs)}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{improvementTreesHUs > 0 ? formatNumber((allocationTreesHUs / improvementTreesHUs) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasHedgerow && <DataTable.Row>
            <DataTable.Cell>Hedgerows</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineHedgerow, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdHedgerow, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedHedgerow, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerow, 2)} km</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationHedgerow, 2)} km</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementHedgerow > 0 ? formatNumber((allocationHedgerow / improvementHedgerow) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineHedgerowHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdHedgerowHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedHedgerowHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerowHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerowHUGain, 2)}</DataTable.NumericCell>
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationHedgerowHUs)}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{improvementHedgerowHUs > 0 ? formatNumber((allocationHedgerowHUs / improvementHedgerowHUs) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasWatercourse && <DataTable.Row>
            <DataTable.Cell>Watercourses</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineWatercourse, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdWatercourse, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedWatercourse, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourse, 2)} km</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationWatercourse, 2)} km</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementWatercourse > 0 ? formatNumber((allocationWatercourse / improvementWatercourse) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            <DataTable.NumericCell style={{ borderLeft: "3px solid #878080" }}>{formatNumber(baselineWatercourseHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(createdWatercourseHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(enhancedWatercourseHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourseHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourseHUGain, 2)}</DataTable.NumericCell>
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationWatercourseHUs)}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{improvementWatercourseHUs > 0 ? formatNumber((allocationWatercourseHUs / improvementWatercourseHUs) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
          </DataTable.Row>}
          <DataTable.Row fontWeight="bold" bg="tableTotalsBg" style={{ borderTop: "3px solid #878080" }}>
            <DataTable.Cell fontWeight="bold">Totals</DataTable.Cell>
            <DataTable.NumericCell fontWeight="bold">{formatNumber(totalParcels, 0)}</DataTable.NumericCell>
            <DataTable.Cell style={{ borderLeft: "3px solid #878080" }} />
            <DataTable.Cell />
            <DataTable.Cell />
            <DataTable.Cell />
            {hasAllocs && <DataTable.Cell />}
            {hasAllocs && <DataTable.Cell />}
            <DataTable.NumericCell fontWeight="bold" style={{ borderLeft: "3px solid #878080" }}>{formatNumber(totalBaselineHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell fontWeight="bold">{formatNumber(totalCreatedHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell fontWeight="bold">{formatNumber(totalEnhancedHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell fontWeight="bold">{formatNumber(totalImprovementHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell fontWeight="bold">{formatNumber(totalHUGain, 2)}</DataTable.NumericCell>
            {hasAllocHUs && <DataTable.NumericCell fontWeight="bold">{formatNumber(totalAllocationHUs)}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell fontWeight="bold">{totalImprovementHUs > 0 ? formatNumber((totalAllocationHUs / totalImprovementHUs) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
          </DataTable.Row>
        </DataTable.Body>
      </DataTable.Root>
    </Box>
  );
};
