import { formatNumber } from '@/lib/format';
import { DataTable } from '@/components/ui/DataTable';
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
    // fall back to the improvement habitats' allocated % data
    allocationArea = improvementArea * (improvements.areas || []).reduce((acc, h) => acc + (h.allocated || 0), 0);
    allocationHedgerow = improvementHedgerow * (improvements.hedgerows || []).reduce((acc, h) => acc + (h.allocated || 0), 0);
    allocationWatercourse = improvementWatercourse * (improvements.watercourses || []).reduce((acc, h) => acc + (h.allocated || 0), 0);
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
            <DataTable.ColumnHeader>Improvements Size</DataTable.ColumnHeader>
            {hasAllocs && <DataTable.ColumnHeader>Allocations Size</DataTable.ColumnHeader>}
            {hasAllocs && <DataTable.ColumnHeader>% Allocated</DataTable.ColumnHeader>}
            {hasAllocHUs && <DataTable.ColumnHeader>Allocations HUs</DataTable.ColumnHeader>}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          <DataTable.Row>
            <DataTable.Cell>Areas (ha)</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineAreaParcels, 0)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineArea, 2)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineAreaHUs)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(improvementArea, 2)}</DataTable.Cell>
            {hasAllocs && <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(allocationArea, 2)}</DataTable.Cell>}
            {hasAllocs && <DataTable.Cell textAlign="right" fontFamily="mono">{improvementArea > 0 ? formatNumber((allocationArea / improvementArea) * 100, 2) + '%' : 'N/A'}</DataTable.Cell>}
            {hasAllocHUs && <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(allocationAreaHUs)}</DataTable.Cell>}
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.Cell>Hedgerows (km)</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineHedgerowParcels, 0)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineHedgerow, 2)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineHedgerowHUs)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(improvementHedgerow, 2)}</DataTable.Cell>
            {hasAllocs && <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(allocationHedgerow, 2)}</DataTable.Cell>}
            {hasAllocs && <DataTable.Cell textAlign="right" fontFamily="mono">{improvementHedgerow > 0 ? formatNumber((allocationHedgerow / improvementHedgerow) * 100, 2) + '%' : 'N/A'}</DataTable.Cell>}
            {hasAllocHUs && <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(allocationHedgerowHUs)}</DataTable.Cell>}
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.Cell>Watercourses (km)</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineWatercourseParcels, 0)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineWatercourse, 2)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(baselineWatercourseHUs)}</DataTable.Cell>
            <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(improvementWatercourse, 2)}</DataTable.Cell>
            {hasAllocs && <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(allocationWatercourse, 2)}</DataTable.Cell>}
            {hasAllocs && <DataTable.Cell textAlign="right" fontFamily="mono">{improvementWatercourse > 0 ? formatNumber((allocationWatercourse / improvementWatercourse) * 100, 2) + '%' : 'N/A'}</DataTable.Cell>}
            {hasAllocHUs && <DataTable.Cell textAlign="right" fontFamily="mono">{formatNumber(allocationWatercourseHUs)}</DataTable.Cell>}
          </DataTable.Row>
        </DataTable.Body>
      </DataTable.Root>
    </Box>
  );
};
