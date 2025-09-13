import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const lnrsStyle = { color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.2 };

function MapController({ geoJson }) {
  const map = useMap();
  useEffect(() => {
    if (geoJson && geoJson.features && geoJson.features.length > 0) {
      const layer = L.geoJSON(geoJson);
      map.fitBounds(layer.getBounds());
    }
  }, [geoJson, map]);
  return null;
}

const PolygonMap = ({ selectedItem, geoJsonUrl, nameProperty, height = '85vh' }) => {
  const [geoJson, setGeoJson] = useState(null);
  const cache = useRef({});
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    const fetchPolygon = async () => {
      if (!selectedItem || !selectedItem[nameProperty]) {
        setGeoJson(null);
        return;
      }

      const name = selectedItem[nameProperty];
      if (cache.current[name]) {
        setGeoJson(cache.current[name]);
        setMapKey(name); // Force re-render with a new key
        return;
      }

      const url = `${geoJsonUrl}?where=${nameProperty}='${name.replace(/'/g, "''")}'&outFields=*&returnGeometry=true&f=geojson`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error || !data.features) {
          console.error("Invalid GeoJSON response:", data);
          setGeoJson(null);
          return;
        }
        cache.current[name] = data;
        setGeoJson(data);
        setMapKey(name); // Force re-render with a new key
      } catch (error) {
        console.error("Failed to fetch polygon data:", error);
        setGeoJson(null);
      }
    };

    fetchPolygon();
  }, [selectedItem, geoJsonUrl, nameProperty]);

  return (
    <MapContainer key={mapKey} center={[52.8, -1.5]} zoom={6.5} style={{ height, width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {geoJson && <GeoJSON data={geoJson} style={lnrsStyle} />}
      <MapController geoJson={geoJson} />
    </MapContainer>
  );
};

export default PolygonMap;