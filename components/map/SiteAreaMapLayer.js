import { Circle } from 'react-leaflet';

function SiteAreaMapLayer({ center, radius }) {
  if (!center || !radius) {
    return null;
  }

  return (
    <Circle
      center={center}
      radius={radius}
      pathOptions={{ color: 'white', weight: 2, fill: false, dashArray: '5, 5' }}
    />
  );
}

export default SiteAreaMapLayer;
