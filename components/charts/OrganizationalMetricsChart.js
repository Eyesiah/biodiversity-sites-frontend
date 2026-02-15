'use client'

import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Box, Text, Heading } from '@chakra-ui/react';
import { Tabs } from '@/components/styles/Tabs';
import { formatNumber, normalizeBodyName } from '@/lib/format';
import { toTitleCase } from '@/lib/utils';

// Constants for chart configuration
const CHART_CONFIG = {
  HEIGHT: 700,
  OUTER_RADIUS_PERCENTAGE: 85
};

// Color palette for the top entities (25 distinct colors)
const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Teal
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#8884d8', // Purple
  '#82ca9d', // Green
  '#ffc658', // Gold
  '#d0ed57', // Lime
  '#a4de6c', // Light Green
  '#8dd1e1', // Sky Blue
  '#ff6b9d', // Pink
  '#c084fc', // Lavender
  '#fb923c', // Coral
  '#14b8a6', // Cyan
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#10b981', // Emerald
  '#3b82f6', // Royal Blue
  '#f97316', // Deep Orange
  '#8b5cf6', // Violet
  '#06b6d4', // Light Blue
  '#84cc16', // Lime Green
  '#eab308', // Yellow Green
  '#ec4899', // Hot Pink
  '#6366f1'  // Indigo
];

const OTHER_COLOR = '#889095'; // Neutral grey for "Other" category

// Metric configurations factory
const createMetrics = (entityName) => ({
  area: {
    label: 'Area',
    unit: 'ha',
    property: 'siteSize',
    tooltipLabel: 'Area',
    description: `Filtered distribution of BGS site area across ${entityName}`
  },
  baselineHUs: {
    label: 'Baseline HUs',
    unit: 'HU',
    property: 'baselineHUs',
    tooltipLabel: 'Baseline HUs',
    description: `Filtered distribution of baseline habitat units across ${entityName}`
  },
  improvementHUs: {
    label: 'Improvement HUs',
    unit: 'HU',
    property: 'improvementHUs',
    tooltipLabel: 'Improvement HUs',
    description: `Filtered distribution of improvement habitat units across ${entityName}`
  },
  huGain: {
    label: 'HU Gain',
    unit: 'HU',
    property: 'huGain',
    tooltipLabel: 'HU Gain',
    description: `Filtered distribution of total HU Gain across ${entityName}`
  },
  allocations: {
    label: 'Allocations',
    unit: 'allocations',
    property: 'allocationsCount',
    tooltipLabel: 'Allocations',
    description: `Filtered distribution of total allocations across ${entityName}`
  }
});

const CustomTooltip = ({ active, payload, metric, metrics }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const config = metrics[metric];
    
    return (
      <Box bg="white" p="10px" border="1px solid #ccc" borderRadius="4px">
        <Text fontWeight="bold" color="black" mb="5px">{data.name}</Text>
        <Text color="#36454F">
          {config.tooltipLabel}: {formatNumber(data.value, metric === 'area' ? 2 : 0)} {config.unit}
        </Text>
        {data.siteCount && (
          <Text color="#36454F">
            Sites: {data.siteCount}
          </Text>
        )}
      </Box>
    );
  }
  return null;
};

/**
 * Generic organizational metrics chart component
 * @param {Object} props
 * @param {Array} props.sites - Array of site objects
 * @param {string} props.entityName - Name of the entity (e.g., "Responsible Bodies", "Local Planning Authorities")
 * @param {string} props.entityAbbr - Abbreviation for the entity (e.g., "RBs", "LPAs")
 * @param {string} props.entityProperty - Property name to extract from site (e.g., "lpaName", "ncaName")
 * @param {Function} props.extractEntityValue - Function to extract entity value from site 
 * @param {number} props.totalEntitiesInUK - Total number of entities in UK (e.g., 309 for LPAs)
 */
