import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../lib/format';
import { OtherAllocationsBarChart } from './OtherAllocationsBarChart';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const unit = data.module === 'area' ? 'ha' : 'km';
    return (
      <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label" style={{ color: '#000' }}>{`${data.name} : ${formatNumber(data.value, 2)} ${unit}`}</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const labelText = `${(percent * 100).toFixed(2)}%`;

  // For small slices, render the label outside the pie with a line.
  if (percent < 0.05) {
    const radius = outerRadius + 25; // Position label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#333" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {labelText}
      </text>
    );
  }

  // For larger slices, render the label inside.
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5; // Center label inside the slice
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#333" textAnchor="middle" dominantBaseline="central" style={{ fontWeight: 'bold' }}>
      {labelText}
    </text>
  );
};

export const AllocationPieChart = ({ data, disableAggregation = false, title = 'Area habitats allocated - by size', showBreakdown = true }) => {
  const { chartData, otherData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], otherData: [] };
    }
    if (disableAggregation) {
      return { chartData: data, otherData: [] };
    }

    const total = data.reduce((sum, entry) => sum + entry.value, 0);    
    const mainChartData = [];
    const otherChartData = [];
    let otherValue = 0;

    data.forEach(entry => {
      const percentage = entry.value / total;
      if (percentage < 0.01        
      ) {
        otherValue += entry.value;
        otherChartData.push(entry);
      } else {
        mainChartData.push(entry);
      }
    });

    if (otherValue > 0) {
      mainChartData.push({ name: 'Other allocations', value: otherValue, module: 'mixed' });
    }

    const otherDataWithTotalPercentage = otherChartData.map(entry => ({ ...entry, percentage: total > 0 ? (entry.value / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
    return { chartData: mainChartData, otherData: otherDataWithTotalPercentage };
  }, [data, disableAggregation]);

  const otherAllocationsColor = useMemo(() => {
    const otherIndex = chartData.findIndex(entry => entry.name === 'Other allocations');
    if (otherIndex !== -1) {
      // Check if the 'Other allocations' segment exists and return its specific color
      return '#997a71ff';
    }
    return '#8884d8'; // Fallback color
  }, [chartData]);

  if (!chartData || chartData.length === 0) {
    return <p>No allocation habitat data to display.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', border: '1px solid #bdc3c7', borderRadius: '8px', padding: '1rem', backgroundColor: '#fff' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ textAlign: 'center', color: '#000', fontSize: '2rem' }}>{title}</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={(props) => props.percent < 0.05}
              label={renderCustomizedLabel}
              outerRadius="95%"
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.name === 'Other allocations' ? '#aaaaaa' : COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {showBreakdown && otherData.length > 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <OtherAllocationsBarChart data={otherData} color={otherAllocationsColor} />
        </div>
      )}
    </div>
  );
};