import { formatNumber } from '@/lib/format';
import { formatAreaWithTreeCount } from '@/lib/tree-utils';
import { DataTable } from '@/components/styles/DataTable';
import { Box } from '@chakra-ui/react';
import GlossaryTooltip from '../ui/GlossaryTooltip';

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
    // fall back to the improvement habitats' allocated data
    allocationArea = (improvements.areas || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
    allocationIndividualTrees = (improvements.trees || []).reduce((acc, h) => acc + (h.allocatedArea || 0), 0);
  }

  const hasAllocs = allocationArea > 0 || allocationHedgerow > 0 || allocationWatercourse > 0 || allocationIndividualTrees > 0 || site.allocations != null;
  const hasAllocHUs = allocationAreaHUs > 0 || allocationHedgerowHUs > 0 || allocationWatercourseHUs > 0;
  const hasIndividualTrees = baselineIndividualTrees > 0 || improvementTrees > 0 || allocationIndividualTrees > 0;
  const hasArea = baselineArea > 0 || improvementArea > 0 || allocationArea > 0;
  const hasHedgerow = baselineHedgerow > 0 || improvementHedgerow > 0 || allocationHedgerow > 0;
  const hasWatercourse = baselineWatercourse > 0 || improvementWatercourse > 0 || allocationWatercourse > 0;

  const headerFontSize = '14px';

  return (
    <Box overflowX="auto">
      <DataTable.Root width="auto" margin="0">
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Habitat'>Habitat</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}># <GlossaryTooltip term='Parcel'>Parcels</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Baseline habitat'>Baseline</GlossaryTooltip><br /><GlossaryTooltip term='Size'>Size</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Baseline habitat'>Baseline</GlossaryTooltip><br /><GlossaryTooltip term='Habitat Unit (HU)'>HUs</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Retained habitat'>Retained</GlossaryTooltip><br /><GlossaryTooltip term='Size'>Size</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Improvements</GlossaryTooltip><br /><GlossaryTooltip term='Size'>Size</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Improvements</GlossaryTooltip><br /><GlossaryTooltip term='Habitat Unit (HU)'>HUs</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Improvement habitat'>Improvements</GlossaryTooltip><br /><GlossaryTooltip term='Habitat Unit (HU)'>HU</GlossaryTooltip> <GlossaryTooltip term='HU Gain'>Gain</GlossaryTooltip></DataTable.ColumnHeader>
            {hasAllocs && <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Allocation'>Allocations</GlossaryTooltip><br /><GlossaryTooltip term='Size'>Size</GlossaryTooltip></DataTable.ColumnHeader>}
            {hasAllocs && <DataTable.ColumnHeader fontSize={headerFontSize}>% <GlossaryTooltip term='Allocation'>Allocated</GlossaryTooltip></DataTable.ColumnHeader>}
            {hasAllocHUs && <DataTable.ColumnHeader fontSize={headerFontSize}><GlossaryTooltip term='Allocation'>Allocations</GlossaryTooltip><br /><GlossaryTooltip term='Habitat Unit (HU)'>HUs</GlossaryTooltip></DataTable.ColumnHeader>}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {hasArea && <DataTable.Row>
            <DataTable.Cell>Areas</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineAreaParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineArea, 2)} ha</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineAreaHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell color={(() => {
              const retainedArea = baselineArea - improvementArea;
              return Math.abs(retainedArea) < 0.005 ? 0 : retainedArea;
            })() < 0 ? "red.500" : undefined}>{formatNumber((() => {
              const retainedArea = baselineArea - improvementArea;
              return Math.abs(retainedArea) < 0.005 ? 0 : retainedArea;
            })(), 2)} ha</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementArea, 2)} ha</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementAreaHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementAreaHUGain, 2)}</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationArea, 2)} ha</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementArea > 0 ? formatNumber((allocationArea / improvementArea) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationAreaHUs)}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasIndividualTrees && <DataTable.Row>
            <DataTable.Cell>Individual trees</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineIndividualTreesParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>
              {(() => {
                const treeData = formatAreaWithTreeCount(baselineIndividualTrees, 'trees');
                if (typeof treeData === 'object' && treeData.isTreeCount) {
                  return (
                    <>
                      {treeData.area} ha ({treeData.treeCount} <GlossaryTooltip term="Small tree">{treeData.treeWord}</GlossaryTooltip>)
                    </>
                  );
                }
                return treeData + ' ha';
              })()}
            </DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineIndividualTreesHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>
              {(() => {
                const treeData = formatAreaWithTreeCount(Math.max(0, baselineIndividualTrees - improvementTrees), 'trees');
                if (typeof treeData === 'object' && treeData.isTreeCount) {
                  return (
                    <>
                      {treeData.area} ha ({treeData.treeCount} <GlossaryTooltip term="Small tree">{treeData.treeWord}</GlossaryTooltip>)
                    </>
                  );
                }
                return treeData + ' ha';
              })()}
            </DataTable.NumericCell>
            <DataTable.NumericCell>
              {(() => {
                const treeData = formatAreaWithTreeCount(improvementTrees, 'trees');
                if (typeof treeData === 'object' && treeData.isTreeCount) {
                  return (
                    <>
                      {treeData.area} ha ({treeData.treeCount} <GlossaryTooltip term="Small tree">{treeData.treeWord}</GlossaryTooltip>)
                    </>
                  );
                }
                return treeData + ' ha';
              })()}
            </DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementTreesHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementTreesHUGain, 2)}</DataTable.NumericCell>
            {hasAllocs && (
              <DataTable.NumericCell>
                {(() => {
                  const treeData = formatAreaWithTreeCount(allocationIndividualTrees, 'trees');
                  if (typeof treeData === 'object' && treeData.isTreeCount) {
                    return (
                      <>
                        {treeData.area} ha ({treeData.treeCount} <GlossaryTooltip term="Small tree">{treeData.treeWord}</GlossaryTooltip>)
                      </>
                    );
                  }
                  return treeData + ' ha';
                })()}
              </DataTable.NumericCell>
            )}
            {hasAllocs && <DataTable.NumericCell>{improvementTrees > 0 ? formatNumber((allocationIndividualTrees / improvementTrees) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(0)}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasHedgerow && <DataTable.Row>
            <DataTable.Cell>Hedgerows</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerow, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineHedgerowHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineHedgerow - improvementHedgerow), 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerow, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerowHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementHedgerowHUGain, 2)}</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationHedgerow, 2)} km</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementHedgerow > 0 ? formatNumber((allocationHedgerow / improvementHedgerow) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationHedgerowHUs)}</DataTable.NumericCell>}
          </DataTable.Row>}
          {hasWatercourse && <DataTable.Row>
            <DataTable.Cell>Watercourses</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseParcels, 0)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourse, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(baselineWatercourseHUs)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(Math.max(0, baselineWatercourse - improvementWatercourse), 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourse, 2)} km</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourseHUs, 2)}</DataTable.NumericCell>
            <DataTable.NumericCell>{formatNumber(improvementWatercourseHUGain, 2)}</DataTable.NumericCell>
            {hasAllocs && <DataTable.NumericCell>{formatNumber(allocationWatercourse, 2)} km</DataTable.NumericCell>}
            {hasAllocs && <DataTable.NumericCell>{improvementWatercourse > 0 ? formatNumber((allocationWatercourse / improvementWatercourse) * 100, 2) + '%' : 'N/A'}</DataTable.NumericCell>}
            {hasAllocHUs && <DataTable.NumericCell>{formatNumber(allocationWatercourseHUs)}</DataTable.NumericCell>}
          </DataTable.Row>}
        </DataTable.Body>
      </DataTable.Root>
    </Box>
  );
};
