'use client';

import Papa from 'papaparse';
import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import SearchableBodiesLayout from './SearchableBodiesLayout';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import { DataTable } from '@/components/styles/DataTable';
import { Box, Text } from '@chakra-ui/react';

// Headers configuration for LPA table
const HEADERS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size (ha)', textAlign: 'right', format: (val) => formatNumber(val, 0) },
  { key: 'siteCount', label: '# BGS Sites', textAlign: 'center' },
  { key: 'allocationsCount', label: '# Allocations', textAlign: 'center' },
  { key: 'adjacentsCount', label: '# Adjacent LPAs', textAlign: 'center', render: (lpa) => lpa.adjacents?.length || 0 },
];

/**
 * Render LPA details with adjacency table (currently not used - to be used with modal popup later)
 * @param {Object} lpa - The LPA object with adjacents array
 * @param {Array} allLpas - All LPA objects for looking up site counts
 */
export function renderLpaAdjacencyTable(lpa, allLpas) {
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
            </DataTable.Row>
          </DataTable.Header>
          <DataTable.Body>
            {lpa.adjacents.map(adj => {
              const adjacentLpaObject = allLpas?.find(l => l.id === adj.id);
              return (
                <DataTable.Row key={adj.id}>
                  <DataTable.Cell>{adj.id}</DataTable.Cell>
                  <DataTable.Cell>{adj.name}</DataTable.Cell>
                  <DataTable.NumericCell>{formatNumber(adj.size, 0)}</DataTable.NumericCell>
                  <DataTable.CenteredNumericCell>{adjacentLpaObject?.siteCount || 0}</DataTable.CenteredNumericCell>
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

export default function LPAContent({ lpas, sites, onMapSitesChange, onSelectedPolygonChange }) {
  // Pre-process lpas to add sites array for each body
  const lpasWithSites = useMemo(() => {
    if (!sites) return lpas;
    return lpas.map(item => ({
      ...item,
      sites: item.sites.map(ref => sites.find(s => s.referenceNumber == ref)),
      siteCount: item.sites.length
    }));
  }, [lpas, sites]);

  // Pre-process to add adjacentsCount
  const processedBodies = useMemo(() => {
    return lpasWithSites.map(item => ({
      ...item,
      adjacentsCount: item.adjacents?.length || 0
    }));
  }, [lpasWithSites]);

  const totalArea = useMemo(() => lpas.reduce((sum, lpa) => sum + lpa.size, 0), [lpas]);

  return (
    <SearchableBodiesLayout
      bodies={processedBodies}
      headers={HEADERS}
      bodyNameKey="name"
      sitesKey="sites"
      filterPredicate={(item, term) =>
        (item.name?.toLowerCase() || '').includes(term) ||
        (item.id?.toLowerCase() || '').includes(term)
      }
      initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
      summary={(filteredCount, totalCount) => (
        <Text fontSize="1.2rem">
          Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> <GlossaryTooltip term='Local Planning Authority (LPA)'>LPAs</GlossaryTooltip>, covering a total of <Text as="strong">{formatNumber(totalArea, 0)}</Text> hectares.
        </Text>
      )}
      exportConfig={{
        onExportCsv: (items) => {
          const csvData = items.map(item => ({
            'ID': item.id,
            'Name': item.name,
            'Size (ha)': item.size,
            '# BGS Sites': item.siteCount,
            '# Allocations': item.allocationsCount,
            '# Adjacent LPAs': item.adjacentsCount,
          }));
          const csv = Papa.unparse(csvData);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, 'lpas.csv');
        }
      }}
      onMapSitesChange={onMapSitesChange}
      onSiteClick={(site) => {
        // When a site is clicked, update the polygon to show this LPA
        if (site?.lpaName) {
          const matchingLpa = lpas.find(l => l.name === site.lpaName);
          onSelectedPolygonChange?.(matchingLpa);
        }
      }}
    />
  );
}
