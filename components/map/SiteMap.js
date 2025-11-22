// --- SiteMap Component ---
// This component renders the actual map.
import React, { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker } from '@/components/map/BaseMap';
import { lsoaStyle, lnrsStyle, ncaStyle, lpaStyle } from '@/components/map/MapStyles'
import { MAP_KEY_HEIGHT } from '@/config'
import MapKey from '@/components/map/MapKey';
import AllocationMapLayer from '@/components/map/AllocationMapLayer';
import BodyMapLayer from '@/components/map/BodyMapLayer';
import SiteAreaMapLayer from '@/components/map/SiteAreaMapLayer';

// --- SiteMap Component ---
const SiteMap = ({
  sites,
  hoveredSite,
  selectedSite,
  onSiteSelect,
  isForSitePage,
  shouldRenderAllocationLayer = false,
  showLPA = false,
  showNCA = false,
  showLNRS = false,
  showLSOA = false,
  displayKey = false,
  displaySiteArea = false,
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

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: mapHeight }} defaultBaseLayer={isForSitePage ? 'Satellite' : undefined}>

        {selectedSite && showLPA && (
          <BodyMapLayer
            bodyType="lpa"
            bodyName={selectedSite.lpaName}
            enabled={true}
            polygonCache={polygonCache}
          />
        )}

        {selectedSite && showNCA && (
          <BodyMapLayer
            bodyType="nca"
            bodyName={selectedSite.ncaName}
            enabled={true}
            polygonCache={polygonCache}
          />
        )}

        {selectedSite && showLNRS && (
          <BodyMapLayer
            bodyType="lnrs"
            bodyName={selectedSite.lnrsName}
            enabled={true}
            polygonCache={polygonCache}
          />
        )}

        {selectedSite && showLSOA && (
          <BodyMapLayer
            bodyType="lsoa"
            bodyName={selectedSite.lsoa.name}
            enabled={true}
            polygonCache={polygonCache}
          />
        )}

        {displaySiteArea && <SiteAreaMapLayer site={selectedSite} />}

        {sites.map(site =>
          site.position != null && (
            <SiteMapMarker key={site.referenceNumber} site={site} isHovered={site.referenceNumber == hoveredSite?.referenceNumber} withColorKeys={true} handlePopupClose={handlePopupClose} markerRefs={markerRefs} onSiteSelect={onSiteSelect} />
          )
        )}

        {selectedSite && shouldRenderAllocationLayer && (
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
