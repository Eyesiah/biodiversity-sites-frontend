// --- Map Component ---
// This component renders the actual map.
import { MapContainer, TileLayer, Marker, Popup, LayersControl, GeoJSON, useMap } from 'react-leaflet';
import React, { useState, useRef, useEffect } from 'react';
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

const lsoaStyle = { color: '#ff7800', weight: 3, opacity: 1, fillColor: '#ff7800', fillOpacity: 0.2 };
const lnrsStyle = { color: '#4CAF50', weight: 2, opacity: 0.8 };

function MapController({ lsoa }) {
  const map = useMap();
  useEffect(() => {
    if (lsoa) {
      const layer = L.geoJSON(lsoa);
      map.fitBounds(layer.getBounds());
    }
  }, [lsoa, map]);
  return null;
}


// --- Map Component ---
const Map = ({ sites, height, hoveredSite, selectedSite, onSiteSelect }) => {
  const [activePolygons, setActivePolygons] = useState({ lsoa: null, lnrs: null });
  const polygonCache = useRef({ lsoa: {}, lnrs: {} });
  const markerRefs = useRef({});

  const fetchAndDisplayPolygons = async (site) => {
    setActivePolygons({ lsoa: null, lnrs: null });

    if (!site || !site.lsoaName || !site.lnrsName || site.lsoaName === 'N/A' || site.lnrsName === 'N/A') {
      return;
    }

    const lsoaFromCache = polygonCache.current.lsoa[site.lsoaName];
    const lnrsFromCache = polygonCache.current.lnrs[site.lnrsName];

    const fetchPromises = [];

    if (lsoaFromCache) {
      fetchPromises.push(Promise.resolve(lsoaFromCache));
    } else {
      const lsoaName = site.lsoaName.replace(/'/g, "''");
      const lsoaUrl = `https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_Dec_2011_Boundaries_Full_Clipped_BFC_EW_V3_2022/FeatureServer/0/query?where=LSOA11NM='${lsoaName}'&outFields=&returnGeometry=true&f=geojson`;
      fetchPromises.push(fetch(lsoaUrl).then(res => res.json()));
    }

    if (lnrsFromCache) {
      fetchPromises.push(Promise.resolve(lnrsFromCache));
    } else {
      const lnrsName = site.lnrsName.replace(/'/g, "''");
      const lnrsUrl = `https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/LNRS_Area/FeatureServer/0/query?where=Name='${lnrsName}'&outFields=&returnGeometry=true&f=geojson`;
      fetchPromises.push(fetch(lnrsUrl).then(res => res.json()));
    }

    try {
      const [lsoaGeoJson, lnrsGeoJson] = await Promise.all(fetchPromises);

      if (!lsoaFromCache) polygonCache.current.lsoa[site.lsoaName] = lsoaGeoJson;
      if (!lnrsFromCache) polygonCache.current.lnrs[site.lnrsName] = lnrsGeoJson;

      setActivePolygons({ lsoa: lsoaGeoJson, lnrs: lnrsGeoJson });
    } catch (error) {
      console.error("Failed to fetch polygon data:", error);
      setActivePolygons({ lsoa: null, lnrs: null });
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
    setActivePolygons({ lsoa: null, lnrs: null });
    onSiteSelect(null);
  };

  if (!sites || sites.length === 0) {
    return <p>No sites with location data available to display on the map.</p>;
  }

  return (
    <MapContainer center={[52.8, -1.5]} zoom={6.5} style={{ height: height || 'calc(100vh - 80px)', width: '100%' }}>
      <MapController lsoa={activePolygons.lsoa} />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer  name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {activePolygons.lnrs && <GeoJSON data={activePolygons.lnrs} style={lnrsStyle} />}
      {activePolygons.lsoa && <GeoJSON data={activePolygons.lsoa} style={lsoaStyle} />}

      {sites.filter(site => site.position != null).map(site => {
        const isHovered = site.referenceNumber == hoveredSite?.referenceNumber;
        return (
          <Marker 
            key={site.referenceNumber} 
            position={site.position} 
            icon={isHovered ? highlightedSiteIcon : defaultSiteIcon} 
            zIndexOffset={isHovered ? 1000 : 0}
            ref={el => markerRefs.current[site.referenceNumber] = el}
            eventHandlers={{
              click: () => onSiteSelect(site),
              popupclose: handlePopupClose,
            }}
          >
            <Popup>
              <h2><Link href={`/sites/${site.referenceNumber}`}>
                {site.referenceNumber}
              </Link></h2>
              <b>Responsible Body:</b> {site.summary.responsibleBody}<br />
              <b>LPA:</b> {site.summary.lpaName}<br />
              <b>NCA:</b> {site.summary.ncaName}<br />
              <b>LNRS:</b> {site.lnrsName || 'N/A'}
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                marginLeft: '8px',
                backgroundColor: lnrsStyle.color,
                border: '1px solid #555'
              }}></span><br />
              <b>LSOA:</b> {site.lsoaName || 'N/A'}
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                marginLeft: '8px',
                backgroundColor: lsoaStyle.color,
                border: '1px solid #555'
              }}></span><br />              
              <b>Allocations:</b> {site.summary.allocationsCount}<br />
              <b>Total Size:</b> {formatNumber(site.summary.totalSize)} ha<br />
              <br />
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  );
};

export default Map;