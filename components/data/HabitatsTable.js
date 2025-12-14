'use client'

import { formatNumber } from '@/lib/format';
import { CollapsibleRow } from "@/components/data/CollapsibleRow"
import SiteList from '@/components/data/SiteList';
import { DataTable } from '@/components/styles/DataTable';
import { PrimaryCard, TableContainer } from '@/components/styles/PrimaryCard';
import { Box, Text } from '@chakra-ui/react';

export const HabitatRow = ({ habitat, isImprovement, units, onHabitatToggle, isHabitatOpen, sites }) => {

  const hasSites = sites != null;

  const mainRow = (
    <>
      <DataTable.Cell>{habitat.type}</DataTable.Cell>
      <DataTable.Cell textAlign="center">{habitat.distinctiveness}</DataTable.Cell>
      {hasSites && <DataTable.CenteredNumericCell>{sites.length}</DataTable.CenteredNumericCell>}
      <DataTable.CenteredNumericCell>{habitat.parcels}</DataTable.CenteredNumericCell>
      <DataTable.NumericCell>{formatNumber(habitat.size)}</DataTable.NumericCell>
      {isImprovement && <DataTable.NumericCell>{habitat.allocated && habitat.allocated > 0 ? `${formatNumber(100 * habitat.allocated)}%` : ''}</DataTable.NumericCell>}
      <DataTable.NumericCell>{habitat.HUs && habitat.HUs > 0 ? formatNumber(habitat.HUs) : ''}</DataTable.NumericCell>
      {isImprovement && <DataTable.NumericCell>{habitat.HUGain && habitat.HUGain > 0 ? formatNumber(habitat.HUGain) : ''}</DataTable.NumericCell>}
    </>
  );

  const collapsibleContent = (
    <Box display="flex" flexDirection="column" gap="1rem" alignItems="center">
      {habitat.subRows && <DataTable.Root width="auto" margin="0">
        <DataTable.Header>
          <DataTable.Row>
            {isImprovement && <DataTable.ColumnHeader>Intervention</DataTable.ColumnHeader>}
            <DataTable.ColumnHeader>Condition</DataTable.ColumnHeader>
            <DataTable.ColumnHeader># parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader>Size ({units})</DataTable.ColumnHeader>
            {isImprovement && <DataTable.ColumnHeader>Time to Target (years)</DataTable.ColumnHeader>}
            {isImprovement && <DataTable.ColumnHeader>Temporal Risk</DataTable.ColumnHeader>}
            {isImprovement && <DataTable.ColumnHeader>Difficulty Factor</DataTable.ColumnHeader>}
            {isImprovement && <DataTable.ColumnHeader>Spatial Risk</DataTable.ColumnHeader>}
            <DataTable.ColumnHeader>HUs</DataTable.ColumnHeader>
            {isImprovement && <DataTable.ColumnHeader>HU Gain</DataTable.ColumnHeader>}
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          {habitat.subRows.map((subRow, index) => (
            <DataTable.Row key={index}>
              {isImprovement && <DataTable.Cell textAlign="center">{subRow.interventionType}</DataTable.Cell>}
              <DataTable.Cell textAlign="center">{subRow.condition}</DataTable.Cell>
              <DataTable.NumericCell textAlign="center">{subRow.parcels}</DataTable.NumericCell>
              <DataTable.NumericCell textAlign="center">{formatNumber(subRow.size)}</DataTable.NumericCell>
              {isImprovement && <DataTable.Cell textAlign="center">{subRow.timeToTarget || ''}</DataTable.Cell>}
              {isImprovement && <DataTable.NumericCell textAlign="center">{typeof subRow.temporalRisk === 'string' ? subRow.temporalRisk : subRow.temporalRisk && subRow.temporalRisk > 0 ? formatNumber(subRow.temporalRisk, 3) : ''}</DataTable.NumericCell>}
              {isImprovement && <DataTable.NumericCell textAlign="center">{(() => {
                const factor = parseFloat(subRow.difficultyFactor || 0);
                return factor && factor > 0 ? formatNumber(factor, 2) : '';
              })()}</DataTable.NumericCell>}
              {isImprovement && <DataTable.NumericCell textAlign="center">{(() => {
                const risk = parseFloat(subRow.spatialRisk || 0);
                return risk && risk > 0 ? formatNumber(risk, 2) : '';
              })()}</DataTable.NumericCell>}
              <DataTable.NumericCell textAlign="center">{subRow.HUs && subRow.HUs > 0 ? formatNumber(subRow.HUs) : ''}</DataTable.NumericCell>
              {isImprovement && <DataTable.NumericCell textAlign="center">{subRow.HUs && subRow.HUs > 0 ? formatNumber(subRow.HUs - (subRow.baselineHUs || 0)) : ''}</DataTable.NumericCell>}
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable.Root>}
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

export const HabitatTable = ({ habitats, requestSort, sortConfig, isImprovement, onHabitatToggle, isHabitatOpen, sites, units }) => { 


  if (!habitats || habitats.length == 0)
  {
    return (
      <PrimaryCard>
        <Text>No habitats.</Text>
      </PrimaryCard>
    );
  }

  const hasSites = habitats[0].sites != null;

  const getSortIndicator = (name) => {
    if (!sortConfig || sortConfig.key !== name) {
      return '';
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  if (isImprovement) {
    habitats.forEach(h => h.HUGain = h.HUs - h.baselineHUs);
  }

  return (
    <PrimaryCard>
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
                Size ({units}){getSortIndicator('area')}
              </DataTable.ColumnHeader>
              {isImprovement && (
                <DataTable.ColumnHeader onClick={() => requestSort('allocated')}>
                  % Allocated{getSortIndicator('allocated')}
                </DataTable.ColumnHeader>
              )}
              <DataTable.ColumnHeader onClick={() => requestSort('HUs')}>
                HUs{getSortIndicator('HUs')}
              </DataTable.ColumnHeader>
              {isImprovement && (
                <DataTable.ColumnHeader onClick={() => requestSort('HUGain')}>
                  HU Gain{getSortIndicator('HUGain')}
                </DataTable.ColumnHeader>
              )}
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {habitats.map((habitat) => (
              <HabitatRow 
                key={habitat.type}
                habitat={habitat}
                isImprovement={isImprovement}
                units={units}
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
    </PrimaryCard>
  );
};