export const OrganizationalMetricsChart = ({ 
  sites, 
  entityName, 
  entityAbbr, 
  entityProperty,
  extractEntityValue,  
  totalEntitiesInUK 
}) => {
  const [selectedMetric, setSelectedMetric] = useState('area');
  
  const metrics = useMemo(() => createMetrics(entityName), [entityName]);

  const { chartData, total, totalEntities, entitiesWithSites, entitiesWithAllocations } = useMemo(() => {
    if (!sites || sites.length === 0) return { chartData: [], total: 0, totalEntities: 0, entitiesWithSites: 0, entitiesWithAllocations: 0 };

    const config = metrics[selectedMetric];
    
    // Aggregate metric and site count by entity
    const entityMetricMap = new Map();
    const entitySiteCountMap = new Map();
    const entitiesWithAllocationsSet = new Set();

    sites.forEach(site => {
      // Calculate improvement HUs as createdHUs + enhancedHUs
      let siteValue;
      if (selectedMetric === 'improvementHUs') {
        siteValue = (site.createdHUs || 0) + (site.enhancedHUs || 0);
      } else {
        siteValue = site[config.property] || 0;
      }
      
      // Extract entity value using custom function or property
      const entityValue = extractEntityValue 
        ? extractEntityValue(site)
        : (site[entityProperty] || 'Unknown');
      
      const normalizedName = normalizeBodyName(entityValue);
      entityMetricMap.set(normalizedName, (entityMetricMap.get(normalizedName) || 0) + siteValue);
      entitySiteCountMap.set(normalizedName, (entitySiteCountMap.get(normalizedName) || 0) + 1);
      
      // Track entities with allocations
      if (site.allocationsCount && site.allocationsCount > 0) {
        entitiesWithAllocationsSet.add(normalizedName);
      }
    });

    // Calculate statistics
    const total = Array.from(entityMetricMap.values()).reduce((sum, value) => sum + value, 0);
    const entitiesWithSites = entityMetricMap.size;
    const entitiesWithAllocations = entitiesWithAllocationsSet.size;

    // Convert to array and calculate percentages
    const allEntities = Array.from(entityMetricMap.entries())
      .map(([name, value]) => ({
        name: toTitleCase(name),
        value,
        siteCount: entitySiteCountMap.get(name),
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const totalEntities = allEntities.length;

    // Separate entities: >1.5% get individual slices, ≤1.5% get aggregated
    const significantEntities = allEntities.filter(entity => entity.percentage > 1.5);
    const minorEntities = allEntities.filter(entity => entity.percentage <= 1.5);

    // Build chart data
    let chartData;
    if (minorEntities.length === 0) {
      // All entities are >1.5%, show them all
      chartData = significantEntities;
    } else {
      // Aggregate minor entities into a single "≤1.5%" slice
      const minorTotal = minorEntities.reduce((sum, entity) => sum + entity.value, 0);
      const minorTotalSites = minorEntities.reduce((sum, entity) => sum + entity.siteCount, 0);
      const minorPercentage = total > 0 ? (minorTotal / total) * 100 : 0;

      chartData = [
        ...significantEntities,
        {
          name: `≤1.5% share (${minorEntities.length} ${entityAbbr})`,
          value: minorTotal,
          siteCount: minorTotalSites,
          percentage: minorPercentage,
          isOther: true
        }
      ];
    }

    return { chartData, total, totalEntities, entitiesWithSites, entitiesWithAllocations };
  }, [sites, selectedMetric, metrics, entityProperty, extractEntityValue, entityAbbr]);

  if (!chartData || chartData.length === 0) {
    return <Text>No {entityName} data available to display.</Text>;
  }

  const config = metrics[selectedMetric];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const labelText = `${(percent * 100).toFixed(1)}%`;

    if (percent < 0.04) {
      const radius = outerRadius + 25;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text 
          x={x} 
          y={y} 
          fill="#333" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          style={{ fontSize: '12px' }}
        >
          {labelText}
        </text>
      );
    }

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontWeight: 'bold', fontSize: '14px' }}
      >
        {labelText}
      </text>
    );
  };

  const renderChartContent = (metric) => {
    const config = metrics[metric];
    
    // Calculate chart data for the selected metric
    if (!sites || sites.length === 0) {
      return <Text>No data available.</Text>;
    }

    // Aggregate metric and site count by entity
    const entityMetricMap = new Map();
    const entitySiteCountMap = new Map();
    const entitiesWithAllocationsSet = new Set();

    sites.forEach(site => {
      // Calculate improvement HUs as createdHUs + enhancedHUs
      let siteValue;
      if (metric === 'improvementHUs') {
        siteValue = (site.createdHUs || 0) + (site.enhancedHUs || 0);
      } else {
        siteValue = site[config.property] || 0;
      }
      
      // Extract entity value using custom function or property
      const entityValue = extractEntityValue 
        ? extractEntityValue(site)
        : (site[entityProperty] || 'Unknown');
      
      const normalizedName = normalizeBodyName(entityValue);
      entityMetricMap.set(normalizedName, (entityMetricMap.get(normalizedName) || 0) + siteValue);
      entitySiteCountMap.set(normalizedName, (entitySiteCountMap.get(normalizedName) || 0) + 1);
      
      // Track entities with allocations
      if (site.allocationsCount && site.allocationsCount > 0) {
        entitiesWithAllocationsSet.add(normalizedName);
      }
    });

    // Calculate statistics
    const metricTotal = Array.from(entityMetricMap.values()).reduce((sum, value) => sum + value, 0);
    const metricEntitiesWithSites = entityMetricMap.size;
    const metricEntitiesWithAllocations = entitiesWithAllocationsSet.size;

    // Convert to array and calculate percentages
    const allEntities = Array.from(entityMetricMap.entries())
      .map(([name, value]) => ({
        name: toTitleCase(name),
        value,
        siteCount: entitySiteCountMap.get(name),
        percentage: metricTotal > 0 ? (value / metricTotal) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const metricTotalEntities = allEntities.length;

    // Separate entities: >1.5% get individual slices, ≤1.5% get aggregated
    const significantEntities = allEntities.filter(entity => entity.percentage > 1.5);
    const minorEntities = allEntities.filter(entity => entity.percentage <= 1.5);

    // Build chart data
    let metricChartData;
    if (minorEntities.length === 0) {
      // All entities are >1.5%, show them all
      metricChartData = significantEntities;
    } else {
      // Aggregate minor entities into a single "≤1.5%" slice
      const minorTotal = minorEntities.reduce((sum, entity) => sum + entity.value, 0);
      const minorTotalSites = minorEntities.reduce((sum, entity) => sum + entity.siteCount, 0);
      const minorPercentage = metricTotal > 0 ? (minorTotal / metricTotal) * 100 : 0;

      metricChartData = [
        ...significantEntities,
        {
          name: `≤1.5% share (${minorEntities.length} ${entityAbbr})`,
          value: minorTotal,
          siteCount: minorTotalSites,
          percentage: minorPercentage,
          isOther: true
        }
      ];
    }

    return (
      <Box>
        <Heading as="h3" size="md" textAlign="center" mb={4}>
          {entityName} ({entityAbbr}) by {config.label}
        </Heading>
        
        <Text textAlign="center" mb={2} fontSize="md" color="gray.600">
          {config.description}
        </Text>
        
        {/* Coverage Statistics */}
        <Text textAlign="center" mb={2} fontSize="md" fontWeight="semibold" color="gray.700">
          {totalEntitiesInUK ? (
            <>Coverage: {metricEntitiesWithSites} of {totalEntitiesInUK} {entityAbbr} have BGS sites | {metricEntitiesWithAllocations} of {totalEntitiesInUK} {entityAbbr} have allocations</>
          ) : (
            <>Coverage: {metricEntitiesWithSites} {entityAbbr} have {sites.length} BGS sites | {metricEntitiesWithAllocations} {entityAbbr} have allocations</>
          )}
        </Text>
        
        <Text textAlign="center" mb={4} fontSize="md" color="gray.600">
          Total {config.label}: {formatNumber(metricTotal, metric === 'area' ? 0 : 0)} {config.unit} • Total {entityAbbr} in filtered data: {metricTotalEntities}
        </Text>
        
        <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
          <PieChart>
            <Pie
              data={metricChartData}
              cx="50%"
              cy="50%"
              labelLine={(props) => props.percent < 0.04}
              label={renderCustomizedLabel}
              outerRadius={`${CHART_CONFIG.OUTER_RADIUS_PERCENTAGE}%`}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {metricChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isOther ? OTHER_COLOR : COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip metric={metric} metrics={metrics} />} />
            <Legend 
              verticalAlign="bottom" 
              align="center" 
              wrapperStyle={{ paddingTop: '20px', maxHeight: 150, overflowY: 'auto' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  return (
    <Box bg="bg" p="1rem" pt="0">
      <Tabs.Root value={selectedMetric} onValueChange={(details) => setSelectedMetric(details.value)}>
        <Tabs.List>
          <Tabs.Trigger value="area">Area</Tabs.Trigger>
          <Tabs.Trigger value="baselineHUs">Baseline HUs</Tabs.Trigger>
          <Tabs.Trigger value="improvementHUs">Improvement HUs</Tabs.Trigger>
          <Tabs.Trigger value="huGain">HU Gain</Tabs.Trigger>
          <Tabs.Trigger value="allocations">Allocations</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="area">
          {renderChartContent('area')}
        </Tabs.Content>

        <Tabs.Content value="baselineHUs">
          {renderChartContent('baselineHUs')}
        </Tabs.Content>

        <Tabs.Content value="improvementHUs">
          {renderChartContent('improvementHUs')}
        </Tabs.Content>

        <Tabs.Content value="huGain">
          {renderChartContent('huGain')}
        </Tabs.Content>

        <Tabs.Content value="allocations">
          {renderChartContent('allocations')}
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};
