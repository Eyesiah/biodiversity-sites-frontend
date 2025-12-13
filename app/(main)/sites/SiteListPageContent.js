'use client'

import { useState, useCallback, useEffect, useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SiteList from '@/components/data/SiteList';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import { ContentStack } from '@/components/styles/ContentStack'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { SitesAreaCompositionChart } from '@/components/charts/SitesAreaCompositionChart';

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const IMDSiteDecileChart = ({sites}) => {

  const imdChart = useMemo(() => {
    if (sites == null) return [];

    const decileCounts = sites.reduce((acc, site) => {
      const decile = site.imdDecile ?? 'N/A';
      acc[decile] = (acc[decile] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(decileCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'N/A') return 1;
        if (b.name === 'N/A') return -1;
        return Number(a.name) - Number(b.name);
      });
  }, [sites]);

  return (
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
}


// Column configuration for the main sites list page (includes LNRS and IMD Decile)
const FULL_SITE_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName', 'lnrsName', 'imdDecile', 'huGain', 'huGainPerHa'];

export default function SiteListPageContent({ sites }) {
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
                (item.name?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.responsibleBodies?.join(', ').toLowerCase() || '').includes(lowercasedTerm) ||
                (item.lpaName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.ncaName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.lnrsName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.imdDecile?.toString() || '').includes(lowercasedTerm)
              );
            }}
            initialSortConfig={{ key: 'referenceNumber', direction: 'descending' }}
            placeholder="Search by BGS reference, site name, Responsible Body, LPA or NCA."
            exportConfig={{
              onExportCsv: handleExport
            }}
            summary={(filteredCount, totalCount, sortedItems) => {

              const filteredArea = sortedItems.reduce((sum, site) => sum + (site.siteSize || 0), 0);

              const filteredBaselineHUs = sortedItems.reduce((sum, site) => sum + (site.baselineHUs || 0), 0);
              const filteredCreatedHUs = sortedItems.reduce((sum, site) => sum + (site.improvementHUs || 0), 0);

              return (
                <Text fontSize="1.2rem">
                  This list of <Text as="strong">{formatNumber(filteredCount, 0)}</Text> sites covers <Text as="strong">{formatNumber(filteredArea, 0)}</Text> hectares.
                  They comprise <Text as="strong">{formatNumber(filteredBaselineHUs, 0)}</Text> baseline and <Text as="strong">{formatNumber(filteredCreatedHUs, 0)}</Text> improvement habitat units (Total HU Gain <Text as="strong">{formatNumber(filteredCreatedHUs - filteredBaselineHUs, 0)}</Text>).
                </Text>
              );
            }}
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
                content: ({ sortedItems }) => <IMDSiteDecileChart sites={sortedItems} />
              },
              {
                title: ({ sortedItems }) => `BGS Site Use Chart (${sortedItems.length})`,
                content: ({ sortedItems }) => {
                  return <SitesAreaCompositionChart sites={sortedItems} />;
                }
              },

            ]}
          />
        </ContentStack>
      }
    />
  )
}
