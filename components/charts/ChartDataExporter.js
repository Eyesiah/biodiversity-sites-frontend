'use client'

import { useState } from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import Select from 'react-select';
import Papa from 'papaparse';
import { toaster } from '@/components/ui/toaster';

const ChartDataExporter = ({ stats, chartConfigs }) => {
  const [selectedCharts, setSelectedCharts] = useState([]);

  // Create options for the multi-select dropdown
  const chartOptions = chartConfigs.map((config, index) => ({
    value: index,
    label: config.title
  }));

  const handleExport = () => {
    if (selectedCharts.length === 0) {
      toaster.create({
        title: 'No charts selected',
        description: 'Please select at least one chart to export.',
        type: 'warning',
      });
      return;
    }

    selectedCharts.forEach(chartIndex => {
      const config = chartConfigs[chartIndex];
      const filteredData = stats.filter(stat =>
        config.dataKeys.some(key => stat[key] != null && stat[key] !== 0)
      );

      // Prepare CSV data for this chart - Date as first column, metrics as other columns
      const csvData = filteredData.map(stat => {
        const row = {
          Date: new Date(stat.timestamp).toLocaleDateString('en-GB')
        };

        config.dataKeys.forEach((key, keyIndex) => {
          const value = stat[key];
          row[config.names[keyIndex]] = value != null ? Number(value).toFixed(4) : '';
        });

        return row;
      });

      // Sort by date
      csvData.sort((a, b) => {
        return new Date(a.Date.split('/').reverse().join('-')) - new Date(b.Date.split('/').reverse().join('-'));
      });

      // Generate CSV for this chart
      const csv = Papa.unparse(csvData);

      // Create filename from chart title (sanitize for filename)
      const filename = config.title
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
    });

    toaster.create({
      title: 'Export successful',
      description: `Downloaded ${selectedCharts.length} CSV file${selectedCharts.length > 1 ? 's' : ''}.`,
      type: 'success',
    });
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: '#E2E8F0',
      '&:hover': {
        borderColor: '#CBD5E0',
      },
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#EDF2F7',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#2D3748',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#718096',
      '&:hover': {
        backgroundColor: '#E2E8F0',
        color: '#2D3748',
      },
    }),
  };

  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      borderColor="gray.200"
      bg="gray.50"
      mb={6}
    >
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Export Chart Data as CSV
        </Text>
        <Text fontSize="sm" color="gray.600">
          Select one or more charts to export their data as a CSV file. The exported file will contain all time series data for your selected charts.
        </Text>
        <Box>
          <Text mb={2} fontWeight="medium">Select Charts:</Text>
          <Select
            isMulti
            options={chartOptions}
            value={selectedCharts.map(index => chartOptions[index])}
            onChange={(selectedOptions) => {
              setSelectedCharts(selectedOptions ? selectedOptions.map(option => option.value) : []);
            }}
            placeholder="Choose charts to export..."
            styles={customSelectStyles}
          />
        </Box>
        <Button
          colorScheme="blue"
          onClick={handleExport}
          isDisabled={selectedCharts.length === 0}
          alignSelf="flex-start"
        >
          Export CSV ({selectedCharts.length} chart{selectedCharts.length !== 1 ? 's' : ''} selected)
        </Button>
      </VStack>
    </Box>
  );
};

export default ChartDataExporter;
