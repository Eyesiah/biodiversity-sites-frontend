import { formatNumber } from '@/lib/format';
import { DataTable } from '@/components/styles/DataTable';
import { Box } from '@chakra-ui/react';

export const HabitatSummaryTable = ({ site }) => {

  const habitats = site.habitats || {};
  const improvements = site.improvements || {};
  const allocations = site.allocations || [];

  // Filter out Urban tree and Rural tree from Areas calculations since they're now in Individual Trees row
  const areasHabitats = (habitats.areas || []).filter(h => h.type !== 'Urban tree' && h.type !== 'Rural tree');
  const baselineArea = areasHabitats.reduce((acc, h) => acc + h.area, 0);
  const baselineHedgerow = (habitats.hedgerows || []).reduce((acc, h) => acc + h.area, 0);
  const baselineWatercourse = (habitats.watercourses || []).reduce((acc, h) => acc + h.area, 0);

  const baselineAreaParcels = areasHabitats.reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineHedgerowParcels = (habitats.hedgerows || []).reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineWatercourseParcels = (habitats.watercourses || []).reduce((acc, h) => acc + (h.parcels || 1), 0);

  const baselineAreaHUs = areasHabitats.reduce((acc, h) => acc + h.HUs, 0);
  const baselineHedgerowHUs = (habitats.hedgerows || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineWatercourseHUs = (habitats.watercourses || []).reduce((acc, h) => acc + h.HUs, 0);

  // Calculate Individual Trees (Urban tree + Rural tree) data
  const individualTreesHabitats = habitats.trees || (habitats.areas || []).filter(h => h.type === 'Urban tree' || h.type === 'Rural tree');
  const baselineIndividualTrees = individualTreesHabitats.reduce((acc, h) => acc + h.area, 0);
  const baselineIndividualTreesParcels = individualTreesHabitats.reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineIndividualTreesHUs = individualTreesHabitats.reduce((acc, h) => acc + h.HUs, 0);

  // Filter out Urban tree and Rural tree from Areas improvements since they're now in Individual Trees row
  const areasImprovements = (improvements.areas || []).filter(h => h.type !== 'Urban tree' && h.type !== 'Rural tree');
  const improvementArea = areasImprovements.reduce((acc, h) => acc + h.area, 0);
  const improvementHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + h.area, 0);
  const improvementWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + h.area, 0);

  // Calculate Individual Trees improvements
  const individualTreesImprovements = improvements.trees || (improvements.areas || []).filter(h => h.type === 'Urban tree' || h.type === 'Rural tree');
  const improvementIndividualTrees = individualTreesImprovements.reduce((acc, h) => acc + h.area, 0);

  let allocationArea = 0;
  let allocationHedgerow = 0;
  let allocationWatercourse = 0;
  let allocationIndividualTrees = 0;
  let allocationAreaHUs = 0;
  let allocationHedgerowHUs = 0;
  let allocationWatercourseHUs = 0;
  if (site.allocations != null) {
    // use the allocations themselves - filter out Urban tree and Rural tree since they're in Individual Trees row
    allocationArea = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.areas?.filter(ha => ha.type !== 'Urban tree' && ha.type !== 'Rural tree').reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);
    allocationHedgerow = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.hedgerows?.reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);
    allocationWatercourse = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.watercourses?.reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);
    allocationIndividualTrees = allocations.reduce((acc, a) => {
      return acc + (a.habitats?.areas?.filter(ha => ha.type === 'Urban tree' || ha.type === 'Rural tree').reduce((acc, ha) => acc + ha.size, 0) || 0);
    }, 0);

    allocationAreaHUs = allocations.reduce((acc, a) => acc + a.areaUnits, 0);
    allocationHedgerowHUs = allocations.reduce((acc, a) => acc + a.hedgerowUnits, 0);
    allocationWatercourseHUs = allocations.reduce((acc, a) => acc + a.watercoursesUnits, 0);
  } else {
    // fall back to the improvement habitats' allocated data - filter out Urban tree and Rural tree since they're in Individual Trees row
    allocationArea = areasImprovements.reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationIndividualTrees = individualTreesImprovements.reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
  }

  const hasAllocs = allocationArea > 0 || allocationHedgerow > 0 || allocationWatercourse > 0 || allocationIndividualTrees > 0 || site.allocations != null;
  const hasAllocHUs = allocationAreaHUs > 0 || allocationHedgerowHUs > 0 || allocationWatercourseHUs > 0;
  const hasIndividualTrees = baselineIndividualTrees > 0 || improvementIndividualTrees > 0 || allocationIndividualTrees > 0;
  const hasArea = baselineArea > 0 || improvementArea > 0 || allocationArea > 0;
  const hasHedgerow = baselineHedgerow > 0 || improvementHedgerow > 0 || allocationHedgerow > 0;
  const hasWatercourse = baselineWatercourse > 0 || improvementWatercourse > 0 || allocationWatercourse > 0;

  const headerFontSize = '14px';

  return (
    <Box overflowX="auto">
      <DataTable.Root width="auto" margin="0">
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader fontSize={headerFontSize}>Habitat</DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}># Parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}>Baseline Size</DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}>Baseline HUs</DataTable.ColumnHeader>            
            <DataTable.ColumnHeader fontSize={headerFontSize}>Retained Size</DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}>Improvements Size</DataTable.ColumnHeader>
            {hasAllocs && <DataTable.ColumnHeader fontSize={headerFontSize}>Allocations Size</DataTable.ColumnHeader>}
            {hasAllocs && <DataTable.ColumnHeader fontSize={headerFontSize}>% Allocated</DataTable.ColumnHeader>}
            {hasAllocHUs && <DataTable.ColumnHeader fontSize={headerFontSize}>Allocations HUs</DataTable.ColumnHeader>}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {hasArea && <DataTable.Row>
            <DataTable.Cell>Areas (ha)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineAreaParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineArea, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineAreaHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell color={baselineArea - improvementArea < 0 ? "red.500" : undefined}>{formatNumber(baselineArea - improvementArea, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementArea, 2)}</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationArea, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementArea > 0 ? formatNumber((allocationArea / improvementArea) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationAreaHUs)}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasIndividualTrees && <DataTable.Row>
            <DataTable.Cell>Individual trees (ha)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineIndividualTreesParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineIndividualTrees, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineIndividualTreesHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineIndividualTrees - improvementIndividualTrees), 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementIndividualTrees, 2)}</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationIndividualTrees, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementIndividualTrees > 0 ? formatNumber((allocationIndividualTrees / improvementIndividualTrees) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(0)}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasHedgerow && <DataTable.Row>
            <DataTable.Cell>Hedgerows (km)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerow, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineHedgerow - improvementHedgerow), 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerow, 2)}</DataTable.NumericCell>            
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationHedgerow, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementHedgerow > 0 ? formatNumber((allocationHedgerow / improvementHedgerow) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationHedgerowHUs)}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasWatercourse && <DataTable.Row>
            <DataTable.Cell>Watercourses (km)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourse, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineWatercourse - improvementWatercourse), 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourse, 2)}</DataTable.NumericCell>            
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationWatercourse, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementWatercourse > 0 ? formatNumber((allocationWatercourse / improvementWatercourse) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationWatercourseHUs)}</DataTable.NumericCell>}
          </DataTable.Row>}
        </DataTable.Body>
      </DataTable.Root>
    </Box>
  );
};
