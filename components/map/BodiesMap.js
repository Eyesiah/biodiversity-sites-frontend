import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import { usePolygonCacheRef } from '@/lib/polygonCache';

const BodiesMap = ({ bodiesToDisplay, bodyType, sites = [], hoveredSite = null, selectedSite = null, onPolygonClick }) => {
  const { polygonCache, cacheVersion, updatePolygonCache } = usePolygonCacheRef();
  const markerRefs = useRef({});

  useEffect(() => {
    if (selectedSite) {
      const marker = markerRefs.current[selectedSite.referenceNumber];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedSite]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: '100%', width: '100%' }}>

        {bodiesToDisplay.length > 0 && bodyType && (
          bodiesToDisplay.map((item, index) => {
            const bodyName = item.name;
            if (!bodyName) return null;

            // Determine if we should show adjacent bodies (only for single item)
            const showAdjacent = bodiesToDisplay.length === 1;
            const adjacents = showAdjacent ? (item.adjacents || []) : [];

            return (
              <BodyMapLayer
                key={`${bodyType}-${bodyName}-${index}`}
                bodyType={bodyType}
                bodyName={bodyName}
                enabled={true}
                polygonCache={polygonCache}
                updatePolygonCache={updatePolygonCache}
                onPolygonClick={onPolygonClick}
                showAdjacent={showAdjacent}
                adjacents={adjacents}
              />
            );
          })
        )}

        {/* Always render sites */}
        {sites && sites.filter(site => site.position != null).map(site => (
          <SiteMapMarker key={site.referenceNumber} site={site} withColorKeys={false} isHovered={hoveredSite && site.referenceNumber === hoveredSite.referenceNumber} markerRefs={markerRefs} />
        ))}
      </BaseMap>
    </div>
  );
};

export default BodiesMap;
