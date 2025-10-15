import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { Text, Box } from '@chakra-ui/react';
import { PrimaryTable } from '@/components/ui/PrimaryTable';

// Default column configuration for basic site list
const DEFAULT_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName'];

const ALL_SITE_COLUMNS = {
  'referenceNumber': {label: 'BGS Reference', textAlign: 'left' },
  'responsibleBodies': {label: 'Responsible Body', textAlign: 'left' },
  'siteSize': {label: 'Size (ha)', textAlign: 'right', fontFamily: 'mono', format: (val) => formatNumber(val) },
  'allocationsCount': {label: '# Allocations', textAlign: 'center', fontFamily: 'mono' },
  'allocatedHabitatArea': {label: '% Allocated', textAlign: 'center', fontFamily: 'mono', format: (val, site) => val && val > 0 ? `${formatNumber((val / site.siteSize) * 100)}%` : '' },
  'lpaName': {label: 'Local Planning Authority (LPA)', textAlign: 'left' },
  'ncaName': {label: 'National Character Area (NCA)', textAlign: 'left' },
  'lnrsName': {label: 'Local Nature Recovery Strategy (LNRS)', textAlign: 'left' },
  'imdDecile': {label: 'IMD Decile', textAlign: 'center', fontFamily: 'mono' },
}

const SiteList = ({ sites, onSiteHover, onSiteClick, minimalHeight=false, columns = DEFAULT_COLUMNS }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'referenceNumber', direction: 'descending' });

  const sortedSites = useMemo(() => {
    if (!sites) return [];
    let sortableSites = [...sites];
    if (sortConfig.key !== null) {
      sortableSites.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Special handling for BGS Reference to sort numerically
        if (sortConfig.key === 'referenceNumber') {
          aValue = parseInt(a.referenceNumber.split('-')[1] || '0', 10);
          bValue = parseInt(b.referenceNumber.split('-')[1] || '0', 10);
        }

        // Handle array values by joining them
        if (Array.isArray(aValue)) {
          aValue = aValue.join(', ');
        }
        if (Array.isArray(bValue)) {
          bValue = bValue.join(', ');
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableSites;
  }, [sites, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (name) => {
    if (sortConfig.key !== name) {
      return '';
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  if (!sites || sites.length === 0) {
    return <Text>No site data available.</Text>;
  }

  // Helper to render cell content
  const renderCellContent = (site, column) => {
    const value = site[column];
    
    // Special handling for referenceNumber - render as link
    if (column === 'referenceNumber') {
      return (
        <Link href={`/sites/${site.referenceNumber}`}>
          {value}
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