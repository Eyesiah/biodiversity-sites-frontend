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
  ResponsiveContainer
} from 'recharts';

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
          'Allocation IMD Score': alloc.lsoa?.IMDScore,
          'Site IMD Score': currentSite.lsoa.IMDScore,
        }))
        .filter(item => typeof item['Allocation IMD Score'] === 'number')
        .sort((a, b) => b['Allocation IMD Score'] - a['Allocation IMD Score']);
    };

    const loadChartData = async () => {
      // Check if the detailed allocation data (with LSOA) is already present.
      const allocationsHaveLsoa = site.allocations?.every(a => a.lsoa && typeof a.lsoa.IMDScore === 'number');

      if (site.allocations?.length > 0 && !allocationsHaveLsoa) {
        // If not, fetch the full site details.
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/sites/${site.referenceNumber}`);
          if (!res.ok) throw new Error(`Failed to fetch site data: ${res.status}`);
          const fullSite = await res.json();
          setChartData(processData(fullSite));
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If data is already present, just process it.
        setChartData(processData(site));
      }
    };

    loadChartData();
  }, [site]); // Depend only on the initial site prop.

  if (isLoading) return <p>Loading chart data...</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!chartData) return <p>Initializing chart...</p>; // Initial state before useEffect runs

  if (chartData.length === 0 && site.allocations?.length > 0) {
    return <p>No allocation IMD data available to display.</p>;
  }

  const formatYAxis = (tickItem) => {
    return Math.round(tickItem);
  };

  return (
    <div style={{ backgroundColor: 'ivory', padding: '1rem' }}>
      <ResponsiveContainer width="100%" height={650}>
        <ComposedChart
          data={chartData}
          margin={{
            top: 20, right: 20, bottom: 20, left: 60,
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
            tick={{ fontSize: 12 }}
          />
          <YAxis label={{ value: 'IMD Score (A higher score = a more deprived LSOA)', angle: -90, position: 'insideCenter', dx: -20 }} domain={[0, 'dataMax + 30']} tickFormatter={formatYAxis} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Allocation IMD Score" fill="#82ca9d" />
          <Line type="monotone" dataKey="Site IMD Score" stroke="#ff7300" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};