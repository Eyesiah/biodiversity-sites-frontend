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
  const { chartData, totalSites, totalArea } = useMemo(() => {
    if (!sites || sites.length === 0) return { chartData: [], totalSites: 0, totalArea: 0 };

    const totalSites = sites.length;
    const totalArea = sites.reduce((sum, site) => sum + (site.siteSize || 0), 0);

    // Process sites and group those under 2% into "Other"
    const sitesWithArea = sites.filter(site => site.siteSize && site.siteSize > 0);
    const majorSites = [];
    const minorSites = [];
    let otherArea = 0;
    let otherCount = 0;

    sitesWithArea.forEach(site => {
      const percentage = (site.siteSize / totalArea) * 100;
      if (site.siteSize >= 50) {
        majorSites.push({
          name: site.referenceNumber || site.name || `Site ${site.id}`,
          value: site.siteSize,
          percentage: percentage.toFixed(1),
          siteSize: site.siteSize
        });
      } else {
        minorSites.push(site);
        otherArea += site.siteSize;
        otherCount += 1;
      }
    });

    // Sort major sites by size descending
    majorSites.sort((a, b) => b.value - a.value);

    // Add "Other" segment if there are minor sites
    const chartData = [...majorSites];
    if (otherArea > 0) {
      chartData.push({
        name: `<50 ha (${otherCount} sites)`,
        value: otherArea,
        percentage: ((otherArea / totalArea) * 100).toFixed(1),
        siteSize: otherArea
      });
    }

    return { chartData, totalSites, totalArea };
  }, [sites]);

  // Color scheme for different size intervals
  const COLORS = ['#FF9800', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box bg="white" p="10px" border="1px solid #ccc" borderRadius="4px">
          <Text fontWeight="bold" color="black" mb="5px">{data.name}</Text>
          <Text color="#36454F">
            {formatNumber(data.siteSize, 1)} ha ({data.percentage}%)
          </Text>
        </Box>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return <Text>No site data available to display.</Text>;
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Get the data for this segment
    const data = chartData[index];
    const count = data.value;
    const percentage = data.percentage;

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontWeight: 'bold', fontSize: '12px' }}
      >
        {`${count} (${percentage}%)`}
      </text>
    );
  };

  return (
    <Box bg="bg" p="1rem">
      <Text textAlign="center" mb={4} fontSize="md" color="gray.600">
        Distribution of BGS sites by size (Total sites: {totalSites})
      </Text>
      <ResponsiveContainer width="100%" height={500}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="80%"
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
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
                title: ({ sortedItems }) => `BGS Site Use Chart (${sortedItems.length})`,
                content: ({ sortedItems }) => {
                  return <SitesAreaCompositionChart sites={sortedItems} />;
                }
              },
              {
                title: ({ sortedItems }) => `BGS Size Distribution (${sortedItems.length})`,
                content: ({ sortedItems }) => <SiteSizeDistributionChart sites={sortedItems} />
              }

            ]}
          />
        </ContentStack>
      }
    />
  )
}
