// --- Map Component ---
// This component renders the actual map.
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import React from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { formatNumber } from '../lib/format';

// --- Custom Leaflet Icon ---
// This fixes an issue where the default icon paths are not resolved correctly in Next.js.
const customIcon = new L.Icon({
    iconUrl: '/icons/marker-icon.png',
    iconRetinaUrl: '/icons/marker-icon-2x.png',
    shadowUrl: '/icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// --- Map Component ---
const Map = ({ sites }) => {
  if (!sites || sites.length === 0) {
    return <p>No sites with location data available to display on the map.</p>;
  }

  return (
    <MapContainer center={[54.5, -2.5]} zoom={6} style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      {sites.filter(site => site.position != null).map(site => (
        <Marker key={site.referenceNumber} position={site.position} icon={customIcon}>
          <Popup>
            <h2><Link href={`/sites/${site.referenceNumber}`}>
              {site.referenceNumber}
            </Link></h2>
            <b>Responsible Body:</b> {site.summary.responsibleBody}<br />
            <b>Allocations:</b> {site.summary.allocationsCount}<br />
            <b>Total Size:</b> {formatNumber(site.summary.totalSize)} ha<br />
            <b>LPA:</b> {site.summary.lpaName}<br />
            <b>NCA:</b> {site.summary.ncaName}<br />
            <br />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;

