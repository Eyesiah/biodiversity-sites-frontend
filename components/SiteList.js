import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { Text, Box } from '@chakra-ui/react';
import { SiteTable } from '@/components/ui/SiteTable';

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
    <SiteTable.Root>
      <SiteTable.Header>
        <SiteTable.Row>
          <SiteTable.ColumnHeader 
            onClick={() => requestSort('referenceNumber')} 
          >
            BGS Reference{getSortIndicator('referenceNumber')}
          </SiteTable.ColumnHeader>
          <SiteTable.ColumnHeader 
            onClick={() => requestSort('responsibleBodies')} 
          >
            Responsible Body{getSortIndicator('responsibleBodies')}
          </SiteTable.ColumnHeader>
          <SiteTable.ColumnHeader 
            onClick={() => requestSort('siteSize')} 
          >
            {hasAllocPercentage ? 'Habitat Size' : 'Size (ha)'}{getSortIndicator('siteSize')}
          </SiteTable.ColumnHeader>
          {!hasAllocPercentage && (
            <SiteTable.ColumnHeader 
              onClick={() => requestSort('allocationsCount')} 
            >
              {getSortIndicator('allocationsCount')}# Allocations
            </SiteTable.ColumnHeader>
          )}
          {hasAllocPercentage && (
            <SiteTable.ColumnHeader 
              onClick={() => requestSort('allocatedHabitatArea')} 
            >
              {getSortIndicator('allocatedHabitatArea')}% Allocated
            </SiteTable.ColumnHeader>
          )}
          <SiteTable.ColumnHeader 
            onClick={() => requestSort('lpaName')} 
          >
            Local Planning Authority (LPA){getSortIndicator('lpaName')}
          </SiteTable.ColumnHeader>
          <SiteTable.ColumnHeader 
            onClick={() => requestSort('ncaName')} 
          >
            National Character Area (NCA){getSortIndicator('ncaName')}
          </SiteTable.ColumnHeader>
        </SiteTable.Row>
      </SiteTable.Header>
      <SiteTable.Body>
        {sortedSites.map((site) => (
          <SiteTable.Row 
            key={site.referenceNumber} 
            onMouseEnter={() => {if (onSiteHover) onSiteHover(site)}} 
            onMouseLeave={() => {if (onSiteHover) onSiteHover(null)}} 
            onClick={() => { if (onSiteClick) onSiteClick(site)}} 
          >
            <SiteTable.Cell textAlign="left">
              <Link href={`/sites/${site.referenceNumber}`}>
                {site.referenceNumber}
              </Link>
            </SiteTable.Cell>
            <SiteTable.Cell textAlign="left">
              {site.responsibleBodies?.join(', ')}
            </SiteTable.Cell>
            <SiteTable.Cell 
              textAlign="right" 
              fontFamily="mono"
            >
              {formatNumber(site.siteSize)}
            </SiteTable.Cell>
            {!hasAllocPercentage && (
              <SiteTable.Cell 
                textAlign="center" 
                fontFamily="mono"
              >
                {site.allocationsCount}
              </SiteTable.Cell>
            )}
            {hasAllocPercentage && (
              <SiteTable.Cell 
                textAlign="center" 
                fontFamily="mono"
              >
                {site.allocatedHabitatArea && site.allocatedHabitatArea > 0 ? `${formatNumber((site.allocatedHabitatArea / site.siteSize) * 100)}%` : ''}
              </SiteTable.Cell>
            )}
            <SiteTable.Cell textAlign="left">
              {site.lpaName}
            </SiteTable.Cell>
            <SiteTable.Cell textAlign="left">
              {site.ncaName}
            </SiteTable.Cell>
          </SiteTable.Row>
        ))}
      </SiteTable.Body>
    </SiteTable.Root>
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