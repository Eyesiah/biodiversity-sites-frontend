'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import AllocationListTab from './AllocationListTab';
import { useIsMobile } from '@/lib/hooks.js';
import { Tabs } from '@/components/styles/Tabs';
import { FilteredAllocationsPieChart } from '@/components/charts/FilteredHabitatPieChart';
import AllocationAnalysis from '@/components/charts/AllocationAnalysis';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, LabelList } from 'recharts';
import { Heading, Flex, Box, Text } from '@chakra-ui/react';

// Dynamic import for SiteMap to avoid SSR issues with Leaflet
const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function AllocationPageContent({ allocations, sites, selectedSite }) {
  const isMobile = useIsMobile();
  const [hoveredSite, setHoveredSite] = useState(null);

  // Handle site selection from map
  const handleSiteSelect = (site) => {
    // For now, we just track the hovered site for highlighting
    setHoveredSite(site);
  };

  const allocationsForMap = useMemo(() => {
    return allocations.map(alloc => {
      const site = sites.find(s => s.referenceNumber == alloc.srn);
      if (site) {
        return {
          ...alloc,
          siteReferenceNumber: alloc.srn,
          siteName: site.name,
          sitePosition: site.position
        }
      }
    })
  }, [allocations, sites])

  // Custom IMD Analysis Component for allocations
  const imdDistributionData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      decile: `${i + 1}`,
      developmentSites: 0,
      bgsSites: 0,
    }));

    allocations.forEach(alloc => {
      if (typeof alloc.imd === 'number' && alloc.imd >= 1 && alloc.imd <= 10) {
        bins[alloc.imd - 1].developmentSites++;
      }
      if (typeof alloc.simd === 'number' && alloc.simd >= 1 && alloc.simd <= 10) {
        bins[alloc.simd - 1].bgsSites++;
      }
    });

    return bins;
  }, [allocations]);

  const ImdAnalysisChart = useMemo(() => {
    return (
      <Box>
        <Heading as="h4" size="md" textAlign="center" mb={4}>Allocations by IMD Decile (1 = most deprived, 10 = least deprived)</Heading>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={imdDistributionData} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="decile" name="IMD Decile" />
            <YAxis name="Number of Sites" allowDecimals={false} />
            <RechartsTooltip formatter={(value, name, props) => [value, name]} />
            <Legend />
            <Bar dataKey="developmentSites" fill="#e2742fff" name="Development Sites">
              <LabelList dataKey="developmentSites" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
            <Bar dataKey="bgsSites" fill="#6ac98fff" name="BGS Offset Sites">
              <LabelList dataKey="bgsSites" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Flex justifyContent="center" alignItems="center" gap={4} mt={2} fontSize="0.9rem">
          <Flex alignItems="center">
            <Box w="12px" h="12px" bg="#e2742fff" mr="5px" border="1px solid #ccc"></Box>
            <Text>Development Sites</Text>
          </Flex>
          <Flex alignItems="center">
            <Box w="12px" h="12px" bg="#6ac98fff" mr="5px" border="1px solid #ccc"></Box>
            <Text>BGS Offset Sites</Text>
          </Flex>
        </Flex>
      </Box>
    );
  }, [imdDistributionData]);

  // Define tab configuration
  const tabs = useMemo(() => {

    let tabList = [
      {
        title: 'Allocations List',
        content: () => <AllocationListTab allocations={allocations} />
      },
      {
        title: 'IMD Score<br>Analysis',
        content: () => ImdAnalysisChart
      },
      {
        title: 'Allocation<br>Analysis',
        content: () => <AllocationAnalysis allocations={allocations} />
      }
    ];

    if (allocations.map(a => a.habitats.areas || []).flat().length > 0) {
      tabList.push({
        title: 'Area<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='areas' name='Area' />
      });
    }
    if (allocations.map(a => a.habitats.trees || []).flat().length > 0) {
      tabList.push({
        title: 'Individual Tree<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='trees' name='Individual Tree' />
      });
    }
    if (allocations.map(a => a.habitats.hedgerows || []).flat().length > 0) {
      tabList.push({
        title: 'Hedgerow<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='hedgerows' name='Hedgerow' />
      });
    }
    if (allocations.map(a => a.habitats.watercourses || []).flat().length > 0) {
      tabList.push({
        title: 'Watercourse<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='watercourses' name='Watercourse' />
      });
    }

    return tabList;
  }, [allocations, ImdAnalysisChart]);

  return (
    <MapContentLayout
      map={
        <SiteMap
          sites={sites}
          hoveredSite={hoveredSite}
          selectedSite={selectedSite}
          onSiteSelect={handleSiteSelect}
          showAllocations={true}
          showLPA={false}
          showNCA={false}
          showLNRS={false}
          showLSOA={false}
          showSiteArea={false}
          openPopups={true}
          mapLayer={'OpenStreetMap'}
          allocations={allocationsForMap}
        />
      }
      content={
        <Tabs.Root lazyMount defaultValue={0} width="100%">
          <Tabs.List>
            {tabs.map((tab, index) => (
              <Tabs.Trigger
                key={index}
                value={index}
                dangerouslySetInnerHTML={{ __html: tab.title }}
              />
            ))}
          </Tabs.List>
          {tabs.map((tab, index) => (
            <Tabs.Content key={index} value={index} paddingTop={1}>
              {tab.content()}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      }
    />
  );
}
