// --- Map Component ---
// This component renders the actual map.
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import React from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { formatNumber } from '../lib/format';

const defaultSiteIcon = new L.Icon({
    iconUrl: '/icons/greenMarker.svg',
    iconRetinaUrl: '/icons/greenMarker.svg',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const highlightedSiteIcon = new L.Icon({
    iconUrl: '/icons/blueMarker.svg',
    iconRetinaUrl: '/icons/blueMarker.svg',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// --- Map Component ---
const Map = ({ sites, height, hoveredSite }) => {
  if (!sites || sites.length === 0) {
    return <p>No sites with location data available to display on the map.</p>;
  }

  return (
    <MapContainer center={[52.8, -1.5]} zoom={6.5} style={{ height: height || 'calc(100vh - 80px)', width: '100%' }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      {sites.filter(site => site.position != null).map(site => (
        <Marker key={site.referenceNumber} position={site.position} icon={site.referenceNumber == hoveredSite?.referenceNumber ? highlightedSiteIcon : defaultSiteIcon} zIndexOffset={site.referenceNumber == hoveredSite?.referenceNumber ? 1000 : 0}>
          <Popup>
            <h2><Link href={`/sites/${site.referenceNumber}`}>
              {site.referenceNumber}
            </Link></h2>
            <b>Responsible Body:</b> {site.summary.responsibleBody}<br />
            <b>LPA:</b> {site.summary.lpaName}<br />
            <b>NCA:</b> {site.summary.ncaName}<br />
            <b>Allocations:</b> {site.summary.allocationsCount}<br />
            <b>Total Size:</b> {formatNumber(site.summary.totalSize)} ha<br />
            <br />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;

