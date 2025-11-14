import { Polyline } from 'react-leaflet/Polyline';
import { Tooltip } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';

function AllocationMapLayer({ allocations, sitePosition }) {
  const map = useMap();
  const [paneReady, setPaneReady] = useState(false);

  useEffect(() => {
    if (map && !map.getPane('polyline-pane')) {
      const pane = map.createPane('polyline-pane');
      pane.style.zIndex = 450;
      setPaneReady(true);
    }
  }, [map]);


  if (!allocations || !sitePosition || !paneReady) {
    return null;
  }

  return (
    allocations
      .filter(alloc => alloc.coords)
      .map((alloc, index) => (
        <Polyline
          key={index}
          pane="polyline-pane"
          positions={[sitePosition, [alloc.coords.latitude, alloc.coords.longitude]]}
          pathOptions={{ color: '#0d6efd', weight: 3 }}
          eventHandlers={{
            mouseover: (e) => e.target.setStyle({ color: '#ffc107', weight: 5 }),
            mouseout: (e) => e.target.setStyle({ color: '#0d6efd', weight: 3 }),
          }}
        >
          <Tooltip>
            <div><strong>{alloc.projectName || 'N/A'}</strong></div>
            <div>Planning Ref: {alloc.planningReference}</div>
            <div>LPA: {alloc.localPlanningAuthority}</div>
            <div>Distance: {typeof alloc.distance === 'number' ? `${alloc.distance.toFixed(2)} km (${`${alloc.sr.cat}${alloc.sr.cat != 'Outside' ? ` (${alloc.sr.from})` : ''}`})` : 'N/A'}</div>
          </Tooltip>
        </Polyline>
      )));
}

export default AllocationMapLayer;
