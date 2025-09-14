import { GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker, lnrsStyle, adjacentStyle } from '@/components/Maps/BaseMap';

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

const PolygonMap = ({ selectedItem, geoJsonUrl, nameProperty, sites = [], height = '85vh', style = lnrsStyle }) => {
  const [geoJson, setGeoJson] = useState(null);
  const [adjacentGeoJson, setAdjacentGeoJson] = useState(null);
  const cache = useRef({});
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    let isCancelled = false;

    const fetchPolygons = async () => {
      // Reset state when starting a new fetch to clear previous polygons
      setGeoJson(null);
      setAdjacentGeoJson(null);

      if (!selectedItem || !selectedItem[nameProperty]) return;
      const name = selectedItem[nameProperty];

      // Use a different field for the query if the geoJsonUrl indicates it's for LPAs
      let queryField = nameProperty;
      if (geoJsonUrl.includes('National_Character_Areas_England')) {
        queryField = 'NCA_Name';
      } else if (geoJsonUrl.includes('LPA_APR_2023_UK_BUC_V2')) {
        queryField = 'LPA23NM';
      } else if (geoJsonUrl.includes('LNRS_Area')) {
        queryField = 'Name';
      }

      const url = `${geoJsonUrl}?where=${queryField}='${name.replace(/'/g, "''")}'&outFields=*&returnGeometry=true&f=geojson`;
      
      const adjacentPromises = (selectedItem.adjacents || []).map(adj => {
        const adjName = adj.name.replace(/'/g, "''");
        const adjUrl = `${geoJsonUrl}?where=${queryField}='${adjName}'&outFields=*&returnGeometry=true&f=geojson`;
        return fetch(adjUrl).then(res => res.json());
      });

      try {
        const mainGeoJsonPromise = cache.current[name] 
          ? Promise.resolve(cache.current[name]) 
          : fetch(url).then(res => res.json());

        const [mainData, ...adjacentResponses] = await Promise.all([mainGeoJsonPromise, ...adjacentPromises]);

        if (mainData.error || !mainData.features || mainData.features.length === 0) {
          throw new Error(mainData.error?.message || "Invalid GeoJSON response for main item");
        }
        
        if (!isCancelled) {
          setGeoJson(cache.current[name] = mainData);
          
          const validAdjacentData = adjacentResponses.filter(data => data && !data.error && data.features && data.features.length > 0);
          setAdjacentGeoJson(validAdjacentData.length > 0 ? validAdjacentData : null);

          setMapKey(name);
        }
      } catch (error) {
        console.error("Failed to fetch polygon data:", error);
        if (!isCancelled) {
          // Ensure state is cleared on error to avoid displaying stale data
          setGeoJson(null);
          setAdjacentGeoJson(null);
        }
      }
    };
    fetchPolygons();
  }, [selectedItem, geoJsonUrl, nameProperty, sites]);

  return (
    <BaseMap key={mapKey} center={[52.8, -1.5]} zoom={6.5} style={{ height, width: '100%' }}>
      {adjacentGeoJson && adjacentGeoJson.map((adjGeoJson, index) => (
        <GeoJSON 
          key={`${mapKey}-adj-${index}`} 
          data={adjGeoJson} 
          style={adjacentStyle} 
        />
      ))}
      {geoJson && <GeoJSON data={geoJson} style={style} />}
      <MapController geoJson={geoJson} />

      {sites.filter(site => site.position != null).map(site => (
        <SiteMapMarker site={site} withColorKeys={false} />
      ))}
    </BaseMap>
  );
};

export default PolygonMap;