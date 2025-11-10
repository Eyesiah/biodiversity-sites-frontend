import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList } from 'recharts';
import { formatNumber } from '@/lib/format';
import { Box, Heading, Text } from '@chakra-ui/react';
import { AutoResizeYAxisLabel } from './AutoResizeYAxisLabel';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let unit = 'ha'; // Default to ha
    if (data.module === 'mixed') {
      unit = 'ha';
    } else if (data.module !== 'area' && data.module !== 'areas') {
      unit = 'km';
    }
    return (
      <Box bg="white" p="10px" border="1px solid #ccc">
        <Text color="black">{`${data.name} : ${formatNumber(data.value, 2)} ${unit}`}</Text>
      </Box>
    );
  }
  return null;
};

export default function FilteredHabitatPieChart ({ habitats, module, name }) {
  const { chartData, otherData } = useMemo(() => {
    let acc = {};
    habitats.forEach(habitat => {
      if (habitat.type && habitat.size > 0) {
        acc[habitat.type] = (acc[habitat.type] || 0) + habitat.size;
      }
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
      mainChartData.push({ name: 'Other', value: otherValue, module: module });
    }

    const otherDataWithPercentages = otherChartData
      .map(entry => ({ ...entry, percentage: (entry.value / total) * 100 }))
      .sort((a, b) => b.value - a.value);

    return { chartData: mainChartData.sort((a, b) => b.value - a.value), otherData: otherDataWithPercentages };

  }, [habitats, module]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];
  const OTHER_COLOR = '#889095ff'; // A neutral grey for the 'Other' category

  if (chartData.length === 0) {
    return <Text>No habitat data to display for the current selection.</Text>;
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
    <Box display="flex" flexDirection="row" width="100%" marginBottom="5">
      <Box flex="3" display="flex" flexDirection="column" height="500px" >
        <Heading as="h3" size="md" textAlign="center" mb={4}>
          {name} Habitats by {module === 'areas' ? 'Size' : 'Length'}
        </Heading>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
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
        <Box flex="2" display="flex" height="500px" >
          <Box width='100%' height='100%'>
            <Heading as="h4" textAlign="center" sx={{ fontSize: '1.2rem', color: '#000' }}>Habitats less than 1%</Heading>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={otherData}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={250} tick={<AutoResizeYAxisLabel width={250} fontSize='12px' />} interval={0} />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const unit = module === 'area' || module === 'areas' ? 'ha' : 'km';
                    return `${formatNumber(props.payload.value, 2)} ${unit}`;
                  }} 
                  labelStyle={{ color: '#262626ff' }} itemStyle={{ color: '#000' }} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}/>
                <Legend />
                <Bar dataKey="percentage" fill={OTHER_COLOR} name="Size %">
                  <LabelList dataKey="percentage" position="right" formatter={(value) => `${formatNumber(value, 2)}%`} style={{ fill: '#36454F', fontSize: '0.8rem', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
    </Box>
  );
};


export function FilteredAllocationsPieChart ({ allocs, module, name }) {
  const flattenedAllocHabitats = useMemo(() => {
    return allocs.reduce((acc, item) => {
      acc.push(...item.habitats[module]);
      return acc;
    }, []);
  }, [allocs, module]);

  return <FilteredHabitatPieChart habitats={flattenedAllocHabitats} module={module} name={name}/>
}

export function FilteredBaselinePieChart ({ allHabitats, module, name, sizeParam }) {
  const mappedHabitats = useMemo(() => {
    return allHabitats.filter(h => h.module == module).map(h =>  {return {type: h.habitat, size: h[sizeParam]}});
  }, [allHabitats, module, sizeParam]);

  return <FilteredHabitatPieChart habitats={mappedHabitats} module={module} name={name}/>
}
