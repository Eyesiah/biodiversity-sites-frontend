'use client'

import { useState, useCallback, useMemo } from 'react';
import { formatNumber, calcMedian, calcMean } from '@/lib/format';
import { XMLBuilder } from 'fast-xml-parser';
import { triggerDownload } from '@/lib/utils';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { FilteredAllocationsPieChart } from '@/components/charts/FilteredHabitatPieChart'
import { Box, Text } from '@chakra-ui/react';

import AllAllocationsList from './AllAllocationsList';
import AllocationAnalysis from './AllocationAnalysis';

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
      title: 'Analysis Charts',
      content: ({ sortedItems }) => <AllocationAnalysis allocations={sortedItems} />
    },
    {
      title: 'Area<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='areas' name='Area' />
    },
    {
      title: 'Hedgerow<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='hedgerows' name='Hedgerow' />
    },
    {
      title: 'Watercourse<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredAllocationsPieChart allocs={sortedItems} module='watercourses' name='Watercourse' />
    }
  ]

  return (
    <SearchableTableLayout
      initialItems={allocations}
      filterPredicate={filterPredicate}
      initialSortConfig={{ key: 'srn', direction: 'ascending' }}
      placeholder="Filter by BGS Ref, Planning Ref, Planning Address, LPA, NCA or Spatial Risk ..."
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