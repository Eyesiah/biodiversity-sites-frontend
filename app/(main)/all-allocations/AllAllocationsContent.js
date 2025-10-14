'use client'

import { useState, useCallback, useMemo } from 'react';
import { formatNumber, calcMedian, calcMean } from '@/lib/format';
import { XMLBuilder } from 'fast-xml-parser';
import { triggerDownload } from '@/lib/utils';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { OtherAllocationsBarChart } from '@/components/OtherAllocationsBarChart';
import { Box, Heading } from '@chakra-ui/react';

import AllAllocationsList from './AllAllocationsList';
import AllocationAnalysis from './AllocationAnalysis';

const FilteredAllocationPieChart = ({allocations, module, name}) => {
  const { chartData, otherData } = useMemo(() => {
    let acc = {};
    allocations.forEach(alloc => {
      const moduleHabitats = alloc.habitats ? alloc.habitats[module] : null;
      moduleHabitats?.forEach(habitat => {
        if (habitat.type) {
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
      if (percentage < 0.03) {
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A230FF', '#FF30A2'];
  const OTHER_COLOR = '#889095ff'; // A neutral grey for the 'Other' category

  if (chartData.length === 0) {
    return <p>No habitat data to display for the current selection.</p>;
  }

  return (
    <Box display="flex" flexDirection="row" width="100%" height="500px">
      <Box flex="1" display="flex" flexDirection="column">
        <Heading as="h3" size="md" textAlign="center" mb={4}>
          {name} Habitats by {module === 'areas' ? 'Size' : 'Length'}
        </Heading>
        <ResponsiveContainer width="100%" height="99%">
          <PieChart margin={{ top: 0, right: 30, left: 30, bottom: 100 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            fill="#8884d8"
            labelLine={false}
          >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Other' ? OTHER_COLOR : COLORS[index % COLORS.length]} />
              ))}
          </Pie>
            <Tooltip formatter={(value, name, props) => `${formatNumber(value, 2)} ${props.payload.module === 'areas' ? 'ha' : 'km'}`} />
          <Legend 
            verticalAlign="bottom" 
            align="center" 
            wrapperStyle={{ bottom: 0, left: 0, right: 0, maxHeight: 100, overflowY: 'auto' }}
            layout="horizontal"
          />
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

const filterPredicate = (alloc, searchTerm) => {
  const lowercasedTerm = searchTerm.toLowerCase();
  const spatialRiskString = alloc.sr ? `${alloc.sr.cat}${alloc.sr.cat !== 'Outside' ? ` (${alloc.sr.from})` : ''}`.toLowerCase() : '';
  return (
    (alloc.srn?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.pr?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.lpa?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.nca?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.pn?.toLowerCase() || '').includes(lowercasedTerm) ||
    spatialRiskString.includes(lowercasedTerm)
  );
}

export default function AllAllocationsContent({ allocations }) {

  const handleExportXML = (items) => {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const xmlDataStr = builder.build({ allocations: { allocation: items } });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'bgs-allocations.xml');
  };

  const handleExportJSON = (items) => {
    const jsonDataStr = JSON.stringify({ allocations: items }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'bgs-allocations.json');
  };

  const calcSummaryData = useCallback((filteredAllocations) => {

    const totalArea = filteredAllocations.reduce((sum, alloc) => sum + (alloc.au || 0), 0);
    const totalHedgerow = filteredAllocations.reduce((sum, alloc) => sum + (alloc.hu || 0), 0);
    const totalWatercourse = filteredAllocations.reduce((sum, alloc) => sum + (alloc.wu || 0), 0);

    const uniquePlanningRefs = new Set(filteredAllocations.map(alloc => alloc.pr)).size;
    const totalUniquePlanningRefs = new Set(allocations.map(alloc => alloc.pr)).size;

    let medianDistance = calcMedian(filteredAllocations, 'd');
    let meanIMD = calcMean(filteredAllocations, 'imd');
    let meanSiteIMD = calcMean(filteredAllocations, 'simd');

    return {
      totalArea,
      totalHedgerow,
      totalWatercourse,
      medianDistance,
      meanIMD,
      meanSiteIMD,
      uniquePlanningRefs,
      totalUniquePlanningRefs,
    };
  }, [allocations]);

  const [summaryData, setSummaryData] = useState(calcSummaryData(allocations));

  const handleSortedItemsChange = useCallback((sortedItems) => {
    setSummaryData(calcSummaryData(sortedItems));
  }, [calcSummaryData]);

  const tabs = [
    {
      title: 'All Allocations',
      content: ({ sortedItems, requestSort, sortConfig }) => <AllAllocationsList sortedItems={sortedItems} requestSort={requestSort} sortConfig={sortConfig} summaryData={summaryData} />
    },
    {
      title: 'Analysis',
      content: ({ sortedItems }) => <AllocationAnalysis allocations={sortedItems} />
    },
    {
      title: 'Area Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationPieChart allocations={sortedItems} module='areas' name='Area'/>
    },
    {
      title: 'Hedgerow Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationPieChart allocations={sortedItems} module='hedgerows' name='Hedgerow'/>
    },
    {
      title: 'Watercourse Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationPieChart allocations={sortedItems} module='watercourses' name='Watercourse'/>
    }
  ]

  return (
    <SearchableTableLayout
      initialItems={allocations}
      filterPredicate={filterPredicate}
      initialSortConfig={{ key: 'srn', direction: 'ascending' }}
      placeholder="Filter by BGS/Planning/Address/LPA/NCA/Spatial Risk."
      exportConfig={{ onExportXml: handleExportXML, onExportJson: handleExportJSON }}
      summary={(filteredCount, totalCount) => (
        <div className="summary" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> out of <strong>{formatNumber(totalCount, 0)}</strong> allocations arising from <strong>{summaryData.uniquePlanningRefs}</strong> out of <strong>{summaryData.totalUniquePlanningRefs}</strong> planning applications.</p>
        </div>
      )}
      onSortedItemsChange={handleSortedItemsChange}
      tabs={tabs}
    />
  );
}