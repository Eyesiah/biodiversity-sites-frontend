// --- SiteMap Component ---
// This component renders the actual map.
import { GeoJSON, useMap, Tooltip } from 'react-leaflet';
import { Polyline } from 'react-leaflet/Polyline'
import React, { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker, lpaStyle, lsoaStyle, lnrsStyle, ncaStyle, getPolys } from '@/components/map/BaseMap';
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL, ARCGIS_LSOA_NAME_FIELD } from '@/config'
import MapKey from '@/components/map/MapKey';

function MapController({ lsoa, lnrs, nca, lpa }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([]);
    [lsoa, lnrs, nca, lpa].forEach((geo) => {
      if (geo) {
        const layer = L.geoJSON(geo);
        if (layer.getBounds().isValid()) {
          bounds.extend(layer.getBounds());
        }
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds);
    }
  }, [lsoa, lnrs, nca, lpa, map]);
  return null;
}

function PolylinePane() {
  const map = useMap();
  useEffect(() => {
    const pane = map.createPane('polyline-pane');
    pane.style.zIndex = 450;
  }, [map]);
  return null;
}

// --- SiteMap Component ---
const SiteMap = ({ sites, hoveredSite, selectedSite, onSiteSelect }) => {
  const [activePolygons, setActivePolygons] = useState({ lsoa: null, lnrs: null, nca: null, lpa: null });
  const polygonCache = useRef({ lsoa: {}, lnrs: {}, nca: {}, lpa: {} });
  const markerRefs = useRef({});

  const fetchAndDisplayPolygons = async (site) => {
    setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });

    if (!site) {
      return;
    }

    const lsoaName = site.lsoaName ?? site.lsoa.name;

    const lsoaFromCache = polygonCache.current.lsoa[lsoaName];
    const lnrsFromCache = polygonCache.current.lnrs[site.lnrsName];
    const ncaFromCache = polygonCache.current.nca[site.ncaName];
    const lpaFromCache = polygonCache.current.lpa[site.lpaName];

    const fetchPromises = [];

    if (lsoaFromCache) {
      fetchPromises.push(Promise.resolve(lsoaFromCache));
    } else {
      if (lsoaName && lsoaName !== 'N/A') {
        fetchPromises.push(getPolys(ARCGIS_LSOA_URL, ARCGIS_LSOA_NAME_FIELD, lsoaName));
      } else {
        fetchPromises.push(Promise.resolve(null)); // Push null if no LSOA name
      }
    }

    if (lnrsFromCache) {
      fetchPromises.push(Promise.resolve(lnrsFromCache));
    } else {
      if (site.lnrsName && site.lnrsName !== 'N/A') {
        fetchPromises.push(getPolys(ARCGIS_LNRS_URL, 'Name', site.lnrsName));
      } else {
        fetchPromises.push(Promise.resolve(null));
      }
    }

    if (ncaFromCache) {
      fetchPromises.push(Promise.resolve(ncaFromCache));
    } else {
      if (site.ncaName && site.ncaName !== 'N/A') {
        fetchPromises.push(getPolys(ARCGIS_NCA_URL, 'NCA_Name', site.ncaName));
      } else {
        fetchPromises.push(Promise.resolve(null));
      }
    }

    if (lpaFromCache) {
      fetchPromises.push(Promise.resolve(lpaFromCache));
    } else {
      if (site.lpaName && site.lpaName !== 'N/A') {
        fetchPromises.push(getPolys(ARCGIS_LPA_URL, 'LPA23NM', site.lpaName));
      } else {
        fetchPromises.push(Promise.resolve(null));
      }
    }

    try {
      const [lsoaGeoJson, lnrsGeoJson, ncaGeoJson, lpaGeoJson] = await Promise.all(fetchPromises);

      if (!lsoaFromCache && site.lsoaName) polygonCache.current.lsoa[site.lsoaName] = lsoaGeoJson;
      if (!lnrsFromCache && site.lnrsName) polygonCache.current.lnrs[site.lnrsName] = lnrsGeoJson;
      if (!ncaFromCache && site.ncaName) polygonCache.current.nca[site.ncaName] = ncaGeoJson;
      if (!lpaFromCache && site.lpaName) polygonCache.current.lpa[site.lpaName] = lpaGeoJson;

      setActivePolygons({ lsoa: lsoaGeoJson, lnrs: lnrsGeoJson, nca: ncaGeoJson, lpa: lpaGeoJson });
    } catch (error) {
      console.error("Failed to fetch polygon data:", error);
      setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });
    }
  };

  useEffect(() => {
    if (selectedSite) {
      fetchAndDisplayPolygons(selectedSite);
      const marker = markerRefs.current[selectedSite.referenceNumber];
      if (marker) {
        marker.openPopup();
      }
    }
    else {
      setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });
    }
  }, [selectedSite]);


  const handlePopupClose = () => {
    setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });
    if (onSiteSelect) { onSiteSelect(null) };
  };

  const displayKey = onSiteSelect == null;
  const mapHeight = displayKey ? 'calc(100% - 1rem)' : '100%'

  return (
    <div style={{ height: 'calc(100vh - 10rem)', width: '100%' }}>
      <BaseMap style={{ height: mapHeight }}>
        <MapController lsoa={activePolygons.lsoa} lnrs={activePolygons.lnrs} lpa={activePolygons.lpa} nca={activePolygons.nca} />
        <PolylinePane />

        {activePolygons.lpa && <GeoJSON data={activePolygons.lpa} style={lpaStyle} />}
        {activePolygons.nca && <GeoJSON data={activePolygons.nca} style={ncaStyle} />}
        {activePolygons.lnrs && <GeoJSON data={activePolygons.lnrs} style={lnrsStyle} />}
        {activePolygons.lsoa && <GeoJSON data={activePolygons.lsoa} style={lsoaStyle} />}

        {sites.map(site =>
          site.position != null && (
            <SiteMapMarker key={site.referenceNumber} site={site} isHovered={site.referenceNumber == hoveredSite?.referenceNumber} withColorKeys={true} handlePopupClose={handlePopupClose} markerRefs={markerRefs} onSiteSelect={onSiteSelect} />
          )
        )}

        {selectedSite && selectedSite.allocations &&
          selectedSite.allocations.filter(a => a.coords).map((alloc, index) => {
            return (
              <Polyline
                key={index}
                pane="polyline-pane"
                positions={[selectedSite.position, [alloc.coords.latitude, alloc.coords.longitude]]}
                pathOptions={{ color: '#0d6efd', weight: 3 }}
                eventHandlers={{
                  mouseover: (e) => e.target.setStyle({ color: '#ffc107', weight: 5 }),
                  mouseout: (e) => e.target.setStyle({ color: '#0d6efd', weight: 3 }),
                }}
              >
                <Tooltip>
                  <div><strong>{alloc.projectName || 'N/A'}</strong></div>
                  <div>Planning Ref: {alloc.planningReference}</div>
                  <div>LPA: {alloc.localPlanningAuthority}</div>
                  <div>Distance: {typeof alloc.distance === 'number' ? `${alloc.distance.toFixed(2)} km (${`${alloc.sr.cat}${alloc.sr.cat != 'Outside' ? ` (${alloc.sr.from})` : ''}`})` : 'N/A'}</div>
                </Tooltip>
              </Polyline>
            );
          })}
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