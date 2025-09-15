// --- SiteMap Component ---
// This component renders the actual map.
import { GeoJSON, useMap } from 'react-leaflet';
import React, { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker, lpaStyle, lsoaStyle, lnrsStyle, ncaStyle, getPolys } from '@/components/Maps/BaseMap';
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL } from '@/config';

function MapController({ lsoa }) {
  const map = useMap();
  useEffect(() => {
    if (lsoa) {
      const layer = L.geoJSON(lsoa);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds());
    }
  }, [lsoa, map]);
  return null;
}

// --- SiteMap Component ---
const SiteMap = ({ sites, height, hoveredSite, selectedSite, onSiteSelect }) => {
  const [activePolygons, setActivePolygons] = useState({ lsoa: null, lnrs: null, nca: null, lpa: null });
  const polygonCache = useRef({ lsoa: {}, lnrs: {}, nca: {}, lpa: {} });
  const markerRefs = useRef({});

  const fetchAndDisplayPolygons = async (site) => {
    setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });

    if (!site) {
      return;
    }

    const lsoaFromCache = polygonCache.current.lsoa[site.lsoaName];
    const lnrsFromCache = polygonCache.current.lnrs[site.lnrsName];
    const ncaFromCache = polygonCache.current.nca[site.ncaName];
    const lpaFromCache = polygonCache.current.lpa[site.lpaName];

    const fetchPromises = [];

    if (lsoaFromCache) {
      fetchPromises.push(Promise.resolve(lsoaFromCache));
    } else {
      if (site.lsoaName && site.lsoaName !== 'N/A') {
        fetchPromises.push(getPolys(ARCGIS_LSOA_URL, 'LSOA11NM', site.lsoaName));
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
      const marker = markerRefs.current[selectedSite.referenceNumber];
      if (marker) {
        fetchAndDisplayPolygons(selectedSite);
        marker.openPopup();
      }
    }
    else {
      setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });
    }
  }, [selectedSite]);


  const handlePopupClose = () => {
    setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });
    onSiteSelect(null);
  };

  return (
    <BaseMap height={height}>
      <MapController lsoa={activePolygons.lsoa} />

      {activePolygons.lpa && <GeoJSON data={activePolygons.lpa} style={lpaStyle} />}
      {activePolygons.nca && <GeoJSON data={activePolygons.nca} style={ncaStyle} />}
      {activePolygons.lnrs && <GeoJSON data={activePolygons.lnrs} style={lnrsStyle} />}
      {activePolygons.lsoa && <GeoJSON data={activePolygons.lsoa} style={lsoaStyle} />}

      {sites.filter(site => site.position != null).map(site => (
          <SiteMapMarker key={site.referenceNumber} site={site} isHovered={site.referenceNumber == hoveredSite?.referenceNumber} withColorKeys={true} handlePopupClose={handlePopupClose} markerRefs={markerRefs} onSiteSelect={onSiteSelect} />
      ))}
    </BaseMap>
  );
};

export default SiteMap;