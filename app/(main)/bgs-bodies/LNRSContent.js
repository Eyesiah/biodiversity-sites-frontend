'use client';

import Papa from 'papaparse';
import { useMemo } from 'react';
import { formatNumber, slugify } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import SearchableBodiesLayout from './SearchableBodiesLayout';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import { InfoButton } from '@/components/styles/InfoButton';
import { DataTable } from '@/components/styles/DataTable';
import { Box, Text } from '@chakra-ui/react';

// Headers configuration for LNRS table
const HEADERS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'LNRS Name' },
  { key: 'responsibleAuthority', label: 'Responsible Authority' },
  { key: 'publicationStatus', label: 'Publication Status' },
  { key: 'size', label: 'Size (ha)', textAlign: 'right', format: (val) => formatNumber(val, 0) },
  { key: 'siteCount', label: '# BGS Sites', textAlign: 'center' },
  { 
    key: 'adjacentsCount', 
    label: '# Adjacent LNRS', 
    textAlign: 'center', 
    render: (lnrs, modalType, setModalState) => {
      const count = lnrs.adjacents?.length || 0;
      if (count === 0) return count;
      return (
        <>
          {count}
          <InfoButton 
            onClick={() => setModalState({ 
              show: true, 
              type: modalType, 
              name: slugify(lnrs.name), 
              title: `Adjacent LNRS: ${lnrs.name}`,
              size: 'md'
            })} 
          />
        </>
      );
    }
  },
];

/**
 * Render adjacency table for LNRS (currently not used - to be used with modal popup later)
 * @param {Object} lnrs - The LNRS object with adjacents array
 * @param {Array} allLnrs - All LNRS objects for looking up site counts
 */
export function renderAdjacencyTable(lnrs, allLnrs) {
  return (
    <Box padding="0.5rem">
      <Text as="h4" fontSize="1rem" fontWeight="bold" marginTop="0" marginBottom="0.75rem">Adjacent LNRS Areas</Text>
      {lnrs.adjacents && lnrs.adjacents.length > 0 ? (
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
            {lnrs.adjacents.map(adj => {
              const adjacentLnrsObject = allLnrs.find(l => l.id === adj.id);
              return (
                <DataTable.Row key={adj.id}>
                  <DataTable.Cell>{adj.id}</DataTable.Cell>
                  <DataTable.Cell>{adj.name}</DataTable.Cell>
                  <DataTable.CenteredNumericCell>{formatNumber(adj.size, 0)}</DataTable.CenteredNumericCell>
                  <DataTable.CenteredNumericCell>{adjacentLnrsObject?.siteCount || 0}</DataTable.CenteredNumericCell>
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

export default function LNRSContent({ lnrs, sites, error, onMapSitesChange, onSelectedPolygonChange }) {
  // Pre-process to add siteCount and adjacentsCount (without expanding sites)
  const processedBodies = useMemo(() => {
    return lnrs.map(item => ({
      ...item,
      siteCount: item.sites?.length || 0,
      adjacentsCount: item.adjacents?.length || 0
    }));
  }, [lnrs]);

  const totalArea = useMemo(() => lnrs.reduce((sum, item) => sum + item.size, 0), [lnrs]);

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
          Displaying <Text as="strong">{formatNumber(filteredCount, 0)}</Text> of <Text as="strong">{formatNumber(totalCount, 0)}</Text> <GlossaryTooltip term='Local Nature Recovery Strategy (LNRS) site'>LNRS</GlossaryTooltip> areas, covering a total of <Text as="strong">{formatNumber(totalArea, 0)}</Text> hectares.
        </Text>
      )}
      exportConfig={{
        onExportCsv: (items) => {
          const csvData = items.map(item => ({
            'ID': item.id,
            'Name': item.name,
            'Responsible Authority': item.responsibleAuthority,
            'Publication Status': item.publicationStatus,
            'Size (ha)': item.size,
            '# BGS Sites': item.siteCount,
            '# Adjacent LNRS': item.adjacentsCount,
          }));
          const csv = Papa.unparse(csvData);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          triggerDownload(blob, 'lnrs-areas.csv');
        }
      }}
      onMapSitesChange={onMapSitesChange}
      modalType="lnrs"
      onSiteClick={(site) => {
        // When a site is clicked, update the polygon to show this LNRS
        if (site?.lnrsName) {
          const matchingLnrs = lnrs.find(l => l.name === site.lnrsName);
          onSelectedPolygonChange?.(matchingLnrs);
        }
      }}
    />
  );
}
