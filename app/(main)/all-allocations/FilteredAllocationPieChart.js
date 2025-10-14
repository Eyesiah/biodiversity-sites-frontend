import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/format';
import { OtherAllocationsBarChart } from '@/components/OtherAllocationsBarChart';
import { Box, Heading } from '@chakra-ui/react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let unit = 'ha'; // Default to ha
    if (data.module === 'mixed') {
      unit = 'ha';
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

export default function FilteredAllocationPieChart ({ allocations, module, name }) {
  const { chartData, otherData } = useMemo(() => {
    let acc = {};
    allocations.forEach(alloc => {
      const moduleHabitats = alloc.habitats ? alloc.habitats[module] : null;
      moduleHabitats?.forEach(habitat => {
        if (habitat.type && habitat.size > 0) {
          acc[habitat.type] = (acc[habitat.type] || 0) + habitat.size;
        }
      });
    });

    const allHabitatData = Object.entries(acc).map(([name, value]) => ({ name, value, module }));
    const total = allHabitatData.reduce((sum, entry) => sum + entry.value, 0);

    if (total === 0) {
      return { chartData: [], otherData: [] };
    }

    const mainChartData = [];
    const otherChartData = [];
    let otherValue = 0;

    allHabitatData.forEach(entry => {
      const percentage = entry.value / total;
      if (percentage < 0.01) {
        otherValue += entry.value;
        otherChartData.push(entry);
      } else {
        mainChartData.push(entry);
      }
    });

    if (otherValue > 0) {
      mainChartData.push({ name: 'Other', value: otherValue, module: 'mixed' });
    }

    const otherDataWithPercentages = otherChartData
      .map(entry => ({ ...entry, percentage: (entry.value / total) * 100 }))
      .sort((a, b) => b.value - a.value);

    return { chartData: mainChartData.sort((a, b) => b.value - a.value), otherData: otherDataWithPercentages };

  }, [allocations, module]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];
  const OTHER_COLOR = '#889095ff'; // A neutral grey for the 'Other' category

  if (chartData.length === 0) {
    return <p>No habitat data to display for the current selection.</p>;
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const labelText = `${(percent * 100).toFixed(2)}%`;

    // For small slices, render the label outside the pie with a line.
    if (percent < 0.04) {
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

  return (
    <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
      <Box flex="2" display="flex" flexDirection="column">
        <Heading as="h3" size="md" textAlign="center" mb={4}>
          {name} Habitats by {module === 'areas' ? 'Size' : 'Length'}
        </Heading>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={(props) => props.percent < 0.04}
              label={renderCustomizedLabel}
              outerRadius="95%"
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.name === 'Other' ? '#889095ff' : COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', bottom: 0, left: 0, right: 0, maxHeight: 100, overflowY: 'auto' }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      {otherData.length > 0 && (
        <Box flex="1" display="flex" alignItems="center" justifyContent="center">
          <OtherAllocationsBarChart data={otherData} color={OTHER_COLOR} />
        </Box>
      )}
    </Box>
  );
};
