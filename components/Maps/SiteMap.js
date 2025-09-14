// --- SiteMap Component ---
// This component renders the actual map.
import { GeoJSON, useMap } from 'react-leaflet';
import React, { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker, lpaStyle, lsoaStyle, lnrsStyle, ncaStyle } from '@/components/Maps/BaseMap';

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
      const lsoaName = site.lsoaName.replace(/'/g, "''");
      if (site.lsoaName && site.lsoaName !== 'N/A') {
        const lsoaUrl = `https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_Dec_2011_Boundaries_Full_Clipped_BFC_EW_V3_2022/FeatureServer/0/query?where=LSOA11NM='${lsoaName}'&outFields=&returnGeometry=true&f=geojson`;
        fetchPromises.push(fetch(lsoaUrl).then(res => res.json()));
      } else {
        fetchPromises.push(Promise.resolve(null)); // Push null if no LSOA name
      }
    }

    if (lnrsFromCache) {
      fetchPromises.push(Promise.resolve(lnrsFromCache));
    } else {
      const lnrsName = site.lnrsName.replace(/'/g, "''");
      if (site.lnrsName && site.lnrsName !== 'N/A') {
        const lnrsUrl = `https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/LNRS_Area/FeatureServer/0/query?where=Name='${lnrsName}'&outFields=&returnGeometry=true&f=geojson`;
        fetchPromises.push(fetch(lnrsUrl).then(res => res.json()));
      } else {
        fetchPromises.push(Promise.resolve(null));
      }
    }

    if (ncaFromCache) {
      fetchPromises.push(Promise.resolve(ncaFromCache));
    } else {
      const ncaName = site.ncaName.replace(/'/g, "''");
      if (site.ncaName && site.ncaName !== 'N/A') {
        const ncaUrl = `https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query?where=NCA_Name='${ncaName}'&outFields=&returnGeometry=true&f=geojson`;
        fetchPromises.push(fetch(ncaUrl).then(res => res.json()));
      } else {
        fetchPromises.push(Promise.resolve(null));
      }
    }

    if (lpaFromCache) {
      fetchPromises.push(Promise.resolve(lpaFromCache));
    } else {
      const lpaName = site.lpaName.replace(/'/g, "''");
      if (site.lpaName && site.lpaName !== 'N/A') {
        const lpaUrl = `https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LPA_APR_2023_UK_BUC_V2/FeatureServer/0/query?where=LPA23NM='${lpaName}'&outFields=&returnGeometry=true&f=geojson`;
        fetchPromises.push(fetch(lpaUrl).then(res => res.json()));
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
  }, [selectedSite]);


  const handlePopupClose = () => {
    setActivePolygons({ lsoa: null, lnrs: null, nca: null, lpa: null });
    onSiteSelect(null);
  };

  if (!sites || sites.length === 0) {
    return <p>No sites with location data available to display on the map.</p>;
  }

  return (
    <BaseMap center={[52.8, -1.5]} zoom={6.5} style={{ height: height || 'calc(100vh - 80px)', width: '100%' }}>
      <MapController lsoa={activePolygons.lsoa} />

      {activePolygons.lpa && <GeoJSON data={activePolygons.lpa} style={lpaStyle} />}
      {activePolygons.nca && <GeoJSON data={activePolygons.nca} style={ncaStyle} />}
      {activePolygons.lnrs && <GeoJSON data={activePolygons.lnrs} style={lnrsStyle} />}
      {activePolygons.lsoa && <GeoJSON data={activePolygons.lsoa} style={lsoaStyle} />}

      {sites.filter(site => site.position != null).map(site => (
          <SiteMapMarker site={site} isHovered={site.referenceNumber == hoveredSite?.referenceNumber} withColorKeys={true} handlePopupClose={handlePopupClose} markerRefs={markerRefs} onSiteSelect={onSiteSelect} />
      ))}
    </BaseMap>
  );
};

export default SiteMap;