import { useMap, GeoJSON } from 'react-leaflet';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL, ARCGIS_LSOA_NAME_FIELD } from '@/config';
import { lnrsStyle, adjacentStyle } from '@/components/map/MapStyles'
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

// Body type mapping based on geoJsonUrl
const getBodyType = (geoJsonUrl) => {
  if (!geoJsonUrl) return null;
  if (geoJsonUrl.includes('LPA_APR_2023_UK_BUC_V2')) return 'lpa';
  if (geoJsonUrl.includes('National_Character_Areas_England')) return 'nca';
  if (geoJsonUrl.includes('LNRS_Area')) return 'lnrs';
  return null;
};

const PolygonMap = ({ selectedItems, geoJsonUrl, nameProperty, sites = [], style = lnrsStyle, hoveredSite = null, selectedSite = null, onPolygonClick }) => {
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

  // Handle polygon click - find the clicked body and call the callback with the correct field
  const handlePolygonClick = (bodyName) => {
    if (onPolygonClick) {
      // Determine the correct field based on body type
      const bodyType = getBodyType(geoJsonUrl);
      let fieldName = nameProperty;
      
      if (bodyType === 'lpa') fieldName = 'LPA23NM';
      else if (bodyType === 'nca') fieldName = 'NCA_Name';
      else if (bodyType === 'lnrs') fieldName = 'Name';

      onPolygonClick(bodyName);
    }
  };

  // Handle multiple selected items
  const itemsToProcess = Array.isArray(selectedItems) ? selectedItems : (selectedItems ? [selectedItems] : []);
  const bodyType = getBodyType(geoJsonUrl);

  if (!bodyType) {
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <BaseMap style={{ height: '100%', width: '100%' }}>
          {sites && sites.filter(site => site.position != null).map(site => (
            <SiteMapMarker key={site.referenceNumber} site={site} withColorKeys={false} isHovered={hoveredSite && site.referenceNumber === hoveredSite.referenceNumber} markerRefs={markerRefs} />
          ))}
        </BaseMap>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: '100%', width: '100%' }}>
        {itemsToProcess.map((item, index) => {
          const bodyName = item[nameProperty];
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
              onPolygonClick={handlePolygonClick}
              showAdjacent={showAdjacent}
              adjacents={adjacents}
            />
          );
        })}

        {sites && sites.filter(site => site.position != null).map(site => (
          <SiteMapMarker key={site.referenceNumber} site={site} withColorKeys={false} isHovered={hoveredSite && site.referenceNumber === hoveredSite.referenceNumber} markerRefs={markerRefs} />
        ))}
      </BaseMap>
    </div>
  );
};

export default PolygonMap;
