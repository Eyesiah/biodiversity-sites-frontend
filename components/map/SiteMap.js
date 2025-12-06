// --- SiteMap Component ---
// This component renders the actual map.
import React, { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import { lsoaStyle, lnrsStyle, ncaStyle, lpaStyle } from '@/components/map/MapStyles'
import { MAP_KEY_HEIGHT } from '@/config'
import MapKey from '@/components/map/MapKey';
import { AllocationMapLayer, CalcAllocationMapLayerBounds } from '@/components/map/AllocationMapLayer';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import { SiteAreaMapLayer, CalcSiteAreaMapLayerBounds } from '@/components/map/SiteAreaMapLayer';
import { CalcBodyMapLayerBounds } from '@/components/map/BodyMapLayer';

function MapController({ showAllocations, showLPA, showNCA, showLNRS, showLSOA, showSiteArea, selectedSite, polygonCache }) {
  const map = useMap();

  useEffect(() => {
    const bounds = []
    
    // Site area bounds
    if (showSiteArea) {
      bounds.push(CalcSiteAreaMapLayerBounds(selectedSite));
    }
    
    // Allocation bounds
    if (showAllocations) {
      bounds.push(CalcAllocationMapLayerBounds(selectedSite.allocations))
    }
    
    // Body layer bounds - access cached GeoJSON data
    if (showLPA && selectedSite?.lpaName) {
      const lpaData = polygonCache.current.lpa?.[selectedSite.lpaName];
      if (lpaData) {
        bounds.push(CalcBodyMapLayerBounds(lpaData));
      }
    }
    
    if (showNCA && selectedSite?.ncaName) {
      const ncaData = polygonCache.current.nca?.[selectedSite.ncaName];
      if (ncaData) {
        bounds.push(CalcBodyMapLayerBounds(ncaData));
      }
    }
    
    if (showLNRS && selectedSite?.lnrsName) {
      const lnrsData = polygonCache.current.lnrs?.[selectedSite.lnrsName];
      if (lnrsData) {
        bounds.push(CalcBodyMapLayerBounds(lnrsData));
      }
    }
    
    // depending on context, lsoa can be just the name or the full lsoa object
    const lsoaName = selectedSite?.lsoa?.name ?? selectedSite?.lsoaName;
    if (showLSOA && lsoaName) {
      const lsoaData = polygonCache.current.lsoa?.[lsoaName];
      if (lsoaData) {
        bounds.push(CalcBodyMapLayerBounds(lsoaData));
      }
    }

    if (bounds.length > 0) {
      let concatenatedBounds = L.latLngBounds([]);
      for (let i = 0; i < bounds.length; i++) {
        if (bounds[i]) {
          concatenatedBounds.extend(bounds[i]);
        }
      }

      const PIXEL_PADDING = 50;
      if (concatenatedBounds.isValid()) {
        map.fitBounds(concatenatedBounds, {
          padding: [PIXEL_PADDING, PIXEL_PADDING],
        });
      }
    }

  }, [map, showAllocations, showLPA, showNCA, showLNRS, showLSOA, showSiteArea, selectedSite, polygonCache]);

  return null;
}


// --- SiteMap Component ---
const SiteMap = ({
  sites,
  hoveredSite,
  selectedSite,
  onSiteSelect,
  isForSitePage,
  showAllocations = false,
  showLPA = false,
  showNCA = false,
  showLNRS = false,
  showLSOA = false,
  displayKey = false,
  showSiteArea = false,
}) => {
  const polygonCache = useRef({ lsoa: {}, lnrs: {}, nca: {}, lpa: {} });
  const markerRefs = useRef({});

  useEffect(() => {
    if (selectedSite) {
      if (!isForSitePage) {
        const marker = markerRefs.current[selectedSite.referenceNumber];
        if (marker) {
          marker.openPopup();
        }
      }
    }
  }, [selectedSite, isForSitePage]);

  const handlePopupClose = () => {
    if (onSiteSelect) { onSiteSelect(null) };
  };

  const mapHeight = displayKey ? `calc(100% - ${MAP_KEY_HEIGHT})` : '100%'

  // display satellite if on site page and not showing allocs
  let mapLayer = undefined;
  if (isForSitePage) {
    mapLayer = 'Satellite';
    if (showAllocations && selectedSite && selectedSite.allocations.length > 0) { 
      mapLayer = undefined;
    }
  }

  // depending on context, lsoa can be just the name or the full lsoa object
  const lsoaName = selectedSite?.lsoa?.name ?? selectedSite?.lsoaName;

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: mapHeight }} defaultBaseLayer={mapLayer}>
        <MapController 
          showAllocations={showAllocations} 
          showLPA={showLPA} 
          showNCA={showNCA} 
          showLNRS={showLNRS} 
          showLSOA={showLSOA} 
          showSiteArea={showSiteArea} 
          selectedSite={selectedSite}
          polygonCache={polygonCache}
        />

        {selectedSite && selectedSite.lpaName &&(
          <BodyMapLayer
            bodyType="lpa"
            bodyName={selectedSite.lpaName}
            enabled={showLPA}
            polygonCache={polygonCache}
          />
        )}

        {selectedSite && selectedSite.ncaName && (
          <BodyMapLayer
            bodyType="nca"
            bodyName={selectedSite.ncaName}
            enabled={showNCA}
            polygonCache={polygonCache}
          />
        )}

        {selectedSite && selectedSite.lnrsName && (
          <BodyMapLayer
            bodyType="lnrs"
            bodyName={selectedSite.lnrsName}
            enabled={showLNRS}
            polygonCache={polygonCache}
          />
        )}

        {selectedSite && lsoaName && (
          <BodyMapLayer
            bodyType="lsoa"
            bodyName={lsoaName}
            enabled={showLSOA}
            polygonCache={polygonCache}
          />
        )}

        {showSiteArea && <SiteAreaMapLayer site={selectedSite} />}

        {sites.map(site =>
          site.position != null && (
            <SiteMapMarker key={site.referenceNumber} site={site} isHovered={site.referenceNumber == hoveredSite?.referenceNumber} withColorKeys={true} handlePopupClose={handlePopupClose} markerRefs={markerRefs} onSiteSelect={onSiteSelect} />
          )
        )}

        {selectedSite && showAllocations && (
          <AllocationMapLayer
            allocations={selectedSite.allocations}
            sitePosition={selectedSite.position}
          />
        )}
      </BaseMap>
      {displayKey && <MapKey keys={[
        { color: lpaStyle.color, label: 'LPA', fillOpacity: lpaStyle.fillOpacity },
        { color: ncaStyle.color, label: 'NCA', fillOpacity: ncaStyle.fillOpacity },
        { color: lnrsStyle.color, label: 'LNRS', fillOpacity: lnrsStyle.fillOpacity },
        { color: lsoaStyle.color, label: 'LSOA', fillOpacity: lsoaStyle.fillOpacity },
      ]} />}
    </div>
  );
};

export default SiteMap;
