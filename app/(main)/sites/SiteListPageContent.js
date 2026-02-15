'use client'

import { useState,  useEffect, useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SiteList from '@/components/data/SiteList';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import { ContentStack } from '@/components/styles/ContentStack'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ScatterChart, Scatter, Line } from 'recharts';
import { SitesAreaCompositionChart } from '@/components/charts/SitesAreaCompositionChart';
import { correlation, bootstrapMedianCI, scatter_sums, regression_line } from '@/lib/Stats';

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const IMDSiteDecileChart = ({ sites }) => {

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
          <Bar dataKey="count" fill="#afcd81ff">
            <LabelList />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}

const SiteSizeDistributionChart = ({ sites }) => {
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
          <Bar dataKey="count" fill="#afcd81ff">
            <LabelList />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

const HUGainVsBaselineScatterChart = ({ sites }) => {
  const { scatterData, trendLineData, statistics } = useMemo(() => {
    if (!sites || sites.length === 0) return { scatterData: [], trendLineData: [], statistics: null };

    const data = sites
      .filter(site => site.baselineAreaSize > 0 && site.huGain !== undefined && site.huGain !== null)
      .map(site => ({
        x: site.baselineAreaSize,
        y: site.huGain,
        referenceNumber: site.referenceNumber,
        name: site.name || site.referenceNumber,
        huGain: site.huGain,
        baselineArea: site.baselineAreaSize
      }));

    if (data.length === 0) return { scatterData: [], trendLineData: [], statistics: null };

    // Calculate statistics
    const yValues = data.map(d => d.y);
    const xValues = data.map(d => d.x);

    // Mean
    const mean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;

    // Median
    const sortedY = [...yValues].sort((a, b) => a - b);
    const median = sortedY.length % 2 === 0
      ? (sortedY[sortedY.length / 2 - 1] + sortedY[sortedY.length / 2]) / 2
      : sortedY[Math.floor(sortedY.length / 2)];

    // Standard deviation
    const variance = yValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yValues.length;
    const stdDev = Math.sqrt(variance);

    // 95% confidence interval for median
    const medianCI = bootstrapMedianCI(yValues, 0.95, 1000);

    // Correlation and regression line
    const sums = scatter_sums(xValues, yValues);
    const corr = correlation(sums);
    const regression = regression_line(sums);

    // Create trend line data (two points: min and max x values)
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const trendLineData = [
      { x: minX, y: regression.a + regression.b * minX },
      { x: maxX, y: regression.a + regression.b * maxX }
    ];

    const statistics = {
      correlation: corr,
      mean,
      median,
      stdDev,
      medianCI,
      count: data.length
    };

    return { scatterData: data, trendLineData, statistics };
  }, [sites]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box bg="white" p="10px" border="1px solid #ccc" borderRadius="4px">
          <Text fontWeight="bold" color="black" mb="5px">{data.referenceNumber}</Text>
          <Text color="#36454F">
            Baseline Area: {formatNumber(data.baselineArea, 2)} ha<br />
            HU Gain: {formatNumber(data.huGain, 2)}
          </Text>
        </Box>
      );
    }
    return null;
  };

  if (!scatterData || scatterData.length === 0) {
    return <Text>No data available for HU Gain vs Baseline Habitat Area chart.</Text>;
  }

  return (
    <Box bg="bg" p="1rem">
      <Text textAlign="center" mb={4} fontSize="md" color="gray.600">
        HU Gain vs Baseline Habitat Area Chart
      </Text>
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Baseline Area"
            label={{ value: 'Baseline Habitat Area (ha)', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }}
            tick={{ fill: '#36454F' }}
            axisLine={{ stroke: 'black' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="HU Gain"
            label={{ value: 'HU Gain', angle: -90, position: 'insideLeft', fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }}
            tick={{ fill: '#36454F' }}
            axisLine={{ stroke: 'black' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={scatterData} fill="#afcd81ff" />
          {trendLineData.length > 0 && (
            <Line
              data={trendLineData}
              type="monotone"
              dataKey="y"
              stroke="#87CEEB"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {statistics && (
        <Box mt={4} p={4} bg="bg" borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={3} textAlign="center">
            Statistics for HU Gain (n = {statistics.count})
          </Text>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Correlation</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.correlation?.toFixed(4)}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Mean</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.mean?.toFixed(4)}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Median</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.median?.toFixed(4)}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">95% CI (Median)</Text>
              <Text fontSize="1.1rem" fontWeight="bold" color="#36454F">
                {statistics.medianCI?.lower !== null && statistics.medianCI?.upper !== null
                  ? `${statistics.medianCI.lower.toFixed(4)} - ${statistics.medianCI.upper.toFixed(4)}`
                  : 'N/A'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Std Deviation</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.stdDev?.toFixed(4)}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

const HUGainPerHectareScatterChart = ({ sites }) => {
  const { scatterData, trendLineData, statistics } = useMemo(() => {
    if (!sites || sites.length === 0) return { scatterData: [], trendLineData: [], statistics: null };

    const data = sites
      .filter(site => site.baselineAreaSize > 0 && site.huGain !== undefined && site.huGain !== null && site.huGain > 0)
      .map(site => ({
        x: site.baselineAreaSize,
        y: site.baselineAreaSize / site.huGain,
        referenceNumber: site.referenceNumber,
        name: site.name || site.referenceNumber,
        huGain: site.huGain,
        baselineArea: site.baselineAreaSize
      }));

    if (data.length === 0) return { scatterData: [], trendLineData: [], statistics: null };

    // Calculate statistics
    const yValues = data.map(d => d.y);
    const xValues = data.map(d => d.x);

    // Mean
    const mean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;

    // Median
    const sortedY = [...yValues].sort((a, b) => a - b);
    const median = sortedY.length % 2 === 0
      ? (sortedY[sortedY.length / 2 - 1] + sortedY[sortedY.length / 2]) / 2
      : sortedY[Math.floor(sortedY.length / 2)];

    // Standard deviation
    const variance = yValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yValues.length;
    const stdDev = Math.sqrt(variance);

    // 95% confidence interval for median
    const medianCI = bootstrapMedianCI(yValues, 0.95, 1000);

    // Correlation and regression line
    const sums = scatter_sums(xValues, yValues);
    const corr = correlation(sums);
    const regression = regression_line(sums);

    // Create trend line data (two points: min and max x values)
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const trendLineData = [
      { x: minX, y: regression.a + regression.b * minX },
      { x: maxX, y: regression.a + regression.b * maxX }
    ];

    const statistics = {
      correlation: corr,
      mean,
      median,
      stdDev,
      medianCI,
      count: data.length
    };

    return { scatterData: data, trendLineData, statistics };
  }, [sites]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box bg="white" p="10px" border="1px solid #ccc" borderRadius="4px">
          <Text fontWeight="bold" color="black" mb="5px">{data.referenceNumber}</Text>
          <Text color="#36454F">
            Baseline Area: {formatNumber(data.baselineArea, 2)} ha<br />
            HU Gain: {formatNumber(data.huGain, 2)}<br />
            Hectares per HU Gain: {formatNumber(data.y, 2)}
          </Text>
        </Box>
      );
    }
    return null;
  };

  if (!scatterData || scatterData.length === 0) {
    return <Text>No data available for HU Gain per Hectare chart.</Text>;
  }

  return (
    <Box bg="bg" p="1rem">
      <Text textAlign="center" mb={4} fontSize="md" color="gray.600">
        HU Gain per Hectare (Baseline Habitat)
      </Text>
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Baseline Area"
            label={{ value: 'Baseline Habitat Area (ha)', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }}
            tick={{ fill: '#36454F' }}
            axisLine={{ stroke: 'black' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="HU Gain per hectare"
            label={{ value: 'Hectares per HU Gain', angle: -90, position: 'insideLeft', fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }}
            tick={{ fill: '#36454F' }}
            axisLine={{ stroke: 'black' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={scatterData} fill="#afcd81ff" />
          {trendLineData.length > 0 && (
            <Line
              data={trendLineData}
              type="monotone"
              dataKey="y"
              stroke="#87CEEB"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {statistics && (
        <Box mt={4} p={4} bg="bg" borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={3} textAlign="center">
            Statistics for HU Gain per Hectare (n = {statistics.count})
          </Text>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Correlation</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.correlation?.toFixed(4)}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Mean</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.mean?.toFixed(4)}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Median</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.median?.toFixed(4)}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">95% CI (Median)</Text>
              <Text fontSize="1.1rem" fontWeight="bold" color="#36454F">
                {statistics.medianCI?.lower !== null && statistics.medianCI?.upper !== null
                  ? `${statistics.medianCI.lower.toFixed(4)} - ${statistics.medianCI.upper.toFixed(4)}`
                  : 'N/A'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="0.9rem" color="#666" fontWeight="bold">Std Deviation</Text>
              <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                {statistics.stdDev?.toFixed(4)}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

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

  // display satellite if showing a site
  const mapLayer = useMemo(() => {
    if (selectedSite) {
      return 'Satellite';
    } else {
      return 'OpenStreetMap';
    }
  }, [selectedSite]);

  return (
    <MapContentLayout
      map={
        <SiteMap sites={filteredSites} hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} mapLayer={mapLayer} />
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
                <>
                  <Text fontSize="1.2rem">
                    This list of <Text as="strong">{formatNumber(filteredCount, 0)}</Text> sites covers <Text as="strong">{formatNumber(filteredArea, 0)}</Text> hectares.
                  </Text>
                  <Text fontSize="1.2rem">
                    They comprise <Text as="strong">{formatNumber(filteredBaselineHUs, 0)}</Text> baseline and <Text as="strong">{formatNumber(filteredCreatedHUs, 0)}</Text> improvement habitat units (Total HU Gain <Text as="strong">{formatNumber(filteredHUGain, 0)}</Text>).
                  </Text>
                </>
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
                title: "BGS Site Use Chart",
                content: ({ sortedItems }) => {
                  return <SitesAreaCompositionChart sites={sortedItems} />;
                }
              },
              {
                title: "BGS Size Distribution Chart",
                content: ({ sortedItems }) => <SiteSizeDistributionChart sites={sortedItems} />
              },
              {
                title: "HU Gain per BGS Scattergram",
                content: ({ sortedItems }) => <HUGainVsBaselineScatterChart sites={sortedItems} />
              },
              {
                title: "HU Gain per Hectare Scattergram",
                content: ({ sortedItems }) => <HUGainPerHectareScatterChart sites={sortedItems} />
              },
              {
                title: "IMD Decile chart",
                content: ({ sortedItems }) => <IMDSiteDecileChart sites={sortedItems} />
              }
            ]}
          />
        </ContentStack>
      }
    />
  )
}
