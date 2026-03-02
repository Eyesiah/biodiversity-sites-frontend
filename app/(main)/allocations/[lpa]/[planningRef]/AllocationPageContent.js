'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import AllocationListPage from './AllocationListPage';
import { useIsMobile } from '@/lib/hooks.js';

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
        <AllocationListPage allocations={allocations} />
      }
    />
  );
}
