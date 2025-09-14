
import { Marker, Popup, MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { formatNumber } from 'lib/format';

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

export const lsoaStyle = { color: '#f1c40f', weight: 3, opacity: 1, fillColor: '#f1c40f', fillOpacity: 0.2 };
export const lnrsStyle = { color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.2 };
export const ncaStyle = { color: '#8e44ad', weight: 2, opacity: 0.8, fillOpacity: 0.2 };
export const lpaStyle = { color: '#282c34', weight: 2, opacity: 0.8, fillColor: '#282c34', fillOpacity: 0.3 };
export const adjacentStyle = { color: '#FFC0CB', weight: 1, opacity: 0.7, fillOpacity: 0.5 }; // Pink

export const BaseMap = ({ children, ...props }) => {
  return (
    <MapContainer {...props}>
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
      {children}
    </MapContainer>
  );
};

const ColorKey = ({color}) => {
  return (
  <span style={{
    display: 'inline-block',
    width: '12px',
    height: '12px',
    marginLeft: '5px',
    backgroundColor: color,
    border: '1px solid #555'
  }}>
  </span>
  )
}

export const SiteMapMarker = ({site, withColorKeys=false, isHovered=false, handlePopupClose=null, markerRefs, onSiteSelect=null}) => {
  return (
    <Marker 
      key={site.referenceNumber} 
      position={site.position} 
      icon={isHovered ? highlightedSiteIcon : defaultSiteIcon} 
      zIndexOffset={isHovered ? 1000 : 0}
      ref={el => {if (markerRefs) markerRefs.current[site.referenceNumber] = el}}
      eventHandlers={{
        click: () => {if (onSiteSelect) onSiteSelect(site)},
        popupclose: handlePopupClose,
      }}
    >
      <Popup>
        <h2><Link href={`/sites/${site.referenceNumber}`}>{site.referenceNumber}</Link></h2>
        <b>Responsible Body:</b> {site.summary?.responsibleBody ?? site.responsibleBody}<br />
        <b>LPA:</b> {site.lpaName || 'N/A'}
        {withColorKeys && site.lpaName && site.lpaName != 'N/A' && <ColorKey color={lpaStyle.color}/>}
        <br />
        <b>NCA:</b> {site.ncaName || 'N/A'}
        {withColorKeys && site.ncaName && site.ncaName != 'N/A' && <ColorKey color={ncaStyle.color}/>}
        <br />
        <b>LNRS:</b> {site.lnrsName || 'N/A'}
        {withColorKeys && site.lnrsName && site.lnrsName != 'N/A' &&  <ColorKey color={lnrsStyle.color}/>}
        <br />
        <b>LSOA IMD Decile:</b> {site.imdDecile || 'N/A'}
        {withColorKeys && site.imdDecile && site.imdDecile != 'N/A' && <ColorKey color={lsoaStyle.color}/>}
        <br />              
        <b>Allocations:</b> {site.summary?.allocationsCount ?? site.allocationsCount}<br />
        <b>Total Size:</b> {formatNumber(site.summary?.totalSize ?? site.totalSize)} ha<br />
        <br />
      </Popup>
    </Marker>
  )
}
