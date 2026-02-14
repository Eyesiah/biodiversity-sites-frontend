'use client'

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import { DataFetchingCollapsibleRow } from '@/components/data/DataFetchingCollapsibleRow';
import { ARCGIS_LPA_URL } from '@/config';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { DataTable } from '@/components/styles/DataTable';
import { Box, Text } from '@chakra-ui/react';
import InfoButton from '@/components/styles/InfoButton'
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import { LPAMetricsChart } from '@/components/charts/LPAMetricsChart';

const PolygonMap = dynamic(() => import('@/components/map/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

function LpaDetails({ lpa, onAdjacentClick, lpas, onRowClick }) {
  if (!lpa) {
    return null;
  }
  return (
    <Box padding="0.5rem">
      <Text as="h4" fontSize="1rem" fontWeight="bold" marginTop="0" marginBottom="0.75rem">Adjacent LPAs</Text>
      {lpa.adjacents && lpa.adjacents.length > 0 ? (
        <DataTable.Root>
          <DataTable.Header>
            <DataTable.Row>
              <DataTable.ColumnHeader>ID</DataTable.ColumnHeader>
              <DataTable.ColumnHeader>Name</DataTable.ColumnHeader>
              <DataTable.ColumnHeader>Area (ha)</DataTable.ColumnHeader>
              <DataTable.ColumnHeader># BGS Sites</DataTable.ColumnHeader>
              <DataTable.ColumnHeader>Map</DataTable.ColumnHeader>
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {lpa.adjacents.map(adj => {
              const adjacentLpaObject = lpas?.find(l => l.id === adj.id);
              return (
                <DataTable.Row key={adj.id}>
                  <DataTable.Cell>{adj.id}</DataTable.Cell>
                  <DataTable.Cell>{adj.name}</DataTable.Cell>
                  <DataTable.NumericCell>{formatNumber(adj.size, 0)}</DataTable.NumericCell>
                  <DataTable.CenteredNumericCell>{adjacentLpaObject?.siteCount || 0}</DataTable.CenteredNumericCell>
                  <DataTable.Cell><InfoButton onClick={(e) => { e.stopPropagation(); onAdjacentClick(adjacentLpaObject); }} >Display Map</InfoButton></DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable.Body>
        </DataTable.Root>
      ) : (
        <Text>No adjacency data available.</Text>
      )}
    </Box>
  );
}

const LpaDataRow = ({ lpa, onRowClick, lpas, isOpen, setIsOpen, handleAdjacentMapSelection }) => (
  <DataFetchingCollapsibleRow
    mainRow={(
      <>
        <PrimaryTable.Cell>{lpa.id}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{lpa.name}</PrimaryTable.Cell>
        <PrimaryTable.NumericCell>{formatNumber(lpa.size, 0)}</PrimaryTable.NumericCell>
        <PrimaryTable.CenteredNumericCell>{lpa.siteCount}</PrimaryTable.CenteredNumericCell>
        <PrimaryTable.CenteredNumericCell>{lpa.allocationsCount}</PrimaryTable.CenteredNumericCell>
        <PrimaryTable.CenteredNumericCell>{lpa.adjacentsCount}</PrimaryTable.CenteredNumericCell>
        <PrimaryTable.Cell>
          <InfoButton onClick={(e) => { e.stopPropagation(); onRowClick(lpa); }}>
            Display Map
          </InfoButton>
        </PrimaryTable.Cell>
      </>
    )}
    dataUrl={`/api/modal/lpa/${lpa.id}`}
    renderDetails={details => <LpaDetails lpa={details} onAdjacentClick={handleAdjacentMapSelection} lpas={lpas} />}
    dataExtractor={json => json.lpa}
    colSpan={7}
    isOpen={isOpen}
    setIsOpen={setIsOpen}
  />
);

export default function LPAContent({ lpas, sites, onMapSitesChange, onSelectedPolygonChange }) {

  const [selectedLpa, setSelectedLpa] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  const handleAdjacentMapSelection = (item) => {
    setSelectedLpa(item);
    onSelectedPolygonChange?.(item);
  };

  const sitesInSelectedLPA = useMemo(() => {
    if (!selectedLpa) return [];
    return (sites || []).filter(site => site.lpaName === selectedLpa.name);
  }, [selectedLpa, sites]);

  useEffect(() => {
    onMapSitesChange?.(sitesInSelectedLPA);
  }, [sitesInSelectedLPA, onMapSitesChange]);

  useEffect(() => {
    onSelectedPolygonChange?.(selectedLpa);
  }, [selectedLpa, onSelectedPolygonChange]);

  const totalArea = useMemo(() => lpas.reduce((sum, lpa) => sum + lpa.size, 0), [lpas]);

  return (
    <>
            <SearchableTableLayout
              initialItems={lpas}
              filterPredicate={(lpa, term) =>
                (lpa.name?.toLowerCase() || '').includes(term) ||
                (lpa.id?.toLowerCase() || '').includes(term)}
              initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
              placeholder="Search by LPA name or ID."
              exportConfig={{
                onExportXml: (items) => exportToXml(items, 'localPlanningAuPrimaryTable.ColumnHeaderorities', 'lpa', 'local-planning-auPrimaryTable.ColumnHeaderorities.xml'),
                onExportJson: (items) => exportToJson(items, 'lpas', 'local-planning-auPrimaryTable.ColumnHeaderorities.json')
              }}
              summary={(filteredCount, totalCount) => (
                <Text fontSize="1.2rem">
                  Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> <GlossaryTooltip term='Local Planning Authority (LPA)'>LPAs</GlossaryTooltip>, covering a total of <Text as="strong">{formatNumber(totalArea, 0)}</Text> hectares.
                </Text>
              )}
            >
              {({ sortedItems, requestSort, getSortIndicator }) => {
                const summaryData = {
                  totalArea: sortedItems.reduce((sum, lpa) => sum + (lpa.size || 0), 0),
                  totalSites: sortedItems.reduce((sum, lpa) => sum + (lpa.siteCount || 0), 0),
                  totalAllocations: sortedItems.reduce((sum, lpa) => sum + (lpa.allocationsCount || 0), 0),
                  totalAdjacents: sortedItems.reduce((sum, lpa) => sum + (lpa.adjacentsCount || 0), 0),
                };
                return (
                  <>
                    <PrimaryTable.Root>
                    <PrimaryTable.Header>
                      <PrimaryTable.Row>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('allocationsCount')}># Allocations{getSortIndicator('allocationsCount')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('adjacentsCount')}># Adjacent LPAs{getSortIndicator('adjacentsCount')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader>Map</PrimaryTable.ColumnHeader>
                      </PrimaryTable.Row>
                    </PrimaryTable.Header>
                    <PrimaryTable.Body>
                      <PrimaryTable.Row fontWeight="bold" bg="tableTotalsBg">
                        <PrimaryTable.Cell colSpan="2" textAlign="center">Totals</PrimaryTable.Cell>
                        <PrimaryTable.NumericCell>{formatNumber(summaryData.totalArea, 0)}</PrimaryTable.NumericCell>
                        <PrimaryTable.CenteredNumericCell>{formatNumber(summaryData.totalSites, 0)}</PrimaryTable.CenteredNumericCell>
                        <PrimaryTable.CenteredNumericCell>{formatNumber(summaryData.totalAllocations, 0)}</PrimaryTable.CenteredNumericCell>
                        <PrimaryTable.CenteredNumericCell>{formatNumber(summaryData.totalAdjacents, 0)}</PrimaryTable.CenteredNumericCell>
                        <PrimaryTable.Cell></PrimaryTable.Cell>
                      </PrimaryTable.Row>
                      {sortedItems.map((lpa) => (
                        <LpaDataRow
                          key={lpa.id}
                          lpa={lpa}
                          onRowClick={(item) => { setSelectedLpa(item); setOpenRowId(item.id === openRowId ? null : item.id); }}
                          lpas={lpas}
                          handleAdjacentMapSelection={handleAdjacentMapSelection}
                          isOpen={openRowId === lpa.id}
                          setIsOpen={(isOpen) => setOpenRowId(isOpen ? lpa.id : null)}
                        />
                      ))}
                    </PrimaryTable.Body>
                  </PrimaryTable.Root>
                  <Text fontStyle="italic">When a site map is selected, adjacent LPAs are shown coloured pink.</Text>
                  </>
                );
              }}
            </SearchableTableLayout>
    </>
  )
}
