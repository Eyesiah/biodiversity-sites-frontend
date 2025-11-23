import { Circle } from 'react-leaflet';
import { useMemo } from 'react';
import L from 'leaflet';

// Constants for geographic calculations
const METERS_PER_DEGREE_LATITUDE = 111320; // Approximate meters per degree of latitude
const DEGREES_TO_RADIANS = Math.PI / 180;

function CalcSiteAreaCircle(site) {
  if (site && site.siteSize && site.position) {
    const radius = Math.sqrt((site.siteSize * 10000) / Math.PI); // Convert hectares to meters for radius
    const center = site?.position;
    return { radius, center };
  }
  return null;
}

export function CalcSiteAreaMapLayerBounds(site) {
  const siteAreaCircle = CalcSiteAreaCircle(site);
  if (!siteAreaCircle || !siteAreaCircle.center || !siteAreaCircle.radius) return;

  // Calculate bounds that properly contain the circle
  const center = L.latLng(siteAreaCircle.center);
  const radius = siteAreaCircle.radius;

  // Create a more accurate bounding box for the circle
  // The circle extends 'radius' meters in all directions from center
  const latOffset = radius / METERS_PER_DEGREE_LATITUDE;
  const lngOffset = radius / (METERS_PER_DEGREE_LATITUDE * Math.cos(center.lat * DEGREES_TO_RADIANS));

  const bounds = L.latLngBounds([
    [center.lat - latOffset, center.lng - lngOffset],
    [center.lat + latOffset, center.lng + lngOffset]
  ]);

  return bounds;
}

export function SiteAreaMapLayer({ site }) {

  const siteAreaCircle = useMemo(() => {
    return CalcSiteAreaCircle(site);
  }, [site]);

  if (!site || !site.position || !site.siteSize) {
    return null;
  }

  return (
    <Circle
      center={siteAreaCircle.center}
      radius={siteAreaCircle.radius}
      pathOptions={{ color: 'white', weight: 2, fill: false, dashArray: '5, 5' }}
    />
  );
}

