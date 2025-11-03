'use client'

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Box, Text, Heading } from '@chakra-ui/react';
import { formatNumber } from '@/lib/format';

// Constants for chart configuration
const CHART_CONFIG = {
  HEIGHT: 500,
  OUTER_RADIUS_PERCENTAGE: 80
};

const UNITS = {
  HECTARES: 'ha'
};

// Individual tree habitat types to exclude
const INDIVIDUAL_TREE_TYPES = ['Urban tree', 'Rural tree'];

// Color scheme for different categories
const COLORS = {
  NON_BASELINE: '#FF9800',     // Orange - Non-baseline land uses
  NET_RETAINED: '#4CAF50',     // Green - Net retained baseline
  IMPROVEMENTS: '#2196F3'      // Blue - Improvement areas
};

// Utility functions
const isNotIndividualTree = (habitat) => !INDIVIDUAL_TREE_TYPES.includes(habitat.type);

const calculateHabitatArea = (sites, habitatPath, filterFn = () => true) => {
  return sites.reduce((sum, site) => {
    const habitats = habitatPath.split('.').reduce((obj, key) => obj?.[key], site) || [];
    const filteredHabitats = habitats.filter(habitat => filterFn(habitat) && isNotIndividualTree(habitat));
    return sum + filteredHabitats.reduce((areaSum, habitat) => areaSum + (habitat.size || 0), 0);
  }, 0);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box bg="white" p="10px" border="1px solid #ccc" borderRadius="4px">
        <Text fontWeight="bold" color="black" mb="5px">{label}</Text>
        {payload.map((entry, index) => (
          <Text key={index} color={entry.color}>
            {`${entry.name}: ${formatNumber(entry.value, 2)} ${UNITS.HECTARES}`}
          </Text>
        ))}
      </Box>
    );
  }
  return null;
};

export const SitesAreaCompositionChart = ({ sites }) => {
  const { chartData, totalBGSSize } = useMemo(() => {
    if (!sites || sites.length === 0) return { chartData: [], totalBGSSize: 0 };

    // Calculate total BGS site areas
    const totalBGSSize = sites.reduce((sum, site) => sum + (site.siteSize || 0), 0);

    // Calculate baseline and improvement areas using utility function
    const totalBaselineAreas = calculateHabitatArea(sites, 'habitats.areas');
    const totalImprovementAreas = calculateHabitatArea(sites, 'improvements.areas');

    // Three pie slices as specified:
    // 1. Total BGS areas minus baseline areas
    const nonBaselineLand = totalBGSSize - totalBaselineAreas;

    // 2. Baseline areas minus improvement areas
    const netRetainedBaseline = totalBaselineAreas - totalImprovementAreas;

    // 3. Improvement areas
    const improvementAreas = totalImprovementAreas;

    // Create pie chart data format (ordered for legend: habitat areas first, Non Habitat-based Land Use last)
    const chartData = [
      { name: 'Net Retained Baseline Habitat', value: netRetainedBaseline, color: COLORS.NET_RETAINED },
      { name: 'Improvement Area Habitat', value: improvementAreas, color: COLORS.IMPROVEMENTS },
      { name: 'Non Habitat-based Land Use', value: nonBaselineLand, color: COLORS.NON_BASELINE }
    ].filter(item => item.value > 0); // Only include items with positive values

    return { chartData, totalBGSSize };
  }, [sites]);

  if (!chartData || chartData.length === 0) {
    return <Text>No area data available to display.</Text>;
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
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
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <Box bg="ivory" p="1rem">
      <Heading as="h3" size="xd" textAlign="center" mb={4}>
        BGS Site Area Use Composition
      </Heading>
      <Text textAlign="center" mb={4} fontSize="md" color="gray.600">
        Composition of total BGS site area across all filtered sites (excluding Individual trees areas)
      </Text>
      <Text textAlign="center" mb={4} fontSize="md" color="gray.600">
        BGS Site Area: {formatNumber(totalBGSSize, 0)} {UNITS.HECTARES}
      </Text>
      <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={`${CHART_CONFIG.OUTER_RADIUS_PERCENTAGE}%`}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" align="center" />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};
