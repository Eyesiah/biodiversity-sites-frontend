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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, PieChart, Pie, Cell, Legend } from 'recharts';
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

const SiteSizeDistributionChart = ({sites}) => {
  const chartData = useMemo(() => {
    if (!sites || sites.length === 0) return [];

    const sizeCounts = sites.reduce((acc, site) => {
      const size = site.siteSize || 0;
      let interval;
      if (size <= 10) {
        interval = '0-10 ha';
      } else if (size <= 20) {
        interval = '10-20 ha';
      } else if (size <= 30) {
        interval = '20-30 ha';
      } else if (size <= 40) {
        interval = '30-40 ha';
      } else if (size <= 50) {
        interval = '40-50 ha';
      } else if (size <= 60) {
        interval = '50-60 ha';
      } else if (size <= 70) {
        interval = '60-70 ha';
      } else if (size <= 80) {
        interval = '70-80 ha';
      } else if (size <= 90) {
        interval = '80-90 ha';
      } else if (size <= 100) {
        interval = '90-100 ha';
      } else {
        interval = '>100 ha';
      }
      acc[interval] = (acc[interval] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(sizeCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: ((count / sites.length) * 100).toFixed(1)
      }))
      .sort((a, b) => {
        const order = ['0-10 ha', '10-20 ha', '20-30 ha', '30-40 ha', '40-50 ha', '50-60 ha', '60-70 ha', '70-80 ha', '80-90 ha', '90-100 ha', '>100 ha'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  }, [sites]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box bg="white" p="10px" border="1px solid #ccc" borderRadius="4px">
          <Text fontWeight="bold" color="black" mb="5px">{label}</Text>
          <Text color="#36454F">
            {data.count} sites ({data.percentage}%)
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 50, right: 30, left: 20, bottom: 15 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: 'Site Size Intervals', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
          <YAxis label={{ value: 'Number of Sites', angle: -90, position: 'insideLeft', fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#4CAF50">
            <LabelList />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}


// Column configuration for the main sites list page (includes LNRS and IMD Decile)
const FULL_SITE_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'huGain', 'lpaName', 'ncaName', 'lnrsName', 'imdDecile'];

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
              const filteredCreatedHUs = sortedItems.reduce((sum, site) => sum + (site.createdHUs || 0) + (site.enhancedHUs || 0), 0);
              const filteredHUGain = sortedItems.reduce((sum, site) => sum + (site.huGain || 0), 0);

              return (
                <Text fontSize="1.2rem">
                  This list of <Text as="strong">{formatNumber(filteredCount, 0)}</Text> sites covers <Text as="strong">{formatNumber(filteredArea, 0)}</Text> hectares.
                  They comprise <Text as="strong">{formatNumber(filteredBaselineHUs, 0)}</Text> baseline and <Text as="strong">{formatNumber(filteredCreatedHUs, 0)}</Text> improvement habitat units (Total HU Gain <Text as="strong">{formatNumber(filteredHUGain, 0)}</Text>).
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
                title: "BGS Site Use Chart",
                content: ({ sortedItems }) => {
                  return <SitesAreaCompositionChart sites={sortedItems} />;
                }
              },
              {
                title:"BGS Size Distribution",
                content: ({ sortedItems }) => <SiteSizeDistributionChart sites={sortedItems} />
              }

            ]}
          />
        </ContentStack>
      }
    />
  )
}
