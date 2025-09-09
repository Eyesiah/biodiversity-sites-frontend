import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Text, LabelList } from 'recharts';
import { formatNumber } from '../lib/format';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let unit = 'ha';
    if (data.module === 'mixed') {
      unit = 'mixed sizes';
    } else if (data.module !== 'area') {
      unit = 'km';
    }
    return (
      <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label" style={{ color: '#000' }}>{`${data.name} : ${formatNumber(data.value, 2)} ${unit}`}</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const labelText = `${(percent * 100).toFixed(2)}%`;
  if (percent < 0.05) {
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#333" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {labelText}
      </text>
    );
  }
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#333" textAnchor="middle" dominantBaseline="central" style={{ fontWeight: 'bold' }}>
      {labelText}
    </text>
  );
};

const CustomizedYAxisTick = (props) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <Text x={0} y={0} dy={0} width={200} textAnchor="end" verticalAnchor="middle" fill="#594c4cff" fontSize="0.9rem">
        {payload.value}
      </Text>
    </g>
  );
};

const OtherImprovementsBarChart = ({ data, color = '#8884d8' }) => {
  if (!data || data.length === 0) return null;
  const chartHeight = Math.max(400, data.length * 40);

  return (
    <div style={{ width: '100%', height: chartHeight }}>
      <h4 style={{ textAlign: 'center', fontSize: '1.4rem', color: '#000' }}>Other improvements Breakdown</h4>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ top: 5, right: 60, left: 100, bottom: 20 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={200} tick={<CustomizedYAxisTick />} interval={0} />
          <Tooltip
            formatter={(value, name, props) => {
              if (props.payload.name === 'Other habitats < 0.30%') {
                const unit = 'mixed ha/km';
              return `${formatNumber(props.payload.value, 2)} ${unit}`;
              }
              const unit = props.payload.module === 'area' ? 'ha' : 'km';
              return `${formatNumber(props.payload.value, 2)} ${unit}`;
            }}
            labelStyle={{ color: '#262626ff' }} itemStyle={{ color: '#000' }} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
          />
          <Legend />
          <Bar dataKey="percentage" fill={color} name="Size">
            <LabelList dataKey="percentage" position="right" formatter={(value) => `${formatNumber(value, 2)}%`} style={{ fill: '#36454F', fontSize: '0.8rem', fontWeight: 'bold' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ImprovementPieChart = ({ data }) => {
  const { chartData, otherData } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], otherData: [] };
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    const mainChartData = [];
    const otherChartData = [];
    let otherValue = 0;

    data.forEach(entry => {
      if ((entry.value / total) < 0.03) {
        otherValue += entry.value;
        otherChartData.push(entry);
      } else {
        mainChartData.push(entry);
      }
    });

    if (otherValue > 0) {
      mainChartData.push({ name: 'Other improvements', value: otherValue, module: 'mixed' });
    }

    const finalOtherData = [];
    let verySmallHabitatsValue = 0;
    let verySmallHabitatsPercentage = 0;

    otherChartData.forEach(entry => {
      const percentage = total > 0 ? (entry.value / total) * 100 : 0;
      if (percentage < 0.30) {
        verySmallHabitatsValue += entry.value;
        verySmallHabitatsPercentage += percentage;
      } else {
        finalOtherData.push({ ...entry, percentage });
      }
    });

    if (verySmallHabitatsValue > 0) {
      finalOtherData.push({ name: 'Other habitats < 0.30%', value: verySmallHabitatsValue, percentage: verySmallHabitatsPercentage, module: 'mixed' });
    }

    return { chartData: mainChartData, otherData: finalOtherData.sort((a, b) => b.value - a.value) };
  }, [data]);

  const otherImprovementsColor = useMemo(() => {
    const otherIndex = chartData.findIndex(entry => entry.name === 'Other improvements');
    return otherIndex !== -1 ? '#aaaaaa' : '#8884d8';
  }, [chartData]);

  if (!chartData || chartData.length === 0) return <p>No improvement habitat data to display.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', border: '1px solid #bdc3c7', borderRadius: '8px', padding: '1rem', backgroundColor: '#fff' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ textAlign: 'center', color: '#000', fontSize: '2rem' }}>Improvement habitats by percentage & size</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
            <Pie data={chartData} cx="50%" cy="50%" labelLine={(props) => props.percent < 0.05} label={renderCustomizedLabel} outerRadius="95%" fill="#8884d8" dataKey="value" nameKey="name">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Other improvements' ? '#aaaaaa' : COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {otherData.length > 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <OtherImprovementsBarChart data={otherData} color={otherImprovementsColor} />
        </div>
      )}
    </div>
  );
};