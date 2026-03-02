'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import AllocationListTab from './AllocationListTab';
import { useIsMobile } from '@/lib/hooks.js';
import { Tabs } from '@/components/styles/Tabs';
import { FilteredAllocationsPieChart } from '@/components/charts/FilteredHabitatPieChart';
import AllocationAnalysis from '@/components/charts/AllocationAnalysis';

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

  // Define tab configuration
  const tabs = useMemo(() => {

    let tabList = [
      {
        title: 'Allocations List',
        content: () => <AllocationListTab allocations={allocations} />
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
  }, [allocations]);

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
