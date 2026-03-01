'use client';

import { useState, useMemo } from 'react';
import { formatNumber, calcMedian, calcMean } from '@/lib/format';
import AllocationList from './AllocationList';
import { Box, Text } from '@chakra-ui/react';

export default function AllocationListPage({ allocations }) {
  const [sortedAllocations, setSortedAllocations] = useState(allocations);
  const [sortConfig, setSortConfig] = useState({ key: 'srn', direction: 'ascending' });

  const summaryData = useMemo(() => {
    const totalArea = allocations.reduce((sum, alloc) => sum + (alloc.au || 0), 0);
    const totalHedgerow = allocations.reduce((sum, alloc) => sum + (alloc.hu || 0), 0);
    const totalWatercourse = allocations.reduce((sum, alloc) => sum + (alloc.wu || 0), 0);

    let medianDistance = calcMedian(allocations, 'd');
    let meanIMD = calcMean(allocations, 'imd');
    let meanSiteIMD = calcMean(allocations, 'simd');

    return {
      totalArea,
      totalHedgerow,
      totalWatercourse,
      medianDistance,
      meanIMD,
      meanSiteIMD,
    };
  }, [allocations]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sorted = [...allocations].sort((a, b) => {
      let aVal = key.split('.').reduce((obj, k) => obj?.[k], a);
      let bVal = key.split('.').reduce((obj, k) => obj?.[k], b);

      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'ascending' ? aVal - bVal : bVal - aVal;
      }

      // Handle string sorting
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) return direction === 'ascending' ? -1 : 1;
      if (aStr > bStr) return direction === 'ascending' ? 1 : -1;
      return 0;
    });

    setSortedAllocations(sorted);
  };

  // Get the first allocation for display purposes (title, etc.)
  const firstAlloc = allocations[0];

  return (
    <Box width="100%">
      {allocations.length > 0 && (
        <Box mb={4}>
          <Text fontSize="1.2rem" fontWeight="bold">
            Allocation: {firstAlloc?.pr} ({firstAlloc?.lpa})
          </Text>
          <Text fontSize="0.9rem" color="gray.600">
            Site: {firstAlloc?.srn} {firstAlloc?.siteName && `- ${firstAlloc.siteName}`}
          </Text>
        </Box>
      )}
      <AllocationList 
        sortedItems={sortedAllocations} 
        requestSort={requestSort} 
        sortConfig={sortConfig}
        summaryData={summaryData}
        displayPlanningRef={false}
      />
    </Box>
  );
}
