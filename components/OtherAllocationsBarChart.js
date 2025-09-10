import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Text, LabelList } from 'recharts';
import { formatNumber } from '../lib/format';

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

export const OtherAllocationsBarChart = ({ data, color = '#8884d8' }) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Dynamically calculate height based on the number of data items
  const chartHeight = Math.max(300, data.length * 35);

  return (
    <div style={{ width: '100%', height: chartHeight }}>
      <h4 style={{ textAlign: 'center', fontSize: '1.2rem', color: '#000' }}>Habitats less than 1%</h4>
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 60, left: 100, bottom: 20 }}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={200} tick={<CustomizedYAxisTick />} interval={0} />
          <Tooltip 
            formatter={(value, name, props) => {
              const unit = props.payload.module === 'area' ? 'ha' : 'km';
              return `${formatNumber(props.payload.value, 2)} ${unit}`;
            }} 
            labelStyle={{ color: '#262626ff' }} itemStyle={{ color: '#000' }} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}/>
          <Legend />
          <Bar dataKey="percentage" fill={color} name="Size %">
            <LabelList dataKey="percentage" position="right" formatter={(value) => `${formatNumber(value, 2)}%`} style={{ fill: '#36454F', fontSize: '0.8rem', fontWeight: 'bold' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};