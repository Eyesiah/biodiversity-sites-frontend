'use client'

import { useState, useCallback, useEffect, useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/MapContentLayout';
import SiteList from '@/components/SiteList';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { Box, Text } from '@chakra-ui/react';
import { ContentStack } from '@/components/ui/ContentStack'

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

// Column configuration for the main sites list page (includes LNRS and IMD Decile)
const FULL_SITE_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName', 'lnrsName', 'imdDecile'];

export default function SiteListPageContent({ sites, summary }) {
  const [hoveredSite, setHoveredSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [filteredSites, setFilteredSites] = useState(sites);

  // Update filteredSites when sites prop changes
  useEffect(() => {
    setFilteredSites(sites);
  }, [sites]);

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
  };

  const handleExport = async () => {
    const response = await fetch('api/query/sites/csv');
    const blob = await response.blob();
    triggerDownload(blob, 'bgs-sites.csv');
  };

  const handleSortedItemsChange = useCallback((sortedItems) => {
    // todo: fix infinite loop here
    //setFilteredSites(sortedItems);
  }, []);

  return (
    <MapContentLayout
      map={
        <SiteMap sites={filteredSites} hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} />
      }
      content={
        <ContentStack>
          <SearchableTableLayout
            initialItems={sites}
            filterPredicate={(item, term) => {
              const lowercasedTerm = term.toLowerCase();
              return (
                (item.referenceNumber?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.responsibleBodies?.join(', ').toLowerCase() || '').includes(lowercasedTerm) ||
                (item.lpaName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.ncaName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.lnrsName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.imdDecile?.toString() || '').includes(lowercasedTerm)
              );
            }}
            initialSortConfig={{ key: 'referenceNumber', direction: 'descending' }}
            placeholder="Search by BGS reference, Responsible Body, LPA or NCA."
            exportConfig={{
              onExportCsv: handleExport
            }}
            summary={(filteredCount, totalCount) => (
              <Text fontSize="1.2rem">
                This list of <Text as="strong">{formatNumber(totalCount, 0)}</Text> sites covers <Text as="strong">{formatNumber(summary.totalArea, 0)}</Text> hectares.
                They comprise <Text as="strong">{formatNumber(summary.totalBaselineHUs, 0)}</Text> baseline and <Text as="strong">{formatNumber(summary.totalCreatedHUs, 0)}</Text> created improvement habitat units.
              </Text>
            )}
            onSortedItemsChange={handleSortedItemsChange}
            tabs={[
              {
                title: "Sites",
                content: ({ sortedItems }) => (
                  <Box width="100%" overflowX="auto">
                    <SiteList
                      sites={sortedItems}
                      onSiteHover={setHoveredSite}
                      onSiteClick={handleSiteSelect}
                      columns={FULL_SITE_COLUMNS}
                    />
                  </Box>
                )
              },
              {
                title: "IMG Decile charts",
                content: ({ sortedItems }) => (
                  <Box width="100%" overflowX="auto">
                    <Text>TODO</Text>
                  </Box>
                )
              }
            ]}
          />
        </ContentStack>
      }
    />
  )
}