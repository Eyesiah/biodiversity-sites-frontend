'use client'

import { useSortableData } from '@/lib/hooks';
import { formatNumber } from '@/lib/format';
import { useState } from 'react';
import { CollapsibleRow } from "components/CollapsibleRow"
import SiteList from '@/components/SiteList';
import { DataTable } from '@/components/ui/DataTable';
import { PrimaryCard, CardTitle, TableContainer } from '@/components/ui/PrimaryCard';
import { DataSection, SectionTitle } from '@/components/ui/DataSection';
import { Box } from '@chakra-ui/react';

export const HabitatRow = ({ habitat, isImprovement, units, onHabitatToggle, isHabitatOpen, sites }) => {

  const hasSites = sites != null;

  const mainRow = (
    <>
      <DataTable.Cell>{habitat.type}</DataTable.Cell>
      <DataTable.Cell textAlign="center">{habitat.distinctiveness}</DataTable.Cell>
      {hasSites && <DataTable.CenteredNumericCell>{sites.length}</DataTable.CenteredNumericCell>}
      <DataTable.CenteredNumericCell>{habitat.parcels}</DataTable.CenteredNumericCell>
      <DataTable.NumericCell>{formatNumber(habitat.area)}</DataTable.NumericCell>
      {isImprovement && <DataTable.NumericCell>{habitat.allocated && habitat.allocated > 0 ? `${formatNumber(100 * habitat.allocated)}%` : ''}</DataTable.NumericCell>}
      <DataTable.NumericCell>{habitat.HUs && habitat.HUs > 0 ? formatNumber(habitat.HUs) : ''}</DataTable.NumericCell>
    </>
  );

  const collapsibleContent = (
    <Box display="flex" flexDirection="column" gap="1rem" alignItems="center">
      <DataTable.Root width="auto" margin="0">
        <DataTable.Header>
          <DataTable.Row>
            {isImprovement && <DataTable.ColumnHeader>Intervention</DataTable.ColumnHeader>}
            <DataTable.ColumnHeader>Condition</DataTable.ColumnHeader>
            <DataTable.ColumnHeader># parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>Size ({units})</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>HUs</DataTable.ColumnHeader>
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {habitat.subRows.map((subRow, index) => (
            <DataTable.Row key={index}>
              {isImprovement && <DataTable.Cell>{subRow.interventionType}</DataTable.Cell>}
              <DataTable.Cell>{subRow.condition}</DataTable.Cell>
              <DataTable.NumericCell>{subRow.parcels}</DataTable.NumericCell>
              <DataTable.NumericCell>{formatNumber(subRow.area)}</DataTable.NumericCell>
              <DataTable.NumericCell>{subRow.HUs && subRow.HUs > 0 ? formatNumber(subRow.HUs) : ''}</DataTable.NumericCell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable.Root>
      {hasSites &&
        <SiteList sites={sites} minimalHeight={true} columns={['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'allocatedHabitatArea', 'lpaName', 'ncaName']} />
      }
    </Box>
  );

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={5}
      onToggle={onHabitatToggle}
      isOpen={isHabitatOpen}
      tableType="data"
    />
  );
};

export const HabitatTable = ({ title, habitats, requestSort, sortConfig, isImprovement, onHabitatToggle, isHabitatOpen, sites }) => {
  
  if (!habitats || habitats.length == 0)
  {
    return null;
  }

  const hasSites = habitats[0].sites != null;

  const getSortIndicator = (name) => {
    if (!sortConfig || sortConfig.key !== name) {
      return '';
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <DataSection>
      <TableContainer>
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader onClick={() => requestSort('type')}>
                Habitat{getSortIndicator('type')}
              </DataTable.ColumnHeader>
              <DataTable.ColumnHeader onClick={() => requestSort('distinctiveness')}>
                Distinctiveness{getSortIndicator('distinctiveness')}
              </DataTable.ColumnHeader>
              {hasSites && (
                <DataTable.ColumnHeader onClick={() => requestSort('sites.length')}>
                  # BGS Sites{getSortIndicator('sites.length')}
                </DataTable.ColumnHeader>
              )}
              <DataTable.ColumnHeader onClick={() => requestSort('parcels')}>
                # Parcels{getSortIndicator('parcels')}
              </DataTable.ColumnHeader>
              <DataTable.ColumnHeader onClick={() => requestSort('area')}>
                Size ({title === 'Areas' ? 'ha' : 'km'}){getSortIndicator('area')}
              </DataTable.ColumnHeader>
              {isImprovement && (
                <DataTable.ColumnHeader onClick={() => requestSort('allocated')}>
                  % Allocated{getSortIndicator('allocated')}
                </DataTable.ColumnHeader>
              )}
              <DataTable.ColumnHeader onClick={() => requestSort('HUs')}>
                HUs{getSortIndicator('HUs')}
              </DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {habitats.map((habitat) => (
              <HabitatRow 
                key={habitat.type}
                habitat={habitat}
                isImprovement={isImprovement}
                units={title === 'Areas' ? 'ha' : 'km'}
                onHabitatToggle={onHabitatToggle ? () => onHabitatToggle(habitat) : null}
                isHabitatOpen={isHabitatOpen ? isHabitatOpen(habitat) : null}
                sites={habitat.sites?.map(s => {
                  return {
                    ...sites[s.r],
                    siteSize: s.ta,
                    allocatedHabitatArea: s.aa || 0
                  }
                }) ?? null}
              />
            ))}
          </DataTable.Body>
        </DataTable.Root>
      </TableContainer>
    </DataSection>
  );
};

export function HabitatsCard ({title, habitats, isImprovement, onHabitatToggle, isHabitatOpen, sites}) {
  const [isOpen, setIsOpen] = useState(true);

  const collatedAreas = habitats?.areas;
  const collatedHedgerows = habitats?.hedgerows;
  const collatedWatercourses = habitats?.watercourses;
  
  const { items: sortedAreas, requestSort: requestSortAreas, sortConfig: sortConfigAreas } = useSortableData(collatedAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedHedgerows, requestSort: requestSortHedgerows, sortConfig: sortConfigHedgerows } = useSortableData(collatedHedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedWatercourses, requestSort: requestSortWatercourses, sortConfig: sortConfigWatercourses } = useSortableData(collatedWatercourses, { key: 'type', direction: 'ascending' });
  
  const hasHabitats = sortedAreas.length > 0 || sortedWatercourses.length > 0 || sortedHedgerows.length > 0;

  if (hasHabitats)
  {
    return (
      <PrimaryCard>
        <CardTitle onClick={() => setIsOpen(!isOpen)}>
          {title} {isOpen ? '▼' : '▶'}
        </CardTitle>
        {isOpen && (
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="flex-start" 
            gap="0.5rem" 
            flexWrap="wrap"
          >  
            <HabitatTable
              title="Areas"
              habitats={sortedAreas}
              requestSort={requestSortAreas}
              sortConfig={sortConfigAreas}
              isImprovement={isImprovement}
              onHabitatToggle={onHabitatToggle}
              isHabitatOpen={isHabitatOpen}
              sites={sites}
            />
            <HabitatTable
              title="Hedgerows"
              habitats={sortedHedgerows}
              requestSort={requestSortHedgerows}
              sortConfig={sortConfigHedgerows}
              isImprovement={isImprovement}
              onHabitatToggle={onHabitatToggle}
              isHabitatOpen={isHabitatOpen}
              sites={sites}
            />
            <HabitatTable
              title="Watercourses"
              habitats={sortedWatercourses}
              requestSort={requestSortWatercourses}
              sortConfig={sortConfigWatercourses}
              isImprovement={isImprovement}
              onHabitatToggle={onHabitatToggle}
              isHabitatOpen={isHabitatOpen}
              sites={sites}
            />            
          </Box>
        )}
      </PrimaryCard>
    );
  }
  else
  {
    return null;
  }
}
