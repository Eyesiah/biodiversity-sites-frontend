import { Marker, Popup, MapContainer, TileLayer, LayersControl, ScaleControl, LayerGroup } from 'react-leaflet';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { formatNumber } from '@/lib/format';
import { lsoaStyle, lnrsStyle, ncaStyle, lpaStyle } from '@/components/map/MapStyles'
import L from 'leaflet';

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

export async function getPolys(geoJsonUrl, queryField, value) {
  const encodedValue = encodeURIComponent(value.replace(/'/g, "''"));
  const url = `${geoJsonUrl}?where=${queryField}='${encodedValue}'&outFields=*&returnGeometry=true&f=geojson`;
  const res = await fetch(url, { next: { revalidate: 21600 } })
  return await res.json();
}

export const BaseMap = ({ children, defaultBaseLayer, ...props }) => {
  return (
    <MapContainer center={[52.9522, -2.0153]} zoom={6.75} zoomSnap={0.05} {...props}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked={defaultBaseLayer === 'OpenStreetMap' || !defaultBaseLayer} name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={defaultBaseLayer === 'Satellite'} name="Satellite">
          <LayerGroup>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=""
            />
          </LayerGroup>
        </LayersControl.BaseLayer>
      </LayersControl>
      <ScaleControl position="topleft" imperial={false} />
      {children}
    </MapContainer>
  );
};

const ColorKey = ({ color }) => {
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

export const SiteMapMarker = ({ site, withColorKeys = false, isHovered = false, handlePopupClose = null, markerRefs, onSiteSelect = null }) => {
  const imdDecile = site.imdDecile ?? site.lsoa?.IMDDecile;
  return (
    <Marker
      key={site.referenceNumber}
      position={site.position}
      icon={isHovered ? highlightedSiteIcon : defaultSiteIcon}
      zIndexOffset={isHovered ? 1000 : 0}
      ref={el => { if (markerRefs) markerRefs.current[site.referenceNumber] = el }}
      eventHandlers={{
        click: () => { if (onSiteSelect) onSiteSelect(site) },
        popupclose: () => { if (handlePopupClose) handlePopupClose(site) },
      }}
      autoPan={false}
    >
      <Popup autoPan={false}>
        <h2><Link href={`/sites/${site.referenceNumber}`}>{site.referenceNumber}</Link></h2>
        {site.name && <><b>{site.name}</b><br /></>}
        <b>Responsible Body:</b> {site.responsibleBody}<br />
        <b>LPA:</b> {site.lpaName || 'N/A'}
        {withColorKeys && site.lpaName && site.lpaName != 'N/A' && <ColorKey color={lpaStyle.color} />}
        <br />
        <b>NCA:</b> {site.ncaName || 'N/A'}
        {withColorKeys && site.ncaName && site.ncaName != 'N/A' && <ColorKey color={ncaStyle.color} />}
        <br />
        <b>LNRS:</b> {site.lnrsName || 'N/A'}
        {withColorKeys && site.lnrsName && site.lnrsName != 'N/A' && <ColorKey color={lnrsStyle.color} />}
        <br />
        <b>LSOA IMD Decile:</b> {imdDecile || 'N/A'}
        {withColorKeys && imdDecile && imdDecile != 'N/A' && <ColorKey color={lsoaStyle.color} />}
        <br />
        <b>Allocations:</b> {site.allocationsCount}<br />
        <b>Total Size:</b> {formatNumber(site.siteSize)} ha<br />
        <br />
      </Popup>
    </Marker>
  )
}