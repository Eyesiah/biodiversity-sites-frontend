import { Circle, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';

// Constants for geographic calculations
const METERS_PER_DEGREE_LATITUDE = 111320; // Approximate meters per degree of latitude
const DEGREES_TO_RADIANS = Math.PI / 180;

// Constants for pixel padding range
const PIXEL_PADDING = 50;
const PIXEL_PADDING_DIVISOR = 10;

// Constants for zoom constraints
const MAX_ZOOM_LEVEL = 200;
const MIN_ZOOM_LEVEL = 1;

function SiteAreaMapLayer({ site }) {
  const map = useMap();

  const siteAreaCircle = useMemo(() => {
    if (site && site.siteSize && site.position) {
      const radius = Math.sqrt((site.siteSize * 10000) / Math.PI); // Convert hectares to meters for radius
      const center = site?.position;
      return { radius, center };
    }
    return null;
  }, [site]);

  useEffect(() => {
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
    
    const paddingPixels = Math.max(PIXEL_PADDING, Math.min(PIXEL_PADDING, radius / PIXEL_PADDING_DIVISOR));
    
    if (bounds.isValid()) {
      map.fitBounds(bounds, { 
        padding: [paddingPixels, paddingPixels],
        maxZoom: MAX_ZOOM_LEVEL,
        minZoom: MIN_ZOOM_LEVEL
      });
    }
  }, [map, siteAreaCircle]);

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

export default SiteAreaMapLayer;
