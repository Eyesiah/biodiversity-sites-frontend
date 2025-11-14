// --- SiteMap Component ---
// This component renders the actual map.
import { useMap, Tooltip, Circle } from 'react-leaflet';
import React, { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker, lpaStyle, lsoaStyle, lnrsStyle, ncaStyle } from '@/components/map/BaseMap';
import { MAP_KEY_HEIGHT } from '@/config'
import MapKey from '@/components/map/MapKey';
import AllocationMapLayer from '@/components/map/AllocationMapLayer';
import BodyMapLayer from '@/components/map/BodyMapLayer';

function MapController({ circleBounds }) {
  const map = useMap();
  useEffect(() => {
    if (circleBounds) {
      map.fitBounds(circleBounds, {padding: [150, 150]});
    }
  }, [circleBounds, map]);
  return null;
}



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
  displayKey = false
}) => {
  const [activeCircle, setActiveCircle] = useState(null);
  const polygonCache = useRef({ lsoa: {}, lnrs: {}, nca: {}, lpa: {} });
  const markerRefs = useRef({});

  useEffect(() => {
    if (selectedSite) {
      if (isForSitePage) {
        const radius = Math.sqrt((selectedSite.siteSize * 10000) / Math.PI);
        setActiveCircle(radius);
      } else {
        setActiveCircle(null);
        const marker = markerRefs.current[selectedSite.referenceNumber];
        if (marker) {
          marker.openPopup();
        }
      }
    } else {
      setActiveCircle(null);
    }
  }, [selectedSite, isForSitePage]);

  const handlePopupClose = () => {
    if (onSiteSelect) { onSiteSelect(null) };
  };

  const mapHeight = displayKey ? `calc(100% - ${MAP_KEY_HEIGHT})` : '100%'

  const circleBounds = activeCircle ? L.latLng(selectedSite.position).toBounds(activeCircle) : null;

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: mapHeight }} defaultBaseLayer={isForSitePage ? 'Satellite' : undefined}>
        <MapController circleBounds={circleBounds} />

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
            bodyName={selectedSite.lsoaName}
            enabled={true}
            polygonCache={polygonCache}
          />
        )}

        {activeCircle && <Circle center={selectedSite.position} radius={activeCircle} pathOptions={{ color: 'white', weight: 2, fill: false, dashArray: '5, 5' }} />}

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
