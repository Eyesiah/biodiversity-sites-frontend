import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../lib/format';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label">{`${data.name} : ${formatNumber(data.value, 2)} ha`}</p>
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
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontWeight: 'bold' }}>
      {labelText}
    </text>
  );
};

export const AllocationPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>No allocation habitat data to display.</p>;
  }
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const chartData = [];
  let otherValue = 0;

  data.forEach(entry => {
    if ((entry.value / total) < 0.03) {
      otherValue += entry.value;
    } else {
      chartData.push(entry);
    }
  });

  if (otherValue > 0) {
    chartData.push({ name: 'Other allocations', value: otherValue });
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={(props) => props.percent < 0.05} // Only show line for external labels
          label={renderCustomizedLabel}
          outerRadius="70%"
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          align="center" 
          wrapperStyle={{
            paddingTop: '20px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};