import React from 'react';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { Text, Box } from '@chakra-ui/react';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { useSortableData } from '@/lib/hooks';

// Default column configuration for basic site list
const DEFAULT_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName'];

const ALL_SITE_COLUMNS = {
  'referenceNumber': {label: 'BGS Reference', textAlign: 'left' },
  'responsibleBodies': {label: 'Responsible Body', textAlign: 'left' },
  'siteSize': {label: 'Size (ha)', textAlign: 'right', fontFamily: 'mono', format: (val) => formatNumber(val) },
  'huGain': {label: 'HU Gain', textAlign: 'right', fontFamily: 'mono', format: (val) => formatNumber(val) },
  'allocationsCount': {label: '# Allocations', textAlign: 'center', fontFamily: 'mono' },
  'allocatedHabitatArea': {label: '% Allocated', textAlign: 'center', fontFamily: 'mono', format: (val, site) => val && val > 0 ? `${formatNumber((val / site.siteSize) * 100)}%` : '' },
  'lpaName': {label: 'Local Planning Authority (LPA)', textAlign: 'left' },
  'ncaName': {label: 'National Character Area (NCA)', textAlign: 'left' },
  'lnrsName': {label: 'Local Nature Recovery Strategy (LNRS)', textAlign: 'left' },
  'imdDecile': {label: 'IMD Decile', textAlign: 'center', fontFamily: 'mono' },
}

const SiteList = ({ sites, onSiteHover, onSiteClick, minimalHeight=false, columns = DEFAULT_COLUMNS }) => {
  const { items: sortedSites, requestSort, getSortIndicator } = useSortableData(
    sites,
    { key: 'siteSize', direction: 'descending' }
  );

  if (!sortedSites || sortedSites.length === 0) {
    return <Text>No site data available.</Text>;
  }

  // Helper to render cell content
  const renderCellContent = (site, column) => {
    const value = site[column];
    
    // Special handling for referenceNumber - render as link
    if (column === 'referenceNumber') {
      return (
        <Link href={`/sites/${site.referenceNumber}`} onClick={(e) => e.stopPropagation()}>
          {value}{site.name && <><br /><b>{site.name}</b></>}
        </Link>
      );
    }
    
    // Special handling for array values
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // Use custom format function if provided
    if (ALL_SITE_COLUMNS[column].format) {
      return ALL_SITE_COLUMNS[column].format(value, site);
    }
    
    return value;
  };

  const table = (
    <PrimaryTable.Root>
      <PrimaryTable.Header>
        <PrimaryTable.Row>
          {columns.map((column) => (
            <PrimaryTable.ColumnHeader 
              key={column}
              onClick={() => requestSort(column)} 
            >
              {ALL_SITE_COLUMNS[column].label}{getSortIndicator(column)}
            </PrimaryTable.ColumnHeader>
          ))}
        </PrimaryTable.Row>
      </PrimaryTable.Header>
      <PrimaryTable.Body>
        {sortedSites.map((site) => (
          <PrimaryTable.Row 
            key={site.referenceNumber} 
            onMouseEnter={() => {if (onSiteHover) onSiteHover(site)}} 
            onMouseLeave={() => {if (onSiteHover) onSiteHover(null)}} 
            onClick={() => { if (onSiteClick) onSiteClick(site)}} 
          >
            {columns.map((column) => (
              <PrimaryTable.Cell 
                key={column}
                textAlign={ALL_SITE_COLUMNS[column].textAlign}
                fontFamily={ALL_SITE_COLUMNS[column].fontFamily}
              >
                {renderCellContent(site, column)}
              </PrimaryTable.Cell>
            ))}
          </PrimaryTable.Row>
        ))}
      </PrimaryTable.Body>
    </PrimaryTable.Root>
  );

  if (minimalHeight) {
    return (
      <Box maxHeight="20rem" overflowY="auto">
        {table}
      </Box>
    )
  } else {
    return table;
  }
};

export default SiteList;