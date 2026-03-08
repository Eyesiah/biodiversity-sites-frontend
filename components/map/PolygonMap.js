import { useMap } from 'react-leaflet';
import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import { lnrsStyle } from '@/components/map/MapStyles'
import { usePolygonCacheState } from '@/lib/polygonCache';

function MapController({ geoJson }) {
  const map = useMap();
  useEffect(() => {
    if (geoJson && geoJson.features && geoJson.features.length > 0) {
      const layer = L.geoJSON(geoJson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    }
  }, [geoJson, map]);
  return null;
}


const PolygonMap = ({ selectedItems, bodyType, sites = [], hoveredSite = null, selectedSite = null, onPolygonClick }) => {
  const { polygonCache, cacheVersion, updatePolygonCache } = usePolygonCacheState();
  const markerRefs = useRef({});

  useEffect(() => {
    if (selectedSite) {
      const marker = markerRefs.current[selectedSite.referenceNumber];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedSite]);

  // Handle multiple selected items
  const itemsToProcess = Array.isArray(selectedItems) ? selectedItems : (selectedItems ? [selectedItems] : []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: '100%', width: '100%' }}>
        {/* Conditional BodyMapLayers based on itemsToProcess and bodyType */}
        {itemsToProcess.length > 0 && bodyType && (
          itemsToProcess.map((item, index) => {
            const bodyName = item.name;
            if (!bodyName) return null;

            // Determine if we should show adjacent bodies (only for single item)
            const showAdjacent = itemsToProcess.length === 1;
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

export default PolygonMap;
