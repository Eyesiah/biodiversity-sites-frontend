'use client'

import { useState, useCallback, useMemo } from 'react';
import { formatNumber, calcMedian, calcMean } from '@/lib/format';
import { bootstrapMedianCI } from '@/lib/Stats';
import { XMLBuilder } from 'fast-xml-parser';
import { triggerDownload } from '@/lib/utils';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { FilteredAllocationsPieChart } from '@/components/charts/FilteredHabitatPieChart'
import { Box, Text, SimpleGrid, Input, HStack } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

import AllAllocationsList from './AllAllocationsList';
import AllocationAnalysis from './AllocationAnalysis';

const CustomIMDTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#36454F' }}>
          IMD Difference: {label}
        </p>
        <p style={{ margin: '0 0 4px 0', color: '#36454F' }}>
          Count: {data.count}
        </p>
        <p style={{ margin: '0 0 4px 0', color: '#36454F' }}>
          Mean Allocation IMD Score: {data.meanAllocIMD.toFixed(2)}
        </p>
        <p style={{ margin: 0, color: '#36454F' }}>
          Mean Site IMD Score: {data.meanSiteIMD.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

const filterPredicate = (alloc, searchTerm) => {
  const lowercasedTerm = searchTerm.toLowerCase();
  const spatialRiskString = alloc.sr ? `${alloc.sr.cat}${alloc.sr.cat !== 'Outside' ? ` (${alloc.sr.from})` : ''}`.toLowerCase() : '';
  return (
    (alloc.srn?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.siteName?.toLowerCase() || '').includes(lowercasedTerm) ||
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
  const [binWidth, setBinWidth] = useState(2);

  const handleSortedItemsChange = useCallback((sortedItems) => {
    setSummaryData(calcSummaryData(sortedItems));
  }, [calcSummaryData]);

  const calcIMDHistogramData = useCallback((filteredAllocations, binWidth = 1) => {
    // Calculate IMD differences (Site IMD - Allocation IMD) for histogram
    const validAllocations = filteredAllocations.filter(alloc =>
      typeof alloc.simdS === 'number' && typeof alloc.imdS === 'number' &&
      alloc.simdS !== 'N/A' && alloc.imdS !== 'N/A'
    );

    // Group by configurable bin width
    const diffCounts = {};
    const diffAllocIMDs = {};
    const diffSiteIMDs = {};
    let minDiff = -10;
    let maxDiff = 10;
    validAllocations.forEach(alloc => {
      const rawDiff = alloc.simdS - alloc.imdS;
      const diff = Math.round(rawDiff / binWidth) * binWidth;
      minDiff = Math.min(minDiff, diff);
      maxDiff = Math.max(maxDiff, diff);
      diffCounts[diff] = (diffCounts[diff] || 0) + 1;
      if (!diffAllocIMDs[diff]) diffAllocIMDs[diff] = [];
      if (!diffSiteIMDs[diff]) diffSiteIMDs[diff] = [];
      diffAllocIMDs[diff].push(alloc.imdS);
      diffSiteIMDs[diff].push(alloc.simdS);
    });

    // Convert to chart data format
    const chartData = [];
    for (let i = minDiff; i <= maxDiff; i += binWidth) {
      if (diffCounts[i] || i === 0) { // Include 0 even if no data
        const allocIMDs = diffAllocIMDs[i] || [];
        const siteIMDs = diffSiteIMDs[i] || [];
        const meanAllocIMD = allocIMDs.length > 0 ? allocIMDs.reduce((sum, val) => sum + val, 0) / allocIMDs.length : 0;
        const meanSiteIMD = siteIMDs.length > 0 ? siteIMDs.reduce((sum, val) => sum + val, 0) / siteIMDs.length : 0;

        chartData.push({
          name: i === 0 ? '0' : i.toString(),
          count: diffCounts[i] || 0,
          meanAllocIMD: meanAllocIMD,
          meanSiteIMD: meanSiteIMD
        });
      }
    }

    // Calculate IMD statistics
    if (validAllocations.length > 0) {
      const differences = validAllocations.map(alloc => alloc.simdS - alloc.imdS);
      const meanDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;

      // Calculate median difference
      const sortedDifferences = [...differences].sort((a, b) => a - b);
      const medianDiff = sortedDifferences.length % 2 === 0
        ? (sortedDifferences[sortedDifferences.length / 2 - 1] + sortedDifferences[sortedDifferences.length / 2]) / 2
        : sortedDifferences[Math.floor(sortedDifferences.length / 2)];

      // Calculate 95% confidence interval for median
      const medianCI = bootstrapMedianCI(differences);

      // Calculate correlation between site IMD and allocation IMD scores
      const siteIMDs = validAllocations.map(alloc => alloc.simdS);
      const allocIMDs = validAllocations.map(alloc => alloc.imdS);

      const meanSiteIMD = siteIMDs.reduce((sum, val) => sum + val, 0) / siteIMDs.length;
      const meanAllocIMD = allocIMDs.reduce((sum, val) => sum + val, 0) / allocIMDs.length;

      let correlation = 0;
      let numerator = 0;
      let denom1 = 0;
      let denom2 = 0;

      for (let i = 0; i < validAllocations.length; i++) {
        const siteDiff = siteIMDs[i] - meanSiteIMD;
        const allocDiff = allocIMDs[i] - meanAllocIMD;
        numerator += siteDiff * allocDiff;
        denom1 += siteDiff * siteDiff;
        denom2 += allocDiff * allocDiff;
      }

      if (denom1 > 0 && denom2 > 0) {
        correlation = numerator / Math.sqrt(denom1 * denom2);
      }

      const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - meanDiff, 2), 0) / differences.length;
      const stdDevDiff = Math.sqrt(variance);

      return {
        chartData,
        stats: {
          count: validAllocations.length,
          correlation,
          meanDifference: meanDiff,
          medianDifference: medianDiff,
          medianCI,
          stdDevDifference: stdDevDiff
        }
      };
    }

    return { chartData: [], stats: {} };
  }, []);

  const tabs = [
    {
      title: 'All Allocations',
      content: ({ sortedItems, requestSort, sortConfig }) => <AllAllocationsList sortedItems={sortedItems} requestSort={requestSort} sortConfig={sortConfig} summaryData={summaryData} />
    },
    {
      title: 'Area<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='areas' name='Area' />
    },
    {
      title: 'Tree<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='trees' name='Individual Tree' />
    },
    {
      title: 'Hedgerow<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='hedgerows' name='Hedgerow' />
    },
    {
      title: 'Watercourse<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='watercourses' name='Watercourse' />
    },
    {
      title: 'Analysis Charts',
      content: ({ sortedItems }) => <AllocationAnalysis allocations={sortedItems} />
    },
    {
      title: 'IMD Score Transfers',
      content: ({ sortedItems }) => {
        const { chartData, stats } = calcIMDHistogramData(sortedItems, binWidth);
        return (
          <>            
            <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 50, right: 30, left: 20, bottom: 15 }} barCategoryGap={0}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" name="IMD Difference" label={{ value: 'Site IMD Score - Allocation IMD Score', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                  <YAxis tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                  <Tooltip content={<CustomIMDTooltip />} />
                  <Bar dataKey="count" fill="#afcd81ff">
                    <LabelList />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            {stats.count && stats.count > 0 && (
              <Box marginTop="6" border="1px" borderColor="#e2e8f0" borderRadius="md" padding="4">
                <Text fontSize="1.1rem" fontWeight="bold" color="#36454F" marginBottom="4" textAlign="center">
                  IMD Score Transfer Histogram - a negative value indicates a transfer to a less-deprived LSOA. A positive value indicates a transfer to a more-deprived LSOA.
                </Text>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing="4">
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Allocation Count</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{formatNumber(stats.count, 0)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Correlation</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.correlation?.toFixed(4)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Mean Difference</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.meanDifference?.toFixed(4)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Median Difference</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.medianDifference?.toFixed(4)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Median 95% Confidence Interval</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">
                      {stats.medianCI?.lower !== null && stats.medianCI?.upper !== null
                        ? `${stats.medianCI.lower.toFixed(4)} - ${stats.medianCI.upper.toFixed(4)}`
                        : 'N/A'}
                    </Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.9rem" color="#666" fontWeight="bold">Standard Deviation Difference</Text>
                    <Text fontSize="1.2rem" fontWeight="bold" color="#36454F">{stats.stdDevDifference?.toFixed(4)}</Text>
                  </Box>
                </SimpleGrid>
              </Box>
            )}
          </>
        );
      }
    },

  ]

  return (
    <SearchableTableLayout
      initialItems={allocations}
      filterPredicate={filterPredicate}
      initialSortConfig={{ key: 'srn', direction: 'ascending' }}
      placeholder="Filter by BGS Ref, Site Name, Planning Ref, Planning Address, LPA, NCA or Spatial Risk ..."
      exportConfig={{ onExportXml: handleExportXML, onExportJson: handleExportJSON }}
      summary={(filteredCount, totalCount) => (
        <Box textAlign='center'>
          <Text fontSize='1.2rem'>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> out of <strong>{formatNumber(totalCount, 0)}</strong> allocations arising from <strong>{summaryData.uniquePlanningRefs}</strong> out of <strong>{summaryData.totalUniquePlanningRefs}</strong> planning applications.</Text>
        </Box>
      )}
      onSortedItemsChange={handleSortedItemsChange}
      tabs={tabs}
    />
  );
}
