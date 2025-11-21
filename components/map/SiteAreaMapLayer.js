import { Circle, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';

function SiteAreaMapLayer({ site }) {
  const map = useMap();

  const siteAreaCircle = useMemo(() => {
    if (site && site.siteSize && site.position) {
      const radius = Math.sqrt((site.siteSize * 10000) / Math.PI);
      const center = site?.position;
      return { radius, center };
    }
    return null;
  }, [site]);

  useEffect(() => {
    const circleBounds = siteAreaCircle.radius ? L.latLng(siteAreaCircle.center).toBounds(siteAreaCircle.radius) : null;
    if (circleBounds) {
      map.fitBounds(circleBounds, { padding: [150, 150] });
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
