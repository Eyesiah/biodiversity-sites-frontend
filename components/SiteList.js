import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { Text, Box } from '@chakra-ui/react';
import { PrimaryTable } from '@/components/ui/PrimaryTable';

const SiteList = ({ sites, onSiteHover, onSiteClick, minimalHeight=false }) => {
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

  const hasAllocPercentage = sites[0].allocatedHabitatArea != null;

  const table = (
    <PrimaryTable.Root>
      <PrimaryTable.Header>
        <PrimaryTable.Row>
          <PrimaryTable.ColumnHeader 
            onClick={() => requestSort('referenceNumber')} 
          >
            BGS Reference{getSortIndicator('referenceNumber')}
          </PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader 
            onClick={() => requestSort('responsibleBodies')} 
          >
            Responsible Body{getSortIndicator('responsibleBodies')}
          </PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader 
            onClick={() => requestSort('siteSize')} 
          >
            {hasAllocPercentage ? 'Habitat Size' : 'Size (ha)'}{getSortIndicator('siteSize')}
          </PrimaryTable.ColumnHeader>
          {!hasAllocPercentage && (
            <PrimaryTable.ColumnHeader 
              onClick={() => requestSort('allocationsCount')} 
            >
              {getSortIndicator('allocationsCount')}# Allocations
            </PrimaryTable.ColumnHeader>
          )}
          {hasAllocPercentage && (
            <PrimaryTable.ColumnHeader 
              onClick={() => requestSort('allocatedHabitatArea')} 
            >
              {getSortIndicator('allocatedHabitatArea')}% Allocated
            </PrimaryTable.ColumnHeader>
          )}
          <PrimaryTable.ColumnHeader 
            onClick={() => requestSort('lpaName')} 
          >
            Local Planning Authority (LPA){getSortIndicator('lpaName')}
          </PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader 
            onClick={() => requestSort('ncaName')} 
          >
            National Character Area (NCA){getSortIndicator('ncaName')}
          </PrimaryTable.ColumnHeader>
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
            <PrimaryTable.Cell textAlign="left">
              <Link href={`/sites/${site.referenceNumber}`}>
                {site.referenceNumber}
              </Link>
            </PrimaryTable.Cell>
            <PrimaryTable.Cell textAlign="left">
              {site.responsibleBodies?.join(', ')}
            </PrimaryTable.Cell>
            <PrimaryTable.Cell 
              textAlign="right" 
              fontFamily="mono"
            >
              {formatNumber(site.siteSize)}
            </PrimaryTable.Cell>
            {!hasAllocPercentage && (
              <PrimaryTable.Cell 
                textAlign="center" 
                fontFamily="mono"
              >
                {site.allocationsCount}
              </PrimaryTable.Cell>
            )}
            {hasAllocPercentage && (
              <PrimaryTable.Cell 
                textAlign="center" 
                fontFamily="mono"
              >
                {site.allocatedHabitatArea && site.allocatedHabitatArea > 0 ? `${formatNumber((site.allocatedHabitatArea / site.siteSize) * 100)}%` : ''}
              </PrimaryTable.Cell>
            )}
            <PrimaryTable.Cell textAlign="left">
              {site.lpaName}
            </PrimaryTable.Cell>
            <PrimaryTable.Cell textAlign="left">
              {site.ncaName}
            </PrimaryTable.Cell>
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