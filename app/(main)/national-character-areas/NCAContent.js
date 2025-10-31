'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ExternalLink from '@/components/ui/ExternalLink';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import { CollapsibleRow } from '@/components/data/CollapsibleRow';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { DataTable } from '@/components/styles/DataTable';
import { Box, Text } from '@chakra-ui/react';

const PolygonMap = dynamic(() => import('components/map/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function NCAContent({ ncas, sites, error }) {
  const [selectedNca, setSelectedNca] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  const sitesInSelectedNCA = useMemo(() => {
    if (!selectedNca) return [];
    return (sites || []).filter(site => slugify(normalizeBodyName(site.ncaName)) === slugify(normalizeBodyName(selectedNca.name)));
  }, [selectedNca, sites]);

  const handleMapSelection = (item) => {
    setSelectedNca(item);
    setOpenRowId(item.id);
  };

  const handleAdjacentMapSelection = (item) => {
    setSelectedNca(item);
  };

  const totalArea = useMemo(() => ncas.reduce((sum, nca) => sum + nca.size, 0), [ncas]);

  if (error) {
    return <Text color="red">Error fetching data: {error}</Text>;
  }

  return (
    <MapContentLayout
        map={
        <PolygonMap
            selectedItem={selectedNca}
            geoJsonUrl="https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query"
            nameProperty="name"
            sites={sitesInSelectedNCA}
            style={{ color: '#8e44ad', weight: 2, opacity: 0.8, fillOpacity: 0.2 }}
        />
        }
        content={
        <>
            <SearchableTableLayout
                initialItems={ncas}
                filterPredicate={(item, term) => (item.name?.toLowerCase() || '').includes(term)}
                initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
                placeholder="Search by NCA name."
                exportConfig={{
                    onExportXml: (items) => exportToXml(items, 'nationalCharacterAreas', 'nca', 'national-character-areas.xml'),
                    onExportJson: (items) => exportToJson(items, 'ncas', 'national-character-areas.json')
                }}
                summary={(filteredCount, totalCount) => (
                    <Text fontSize="1.2rem">
                        Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> NCAs, covering a total of <Text as="strong">{formatNumber(totalArea, 0)}</Text> hectares.
                    </Text>
                )}
            >
                {({ sortedItems, requestSort, getSortIndicator }) => (
                    <PrimaryTable.Root>
                        <PrimaryTable.Header>
                            <PrimaryTable.Row>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('adjacents.length')}># Adjacent NCAs{getSortIndicator('adjacents.length')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader>Map</PrimaryTable.ColumnHeader>
                            </PrimaryTable.Row>
                        </PrimaryTable.Header>
                        <PrimaryTable.Body>
                            {sortedItems.map((nca) => (
                            <CollapsibleRow
                                key={nca.id}
                                isOpen={openRowId === nca.id}
                                setIsOpen={(isOpen) => setOpenRowId(isOpen ? nca.id : null)}
                                tableType="primary"
                                mainRow={(
                                <>
                                    <PrimaryTable.Cell>
                                    <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(nca.name)}/`}>{nca.id}</ExternalLink>
                                    </PrimaryTable.Cell>
                                    <PrimaryTable.Cell>{nca.name}</PrimaryTable.Cell>
                                    <PrimaryTable.NumericCell>{formatNumber(nca.size, 0)}</PrimaryTable.NumericCell>
                                    <PrimaryTable.CenteredNumericCell>{nca.siteCount}</PrimaryTable.CenteredNumericCell>
                                    <PrimaryTable.CenteredNumericCell>{nca.adjacents?.length || 0}</PrimaryTable.CenteredNumericCell>
                                    <PrimaryTable.Cell>
                                    <Text
                                      as="button"
                                      onClick={(e) => { e.stopPropagation(); handleMapSelection(nca); }}
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
                                    <Text as="h4" fontSize="1rem" fontWeight="bold" marginTop="0" marginBottom="0.75rem">Adjacent NCAs</Text>
                                    {nca.adjacents && nca.adjacents.length > 0 ? (
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
                                        {nca.adjacents.map(adj => {
                                            const adjacentNcaObject = ncas.find(n => n.id === adj.id);
                                            return (
                                            <DataTable.Row key={adj.id}>
                                              <DataTable.Cell>{adj.id}</DataTable.Cell>
                                              <DataTable.Cell>{adj.name}</DataTable.Cell>
                                              <DataTable.NumericCell>{formatNumber(adj.size, 0)}</DataTable.NumericCell>
                                              <DataTable.CenteredNumericCell>{adjacentNcaObject?.siteCount || 0}</DataTable.CenteredNumericCell>
                                              <DataTable.Cell>
                                                <Text
                                                  as="button"
                                                  onClick={(e) => { e.stopPropagation(); handleAdjacentMapSelection(adjacentNcaObject); }}
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
                                    ) : (<Text>No adjacency data available.</Text>)}
                                </Box>
                                )}
                                colSpan={6}
                            />
                            ))}
                        </PrimaryTable.Body>
                    </PrimaryTable.Root>
                )}
            </SearchableTableLayout>
            <Text fontStyle="italic">When a site map is selected, adjacent NCAs are shown coloured pink.</Text>
        </>
        }
    />
  );
}
