// --- SiteMap Component ---
// This component renders the actual map.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import { AllocationMapLayer, CalcAllocationMapLayerBounds } from '@/components/map/AllocationMapLayer';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import { SiteAreaMapLayer, CalcSiteAreaMapLayerBounds } from '@/components/map/SiteAreaMapLayer';
import { CalcBodyMapLayerBounds } from '@/components/map/BodyMapLayer';

function MapController({ showAllocations, showLPA, showNCA, showLNRS, showLSOA, showSiteArea, selectedSite, polygonCache, cacheVersion }) {
  const map = useMap();

  useEffect(() => {
    // Early return if no site selected
    if (!selectedSite) {
      return;
    }

    if (polygonCache.current.promises && Object.keys(polygonCache.current.promises).length > 0) {
      return;
    }

    const bounds = []

    // Allocation bounds
    if (showAllocations) {
      bounds.push(CalcAllocationMapLayerBounds(selectedSite.allocations))
    }

    // Body layer bounds - access cached GeoJSON data
    if (showLPA && selectedSite?.lpaName) {
      const lpaData = polygonCache.current.lpa?.[selectedSite.lpaName];
      if (lpaData) {
        bounds.push(CalcBodyMapLayerBounds(lpaData));
      } else {
        // wait
        return;
      }
    }

    if (showNCA && selectedSite?.ncaName) {
      const ncaData = polygonCache.current.nca?.[selectedSite.ncaName];
      if (ncaData) {
        bounds.push(CalcBodyMapLayerBounds(ncaData));
      } else {
        // wait
        return;
      }
    }

    if (showLNRS && selectedSite?.lnrsName) {
      const lnrsData = polygonCache.current.lnrs?.[selectedSite.lnrsName];
      if (lnrsData) {
        bounds.push(CalcBodyMapLayerBounds(lnrsData));
      } else {
        // wait
        return;
      }
    }

    // depending on context, lsoa can be just the name or the full lsoa object
    const lsoaName = selectedSite?.lsoa?.name ?? selectedSite?.lsoaName;
    if (showLSOA && lsoaName) {
      const lsoaData = polygonCache.current.lsoa?.[lsoaName];
      if (lsoaData) {
        bounds.push(CalcBodyMapLayerBounds(lsoaData));
      } else {
        // wait
        return;
      }
    }

    // Site area bounds
    if (showSiteArea || bounds.length == 0) {
      // if nothing is shown, just frame the site's area even though we dont render the circle
      bounds.push(CalcSiteAreaMapLayerBounds(selectedSite));
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

  }, [map, showAllocations, showLPA, showNCA, showLNRS, showLSOA, showSiteArea, selectedSite, polygonCache, cacheVersion]);

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
  showLPA = true,
  showNCA = true,
  showLNRS = true,
  showLSOA = true,
  showSiteArea = false,
}) => {
  const polygonCache = useRef({ lsoa: {}, lnrs: {}, nca: {}, lpa: {}, promises: {} });
  const [cacheVersion, setCacheVersion] = useState(0);
  const markerRefs = useRef({});

  // Cache updater function to be passed to child components
  const updatePolygonCache = (bodyType, cacheKey, data) => {
    if (!polygonCache.current[bodyType]) polygonCache.current[bodyType] = {};
    polygonCache.current[bodyType][cacheKey] = data;
    setCacheVersion(v => v + 1);
  };

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

  const handlePopupClose = (site) => {
    if (onSiteSelect && site?.referenceNumber == selectedSite?.referenceNumber) { onSiteSelect(null) };
  };

  const mapHeight = '100%'

  // display satellite if on site page and not showing allocs
  const mapLayer = useMemo(() => {
    if (isForSitePage) {
      if (showAllocations && selectedSite && selectedSite.allocations.length > 0) {
        return 'OpenStreetMap';
      }
      return 'Satellite';
    }
    return 'OpenStreetMap';
  }, [isForSitePage, showAllocations, selectedSite]);

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
          cacheVersion={cacheVersion}
        />

        {selectedSite && selectedSite.lpaName && (
          <BodyMapLayer
            key={`${selectedSite.referenceNumber}-lpa`}
            bodyType="lpa"
            bodyName={selectedSite.lpaName}
            enabled={showLPA}
            polygonCache={polygonCache}
            updatePolygonCache={updatePolygonCache}
          />
        )}

        {selectedSite && selectedSite.ncaName && (
          <BodyMapLayer
            key={`${selectedSite.referenceNumber}-nca`}
            bodyType="nca"
            bodyName={selectedSite.ncaName}
            enabled={showNCA}
            polygonCache={polygonCache}
            updatePolygonCache={updatePolygonCache}
          />
        )}

        {selectedSite && selectedSite.lnrsName && (
          <BodyMapLayer
            key={`${selectedSite.referenceNumber}-lnrs`}
            bodyType="lnrs"
            bodyName={selectedSite.lnrsName}
            enabled={showLNRS}
            polygonCache={polygonCache}
            updatePolygonCache={updatePolygonCache}
          />
        )}

        {selectedSite && lsoaName && (
          <BodyMapLayer
            key={`${selectedSite.referenceNumber}-lsoa`}
            bodyType="lsoa"
            bodyName={lsoaName}
            enabled={showLSOA}
            polygonCache={polygonCache}
            updatePolygonCache={updatePolygonCache}
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
    </div>
  );
};

export default SiteMap;
