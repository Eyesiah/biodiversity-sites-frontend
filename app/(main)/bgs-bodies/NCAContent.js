'use client';

import Papa from 'papaparse';
import { useMemo } from 'react';
import ExternalLink from '@/components/ui/ExternalLink';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import SearchableBodiesLayout from './SearchableBodiesLayout';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import { DataTable } from '@/components/styles/DataTable';
import { Box, Text } from '@chakra-ui/react';

// Headers configuration for NCA table
const HEADERS = [
  { key: 'id', label: 'ID', render: (nca) => <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(nca.name)}/`}>{nca.id}</ExternalLink> },
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size (ha)', textAlign: 'right', format: (val) => formatNumber(val, 0) },
  { key: 'siteCount', label: '# BGS Sites', textAlign: 'center' },
  { key: 'adjacentsCount', label: '# Adjacent NCAs', textAlign: 'center', render: (nca) => nca.adjacents?.length || 0 },
];

/**
 * Render adjacency table for NCA (currently not used - to be used with modal popup later)
 * @param {Object} nca - The NCA object with adjacents array
 * @param {Array} allNcas - All NCA objects for looking up site counts
 */
export function renderAdjacencyTable(nca, allNcas) {
  return (
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
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {nca.adjacents.map(adj => {
              const adjacentNcaObject = allNcas.find(n => n.id === adj.id);
              return (
                <DataTable.Row key={adj.id}>
                  <DataTable.Cell>{adj.id}</DataTable.Cell>
                  <DataTable.Cell>{adj.name}</DataTable.Cell>
                  <DataTable.NumericCell>{formatNumber(adj.size, 0)}</DataTable.NumericCell>
                  <DataTable.CenteredNumericCell>{adjacentNcaObject?.siteCount || 0}</DataTable.CenteredNumericCell>
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

export default function NCAContent({ ncas, sites, error, onMapSitesChange, onSelectedPolygonChange }) {
  // Pre-process to add siteCount and adjacentsCount (without expanding sites)
  const processedBodies = useMemo(() => {
    return ncas.map(item => ({
      ...item,
      siteCount: item.sites?.length || 0,
      adjacentsCount: item.adjacents?.length || 0
    }));
  }, [ncas]);

  const totalArea = useMemo(() => ncas.reduce((sum, nca) => sum + nca.size, 0), [ncas]);

  if (error) {
    return <Text color="red">Error fetching data: {error}</Text>;
  }

  return (
    <SearchableBodiesLayout
      bodies={processedBodies}
      allSites={sites}
      headers={HEADERS}
      bodyNameKey="name"
      siteRefsKey="sites"
      filterPredicate={(item, term) => (item.name?.toLowerCase() || '').includes(term)}
      initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
      summary={(filteredCount, totalCount) => (
        <Text fontSize="1.2rem">
          Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> <GlossaryTooltip term='National Character Area (NCA)'>NCAs</GlossaryTooltip>, covering a total of <Text as="strong">{formatNumber(totalArea, 0)}</Text> hectares.
        </Text>
      )}
      exportConfig={{
        onExportCsv: (items) => {
          const csvData = items.map(item => ({
            'ID': item.id,
            'Name': item.name,
            'Size (ha)': item.size,
            '# BGS Sites': item.siteCount,
            '# Adjacent NCAs': item.adjacentsCount,
          }));
          const csv = Papa.unparse(csvData);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, 'ncas.csv');
        }
      }}
      onMapSitesChange={onMapSitesChange}
      onSiteClick={(site) => {
        // When a site is clicked, update the polygon to show this NCA
        if (site?.ncaName) {
          const matchingNca = ncas.find(n => slugify(normalizeBodyName(n.name)) === slugify(normalizeBodyName(site.ncaName)));
          onSelectedPolygonChange?.(matchingNca);
        }
      }}
    />
  );
}
