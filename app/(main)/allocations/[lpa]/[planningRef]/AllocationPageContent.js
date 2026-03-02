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

export default function AllocationPageContent({ allocations, sites, selectedSite, allocationsForMap }) {
  const isMobile = useIsMobile();
  const [hoveredSite, setHoveredSite] = useState(null);

  // Use OpenStreetMap when showing allocations (same as SitePageContent)
  const mapLayer = useMemo(() => {
    return 'OpenStreetMap';
  }, []);

  // Handle site selection from map
  const handleSiteSelect = (site) => {
    // For now, we just track the hovered site for highlighting
    setHoveredSite(site);
  };

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
          showSiteArea={true}
          openPopups={false}
          mapLayer={mapLayer}
          allocations={allocationsForMap}
        />
      }
      content={
        <AllocationListPage allocations={allocations} />
      }
    />
  );
}
