import { useMap } from 'react-leaflet';
import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import { usePolygonCacheState } from '@/lib/polygonCache';

function MapController({ polygonCache, cacheVersion, bodiesToDisplay, bodyType }) {
  const map = useMap();
  useEffect(() => {
    if (polygonCache && bodyType && bodiesToDisplay && bodiesToDisplay.length == 1) {
      const geoJson = polygonCache.current[bodyType]?.[bodiesToDisplay[0].name];

      if (geoJson && geoJson.features && geoJson.features.length > 0) {
        const layer = L.geoJSON(geoJson);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        }
      }
    } else {
      map.setZoom(6.75, {animate: false});
      map.panTo([52.9522, -2.0153], {animate: false});
    }
  }, [polygonCache, cacheVersion, bodiesToDisplay, bodyType, map]);
  return null;
}

const PolygonMap = ({ bodiesToDisplay, bodyType, sites = [], hoveredSite = null, selectedSite = null, onPolygonClick }) => {
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

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: '100%', width: '100%' }}>

        <MapController bodiesToDisplay={bodiesToDisplay} polygonCache={polygonCache} cacheVersion={cacheVersion} bodyType={bodyType} />

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

export default PolygonMap;
