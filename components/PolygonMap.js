import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup, LayersControl } from 'react-leaflet';
import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { formatNumber } from '../lib/format';

const lnrsStyle = { color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.2 };
const defaultSiteIcon = new L.Icon({
    iconUrl: '/icons/greenMarker.svg',
    iconRetinaUrl: '/icons/greenMarker.svg',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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

const PolygonMap = ({ selectedItem, geoJsonUrl, nameProperty, sites = [], height = '85vh' }) => {
  const [geoJson, setGeoJson] = useState(null);
  const cache = useRef({});
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    const fetchPolygon = async () => {
      if (!selectedItem || !selectedItem[nameProperty]) return;
      const name = selectedItem[nameProperty];
      if (cache.current[name]) {
        setGeoJson(cache.current[name]);
        setMapKey(name);
        return;
      }
      const url = `${geoJsonUrl}?where=${nameProperty}='${name.replace(/'/g, "''")}'&outFields=*&returnGeometry=true&f=geojson`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error || !data.features) throw new Error(data.error?.message || "Invalid GeoJSON response");
        setGeoJson(cache.current[name] = data);
        setMapKey(name);
      } catch (error) {
        console.error("Failed to fetch polygon data:", error);
        setGeoJson(null);
      }
    };
    fetchPolygon();
  }, [selectedItem, geoJsonUrl, nameProperty, sites]);

  return (
    <MapContainer key={mapKey} center={[52.8, -1.5]} zoom={6.5} style={{ height, width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {geoJson && <GeoJSON data={geoJson} style={lnrsStyle} />}
      <MapController geoJson={geoJson} />
      {sites.map(site => (
        site.position && <Marker key={site.referenceNumber} position={site.position} icon={defaultSiteIcon}>
          <Popup>
            <h2><Link href={`/sites/${site.referenceNumber}`}>{site.referenceNumber}</Link></h2>
            <b>Responsible Body:</b> {site.responsibleBodies.join(', ')}<br />
            <b>LPA:</b> {site.lpaName}<br />
            <b>NCA:</b> {site.ncaName}<br />
            <b>Total Size:</b> {formatNumber(site.siteSize)} ha
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default PolygonMap;