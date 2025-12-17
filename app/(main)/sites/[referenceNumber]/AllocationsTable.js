'use client'

import { useSortableData } from '@/lib/hooks';
import { CollapsibleRow } from "@/components/data/CollapsibleRow"
import { formatNumber } from '@/lib/format';
import { DataTable } from '@/components/styles/DataTable';
import { PrimaryCard, TableContainer } from '@/components/styles/PrimaryCard';
import { AllocationHabitats } from '@/components/data/AllocationHabitats';
import { Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { HABITAT_UNIT_TYPES } from '@/config'

// component for each row in the allocations table to handle drill-down
const AllocationRow = ({ alloc }) => {
  const mainRow = (
    <>
      <DataTable.Cell>{alloc.planningReference}</DataTable.Cell>
      <DataTable.Cell>{alloc.localPlanningAuthority}</DataTable.Cell>
      <DataTable.CenteredNumericCell>{alloc.lsoa.IMDDecile || 'N/A'}</DataTable.CenteredNumericCell>
      <DataTable.CenteredNumericCell>
        {typeof alloc.distance === 'number' ? formatNumber(alloc.distance, 0) : alloc.distance}
      </DataTable.CenteredNumericCell>
      <DataTable.Cell>{`${alloc.sr.cat}${alloc.sr.cat != 'Outside' ? ` (${alloc.sr.from})` : ''}`}</DataTable.Cell>
      <DataTable.Cell>{alloc.projectName}</DataTable.Cell>
      <DataTable.NumericCell>{alloc.areaUnits && alloc.areaUnits > 0 ? formatNumber(alloc.areaUnits) : ''}</DataTable.NumericCell>
      <DataTable.NumericCell>{alloc.hedgerowUnits && alloc.hedgerowUnits > 0 ? formatNumber(alloc.hedgerowUnits) : ''}</DataTable.NumericCell>
      <DataTable.NumericCell>{alloc.watercoursesUnits && alloc.watercoursesUnits > 0 ? formatNumber(alloc.watercoursesUnits) : ''}</DataTable.NumericCell>
    </>
  );

  const allHabitats = useMemo(() => {
    const allHabitats = []
    for (const unit of HABITAT_UNIT_TYPES) {
      if (alloc.habitats[unit]) {
        allHabitats.push(...alloc.habitats[unit]);
      }
    }
    return allHabitats;
  }, [alloc])

  const collapsibleContent = <AllocationHabitats habitats={allHabitats} />;

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={7}
      tableType="data"
    />
  );
};

export const AllocationsTable = ({ allocations }) => {
  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(allocations || [], { key: 'planningReference', direction: 'ascending' });

  const getSortIndicator = (name) => {
    if (!sortConfigAllocations || sortConfigAllocations.key !== name) {
      return '';
    }
    return sortConfigAllocations.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <PrimaryCard>
      {sortedAllocations.length > 0 ? (
        <TableContainer>
          <DataTable.Root>
            <DataTable.Header>
              <DataTable.Row>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('planningReference')}>
                  Reference{getSortIndicator('planningReference')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('localPlanningAuthority')}>
                  LPA{getSortIndicator('localPlanningAuthority')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('lsoa.IMDDecile')}>
                  IMD Decile{getSortIndicator('lsoa.IMDDecile')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('distance')}>
                  Distance (km){getSortIndicator('distance')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('sr.cat')}>
                  Spatial Risk{getSortIndicator('sr.cat')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('projectName')}>
                  Address{getSortIndicator('projectName')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('areaUnits')}>
                  Area units{getSortIndicator('areaUnits')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('hedgerowUnits')}>
                  Hedgerow units{getSortIndicator('hedgerowUnits')}
                </DataTable.ColumnHeader>
                <DataTable.ColumnHeader onClick={() => requestSortAllocations('watercoursesUnits')}>
                  Watercourse units{getSortIndicator('watercoursesUnits')}
                </DataTable.ColumnHeader>
              </DataTable.Row>
            </DataTable.Header>
            <DataTable.Body>
              {sortedAllocations.map((alloc) => (
                <AllocationRow key={`${alloc.planningReference}-${alloc.developerReference}`} alloc={alloc} />
              ))}
            </DataTable.Body>
          </DataTable.Root>
        </TableContainer>
      ) : <Text>No allocations.</Text>}
    </PrimaryCard>
  );
}
