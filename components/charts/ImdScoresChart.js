'use client'

import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts';
import { Box, Text } from '@chakra-ui/react';

export const ImdScoresChart = ({ site }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processData = (currentSite) => {
      if (!currentSite?.allocations || !currentSite?.lsoa) {
        return [];
      }
      return currentSite.allocations
        .map((alloc, index) => ({
          name: alloc.planningReference || `Allocation ${index + 1}`,
          'Allocation IMD Score': alloc.lsoa?.IMDScore || 'N/A',
          'Site IMD Score': currentSite.lsoa.IMDScore || 'N/A',
        }))
        .filter(item => typeof item['Allocation IMD Score'] === 'number')
        .sort((a, b) => b['Allocation IMD Score'] - a['Allocation IMD Score']);
    };

    setChartData(processData(site)); 
  }, [site]); // Depend only on the initial site prop.

  if (isLoading) return <Text>Loading chart data...</Text>;
  if (error) return <Text color="red">Error: {error}</Text>;
  if (!chartData) return <Text>Initializing chart...</Text>; // Initial state before useEffect runs

  if (chartData.length === 0 && site.allocations?.length > 0) {
    return <Text>No allocation IMD data available to display.</Text>;
  }

  const formatYAxis = (tickItem) => {
    return Math.round(tickItem);
  };

  return (
    <Box bg="ivory" p="1rem">
      <ResponsiveContainer width="100%" height={650}>
        <ComposedChart
          data={chartData}
          margin={{
            top: 20, right: 20, bottom: 40, left: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            type="category"
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            interval={'preserveStartEnd'}
            tick={{ fontSize: 12 }}>
            <Label value="Development Allocations" offset={-60} position="insideBottom" style={{ fontWeight: 'bold', textAnchor: 'middle' }} />
          </XAxis>
          <YAxis domain={[0, 'dataMax + 30']} tickFormatter={formatYAxis}>
            <Label value="IMD Score (A higher score = a more deprived LSOA)" angle={-90} position="insideCenter" dx={-40} style={{ fontWeight: 'bold', textAnchor: 'middle' }} />
          </YAxis>
          <Tooltip />
          <Legend />
          <Bar dataKey="Allocation IMD Score" fill="#82ca9d" />
          <Line type="monotone" dataKey="Site IMD Score" stroke="#ff7300" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};
