'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Heading } from "@chakra-ui/react"

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedDate = new Date(label).toLocaleDateString('en-GB');
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label">{`Date : ${formattedDate}`}</p>
        {payload.map(pld => (
          <p key={pld.dataKey} style={{ color: pld.color }}>{`${pld.name} : ${pld.value.toLocaleString()}`}</p>
        ))}
      </div>
    );
  }

  return null;
};


export const StatsChart = ({stats, dataKeys, strokeColors, names, title}) => {
  const filteredData = stats.filter(stat =>
    dataKeys.some(key => stat[key] != null && stat[key] !== 0)
  );

  // Replace 0 with null for better line chart rendering (to create gaps)
  const chartData = filteredData.map(stat => {
    const newStat = { ...stat };
    dataKeys.forEach(key => {
      if (newStat[key] === 0) {
        newStat[key] = null;
      }
    });
    return newStat;
  });

  if (chartData.length === 0) {
    return (
      <div>
        <Heading as="h2" size="lg" textAlign="center">{title}</Heading>
        <p style={{ textAlign: 'center', height: '400px' }}>No data available for this chart.</p>
      </div>
    );
  }

  return (
    <div>
      <Heading as="h2" size="lg" textAlign="center">{title}</Heading>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('en-GB')}
          />
          <YAxis tickFormatter={(value) => value.toLocaleString()} />
          <Tooltip isAnimationActive={false} content={<CustomTooltip />} />
          <Legend />
          {dataKeys.map((dataKey, i) => (
            <Line connectNulls key={dataKey} type="monotone" dataKey={dataKey} stroke={strokeColors[i]} name={names[i]} activeDot={{ r: 8 }} strokeWidth={3} dot={{ r: 0 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
