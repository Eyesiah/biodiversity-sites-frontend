'use client'

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow';
import { ARCGIS_LPA_URL } from '@/config';
import MapContentLayout from '@/components/MapContentLayout';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import { PrimaryTable } from '@/components/ui/PrimaryTable';
import { DataTable } from '@/components/ui/DataTable';
import { Box, Text } from '@chakra-ui/react';

const PolygonMap = dynamic(() => import('@/components/Maps/PolygonMap'), {
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
                  <DataTable.Cell className="numeric-data">{formatNumber(adj.size, 0)}</DataTable.Cell>
                  <DataTable.Cell className="centered-data">{adjacentLpaObject?.siteCount || 0}</DataTable.Cell>
                  <DataTable.Cell><button onClick={(e) => { e.stopPropagation(); onAdjacentClick(adjacentLpaObject); }} className="linkButton">Display Map</button></DataTable.Cell>
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
        <PrimaryTable.Cell className="numeric-data">{formatNumber(lpa.size, 0)}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="centered-data">{lpa.siteCount}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="centered-data">{lpa.allocationsCount}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="centered-data">{lpa.adjacentsCount}</PrimaryTable.Cell>
        <PrimaryTable.Cell>
          <button onClick={(e) => { e.stopPropagation(); onRowClick(lpa); }} className="linkButton">
            Display Map
          </button>
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

export default function LPAContent({ lpas, sites }) {

  const [selectedLpa, setSelectedLpa] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  const handleAdjacentMapSelection = (item) => {
    setSelectedLpa(item);
  };

  const sitesInSelectedLPA = useMemo(() => {
    if (!selectedLpa) return [];
    return (sites || []).filter(site => site.lpaName === selectedLpa.name);
  }, [selectedLpa, sites]);

  return (
    <>
      <MapContentLayout
        map={
          <PolygonMap
            selectedItem={selectedLpa}
            geoJsonUrl={ARCGIS_LPA_URL}
            nameProperty="name"
            sites={sitesInSelectedLPA}
            style={{ color: '#3498db', weight: 2, opacity: 0.8, fillOpacity: 0.2 }}
          />
        }
        content={
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
                  Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> LPAs.
                </Text>
              )}
            >
              {({ sortedItems, requestSort, getSortIndicator }) => {
                const summaryData = {
                  totalSites: sortedItems.reduce((sum, lpa) => sum + (lpa.siteCount || 0), 0),
                  totalAllocations: sortedItems.reduce((sum, lpa) => sum + (lpa.allocationsCount || 0), 0),
                  totalAdjacents: sortedItems.reduce((sum, lpa) => sum + (lpa.adjacentsCount || 0), 0),
                };
                return (
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
                        <PrimaryTable.Cell></PrimaryTable.Cell>
                        <PrimaryTable.Cell className="centered-data">{formatNumber(summaryData.totalSites, 0)}</PrimaryTable.Cell>
                        <PrimaryTable.Cell className="centered-data">{formatNumber(summaryData.totalAllocations, 0)}</PrimaryTable.Cell>
                        <PrimaryTable.Cell className="centered-data">{formatNumber(summaryData.totalAdjacents, 0)}</PrimaryTable.Cell>
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
                )
              }}
            </SearchableTableLayout>
            <Text fontStyle="italic">When a site map is selected, adjacent LPAs are shown coloured pink.</Text>
          </>
        }
      />
    </>
  )
}