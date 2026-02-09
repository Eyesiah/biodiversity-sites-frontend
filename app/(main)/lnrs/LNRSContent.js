'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import { CollapsibleRow } from '@/components/data/CollapsibleRow';
import ExternalLink from '@/components/ui/ExternalLink';
import MapContentLayout from '@/components/ui/MapContentLayout';
import { ARCGIS_LNRS_URL } from '@/config';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { DataTable } from '@/components/styles/DataTable';
import { Box, Text } from '@chakra-ui/react';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import { LNRSMetricsChart } from '@/components/charts/LNRSMetricsChart';

const PolygonMap = dynamic(() => import('components/map/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function LNRSContent({ lnrs, sites, error }) {
  const [selectedLnrs, setSelectedLnrs] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  const sitesInSelectedLNRS = useMemo(() => {
    if (!selectedLnrs) return [];
    return (sites || []).filter(site => site.lnrsName === selectedLnrs.name);
  }, [selectedLnrs, sites]);

  const handleMapSelection = (item) => {
    setSelectedLnrs(item);
    setOpenRowId(item.id);
  };

  const handleAdjacentMapSelection = (item) => {
    setSelectedLnrs(item);
  };

  const totalArea = useMemo(() => lnrs.reduce((sum, item) => sum + item.size, 0), [lnrs]);

  if (error) {
    return <Text color="red">Error fetching data: {error}</Text>;
  }

  return (
    <MapContentLayout
      map={
        <PolygonMap 
          selectedItem={selectedLnrs}
          geoJsonUrl={ARCGIS_LNRS_URL}
          nameProperty="name"
          sites={sitesInSelectedLNRS}
          style={{ color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.3 }}
        />
      }
      content={
        <>
          <SearchableTableLayout
            initialItems={lnrs}
            filterPredicate={(item, term) => (item.name?.toLowerCase() || '').includes(term)}
            initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
            placeholder="Search by LNRS name."
            exportConfig={{
                onExportXml: (items) => exportToXml(items, 'localNatureRecoveryStrategies', 'lnrs', 'lnrs-areas.xml'),
                onExportJson: (items) => exportToJson(items, 'lnrs', 'lnrs-areas.json')
            }}
            summary={(filteredCount, totalCount) => (
                <Text fontSize="1.2rem">
                    Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> <GlossaryTooltip term='Local Nature Recovery Strategy (LNRS) site'>LNRS</GlossaryTooltip> areas, covering a total of <Text as="strong">{formatNumber(totalArea, 0)}</Text> hectares.
                </Text>
            )}
            tabs={[
              {
                title: "Table",
                content: ({ sortedItems, requestSort, getSortIndicator }) => (
                  <>
                    <PrimaryTable.Root>
                    <PrimaryTable.Header>
                      <PrimaryTable.Row>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('name')}>LNRS Name{getSortIndicator('name')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('responsibleAuthority')}>Responsible Authority{getSortIndicator('responsibleAuthority')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('publicationStatus')}>Publication Status{getSortIndicator('publicationStatus')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader onClick={() => requestSort('adjacents.length')}># Adjacent LNRS{getSortIndicator('adjacents.length')}</PrimaryTable.ColumnHeader>
                        <PrimaryTable.ColumnHeader>Map</PrimaryTable.ColumnHeader>
                      </PrimaryTable.Row>
                    </PrimaryTable.Header>
                    <PrimaryTable.Body>
                      {sortedItems.map((item) => (
                        <CollapsibleRow 
                          key={item.id}
                          isOpen={openRowId === item.id}
                          setIsOpen={(isOpen) => setOpenRowId(isOpen ? item.id : null)}
                          tableType="primary"
                          mainRow={(
                            <>
                              <PrimaryTable.Cell>{item.id}</PrimaryTable.Cell>
                              <PrimaryTable.Cell>{item.name}</PrimaryTable.Cell>
                              <PrimaryTable.Cell>{item.responsibleAuthority}</PrimaryTable.Cell>
                              <PrimaryTable.Cell>{item.link ? <ExternalLink href={item.link}>{item.publicationStatus}</ExternalLink> : item.publicationStatus}</PrimaryTable.Cell>
                              <PrimaryTable.NumericCell>{formatNumber(item.size, 0)}</PrimaryTable.NumericCell>
                              <PrimaryTable.CenteredNumericCell>{item.siteCount}</PrimaryTable.CenteredNumericCell>
                              <PrimaryTable.CenteredNumericCell>{item.adjacents?.length || 0}</PrimaryTable.CenteredNumericCell>
                              <PrimaryTable.Cell>
                                <Text
                                  as="button"
                                  onClick={(e) => { e.stopPropagation(); handleMapSelection(item); }}
                                  bg="transparent"
                                  border="none"
                                  color="link"
                                  textDecoration="underline"
                                  cursor="pointer"
                                  padding="0"
                                  _hover={{ color: "linkHover" }}
                                >
                                  Display Map
                                </Text>
                              </PrimaryTable.Cell>
                            </>
                          )}
                          collapsibleContent={(
                            <Box padding="0.5rem">
                              <Text as="h4" fontSize="1rem" fontWeight="bold" marginTop="0" marginBottom="0.75rem">Adjacent LNRS Areas</Text>
                              {item.adjacents && item.adjacents.length > 0 ? (
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
                                    {item.adjacents.map(adj => {
                                      const adjacentLnrsObject = lnrs.find(l => l.id === adj.id);
                                      return (
                                        <DataTable.Row key={adj.id}>
                                          <DataTable.Cell>{adj.id}</DataTable.Cell>
                                          <DataTable.Cell>{adj.name}</DataTable.Cell>
                                          <DataTable.CenteredNumericCell>{formatNumber(adj.size, 0)}</DataTable.CenteredNumericCell>
                                          <DataTable.CenteredNumericCell>{adjacentLnrsObject?.siteCount || 0}</DataTable.CenteredNumericCell>
                                          <DataTable.Cell>
                                            <Text
                                              as="button"
                                              onClick={(e) => { e.stopPropagation(); handleAdjacentMapSelection(adjacentLnrsObject); }}
                                              bg="transparent"
                                              border="none"
                                              color="link"
                                              textDecoration="underline"
                                              cursor="pointer"
                                              padding="0"
                                              _hover={{ color: "linkHover" }}
                                            >
                                              Display Map
                                            </Text>
                                          </DataTable.Cell>
                                        </DataTable.Row>
                                      );
                                    })}
                                  </DataTable.Body>
                                </DataTable.Root>
                              ) : (
                                <Text>No adjacency data available.</Text>
                              )}
                            </Box>
                          )}
                          colSpan={8}
                        />
                      ))}
                    </PrimaryTable.Body>
                  </PrimaryTable.Root>
                  <Text fontStyle="italic">When a site map is selected, adjacent LNRS sites are shown coloured pink.</Text>
                  </>
                )
              },
              {
                title: "Metrics Chart",
                content: () => {
                  return <LNRSMetricsChart sites={sites} />;
                }
              }
            ]}
          />
        </>
      }
    />
  );
}
