import { GeoJSON, useMap, Marker, Popup } from 'react-leaflet';
import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap, SiteMapMarker, lnrsStyle, adjacentStyle, getPolys } from '@/components/Maps/BaseMap';

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
  const [error, setError] = useState(null);
  const cache = useRef({});
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    let isCancelled = false;

    const fetchPolygons = async () => {
      // Reset state when starting a new fetch to clear previous polygons
      setGeoJson(null);
      setAdjacentGeoJson(null);
      setError(null);

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

      const adjacentPromises = (selectedItem.adjacents || []).map(adj => getPolys(geoJsonUrl, queryField, adj.name));

      try {
        const mainGeoJsonPromise = cache.current[name] 
          ? Promise.resolve(cache.current[name]) 
          : getPolys(geoJsonUrl, queryField, name);

        const [mainData, ...adjacentResponses] = await Promise.all([mainGeoJsonPromise, ...adjacentPromises]);

        if (mainData.error || !mainData.features || mainData.features.length === 0) {
          const errorMessage = mainData.error ? JSON.stringify(mainData.error) : "No polygon data found for the selected item.";
          if (!isCancelled) {
            setError(errorMessage);
          }
          return;
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
          setError("Failed to fetch polygon data. Please check the console for details.");
          // Ensure state is cleared on error
          setGeoJson(null);
          setAdjacentGeoJson(null);
        }
      }
    };
    fetchPolygons();
  }, [selectedItem, geoJsonUrl, nameProperty, sites]);

  return (
    <BaseMap key={mapKey} style={{ height, width: '100%' }}>
      {error && (
        <div style={{ position: 'absolute', top: '10px', left: '50px', zIndex: 1000, backgroundColor: 'white', padding: '10px', borderRadius: '5px', border: '1px solid red' }}>
          <p style={{ color: 'red', margin: 0 }}>{error}</p>
        </div>
      )}
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
        <SiteMapMarker key={site.referenceNumber} site={site} withColorKeys={false} />
      ))}
    </BaseMap>
  );
};

export default PolygonMap;