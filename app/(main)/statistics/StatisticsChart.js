'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Heading, Box, Text } from "@chakra-ui/react";
import Button from '@/components/styles/Button';
import Papa from 'papaparse';
import { GrDocumentCsv } from "react-icons/gr";

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

const exportChartDataToCSV = (stats, dataKeys, names, title) => {
  const filteredData = stats.filter(stat =>
    dataKeys.some(key => stat[key] != null && stat[key] !== 0)
  );

  // Prepare CSV data - Date as first column, metrics as other columns
  const csvData = filteredData.map(stat => {
    const row = {
      Date: new Date(stat.timestamp).toLocaleDateString('en-GB')
    };

    dataKeys.forEach((key, keyIndex) => {
      const value = stat[key];
      row[names[keyIndex]] = value != null ? Number(value).toFixed(4) : '';
    });

    return row;
  });

  // Sort by date
  csvData.sort((a, b) => {
    return new Date(a.Date.split('/').reverse().join('-')) - new Date(b.Date.split('/').reverse().join('-'));
  });

  // Generate CSV
  const csv = Papa.unparse(csvData);

  // Create filename from chart title (sanitize for filename)
  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.csv';

  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
      <Box>
        <Box display="flex" justifyContent="center" alignItems="center" mb={4}>
          <Heading as="h2" size="lg" mr={4}>{title}</Heading>
        </Box>
        <Text textAlign="center" height="400px">No data available for this chart.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="center" alignItems="center" mb={4}>
        <Heading as="h2" size="lg" mr={4}>{title}</Heading>
        <Button padding="0.1rem 0.1rem" onClick={() => exportChartDataToCSV(stats, dataKeys, names, title)}>
          <GrDocumentCsv />
        </Button>
      </Box>
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
    </Box>
  );
};
