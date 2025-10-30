'use client'

import { useState, useCallback, useEffect, useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SiteList from '@/components/data/SiteList';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { Box, Text } from '@chakra-ui/react';
import { ContentStack } from '@/components/styles/ContentStack'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

// Column configuration for the main sites list page (includes LNRS and IMD Decile)
const FULL_SITE_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName', 'lnrsName', 'imdDecile'];

export default function SiteListPageContent({ sites, summary, imdChart, imdDiffChart = [] }) {
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
                title: "IMD Decile chart",
                content: ({ sortedItems }) => (
                  <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={imdChart} margin={{ top: 50, right: 30, left: 20, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" name="BGS IMD Score" label={{ value: 'BGS IMD Score', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                        <YAxis tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#dcab1bff">
                          <LabelList />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )
              },
              {
                title: "IMD Allocation/BGS Scores Transfer Histogram",
                content: ({ sortedItems }) => (
                  <>
                    <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={imdDiffChart} margin={{ top: 50, right: 30, left: 20, bottom: 15 }} barCategoryGap={0}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" name="IMD Difference" label={{ value: 'Site IMD Score - Allocation IMD Score', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                          <YAxis tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#dcab1bff">
                            <LabelList />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                    <Text fontSize="0.9rem" color="#36454F" textAlign="center" marginTop="2">
                      A negative value shows a transfer to a less-deprived LSOA. A positive value shows a transfer to more deprived LSOA.
                    </Text>
                  </>
                )
              }
            ]}
          />
        </ContentStack>
      }
    />
  )
}
