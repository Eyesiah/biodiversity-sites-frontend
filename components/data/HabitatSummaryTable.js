import { formatNumber } from '@/lib/format';
import { DataTable } from '@/components/styles/DataTable';
import { Box } from '@chakra-ui/react';

export const HabitatSummaryTable = ({ site }) => {

  const habitats = site.habitats || {};
  const improvements = site.improvements || {};
  const allocations = site.allocations || [];

  const baselineArea = (habitats.areas || []).reduce((acc, h) => acc + h.area, 0);
  const baselineHedgerow = (habitats.hedgerows || []).reduce((acc, h) => acc + h.area, 0);
  const baselineWatercourse = (habitats.watercourses || []).reduce((acc, h) => acc + h.area, 0);

  const baselineAreaParcels = (habitats.areas || []).reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineHedgerowParcels = (habitats.hedgerows || []).reduce((acc, h) => acc + (h.parcels || 1), 0);
  const baselineWatercourseParcels = (habitats.watercourses || []).reduce((acc, h) => acc + (h.parcels || 1), 0);

  const baselineAreaHUs = (habitats.areas || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineHedgerowHUs = (habitats.hedgerows || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineWatercourseHUs = (habitats.watercourses || []).reduce((acc, h) => acc + h.HUs, 0);

  const improvementArea = (improvements.areas || []).reduce((acc, h) => acc + h.area, 0);
  const improvementHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + h.area, 0);
  const improvementWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + h.area, 0);

  let allocationArea = 0;
  let allocationHedgerow = 0;
  let allocationWatercourse = 0;
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
  }

  const hasAllocs = allocationArea > 0 || allocationHedgerow > 0 || allocationWatercourse > 0 || site.allocations != null;
  const hasAllocHUs = allocationAreaHUs > 0 || allocationHedgerowHUs > 0 || allocationWatercourseHUs > 0;

  return (
    <Box overflowX="auto">
      <DataTable.Root width="auto" margin="0">
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader>Habitat</DataTable.ColumnHeader>
            <DataTable.ColumnHeader># Parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>Baseline Size</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>Baseline HUs</DataTable.ColumnHeader>            
            <DataTable.ColumnHeader>Retained Size</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>Improvements Size</DataTable.ColumnHeader>
            {hasAllocs && <DataTable.ColumnHeader>Allocations Size</DataTable.ColumnHeader>}
            {hasAllocs && <DataTable.ColumnHeader>% Allocated</DataTable.ColumnHeader>}
            {hasAllocHUs && <DataTable.ColumnHeader>Allocations HUs</DataTable.ColumnHeader>}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          <DataTable.Row>
            <DataTable.Cell>Areas (ha)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineAreaParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineArea, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineAreaHUs)}</DataTable.NumericCell>            
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineArea - improvementArea), 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementArea, 2)}</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationArea, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementArea > 0 ? formatNumber((allocationArea / improvementArea) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationAreaHUs)}</DataTable.NumericCell>}
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.Cell>Hedgerows (km)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerow, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineHedgerow - improvementHedgerow), 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerow, 2)}</DataTable.NumericCell>            
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationHedgerow, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementHedgerow > 0 ? formatNumber((allocationHedgerow / improvementHedgerow) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationHedgerowHUs)}</DataTable.NumericCell>}
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.Cell>Watercourses (km)</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourse, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineWatercourse - improvementWatercourse), 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourse, 2)}</DataTable.NumericCell>            
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationWatercourse, 2)}</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementWatercourse > 0 ? formatNumber((allocationWatercourse / improvementWatercourse) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationWatercourseHUs)}</DataTable.NumericCell>}
          </DataTable.Row>
        </DataTable.Body>
      </DataTable.Root>
    </Box>
  );
};
