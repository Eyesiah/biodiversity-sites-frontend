export const NSIP_TYPE_LABELS = {
  'energy': 'Energy',
  'transport': 'Transport',
  'waste': 'Waste',
  'water': 'Water',
  'waste-and-water': 'Waste & Water',
  'business-and-commercial': 'Business & Commercial',
};

export const NSIP_TYPE_COLORS = {
  'energy': '#e2742f',
  'transport': '#3498db',
  'waste': '#8e44ad',
  'water': '#1abc9c',
  'waste-and-water': '#16a085',
  'business-and-commercial': '#6ac98f',
};

// Calculates a representative [lat, lng] position for a feature, for map markers and table sorting.
function getFeaturePosition(geometry) {
  if (!geometry) return null;

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return [lat, lng];
  }

  const rings = geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat()
      : null;

  if (!rings) return null;

  let sumLat = 0, sumLng = 0, count = 0;
  rings.forEach(ring => {
    ring.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
      count++;
    });
  });

  return count > 0 ? [sumLat / count, sumLng / count] : null;
}

// Flattens the raw geojson into a list of project records for the table, keeping the geometry for the map.
export function processNSIPData(geoJson, developers = {}) {
  if (!geoJson?.features) return [];

  return geoJson.features.map(feature => {
    const props = feature.properties;
    return {
      reference: props.reference,
      name: props.name,
      type: props['infrastructure-project-type'],
      typeLabel: NSIP_TYPE_LABELS[props['infrastructure-project-type']] || props['infrastructure-project-type'],
      decision: props['infrastructure-project-decision'],
      developer: developers[props.reference] || null,
      documentationUrl: props['documentation-url'] || null,
      entryDate: props['entry-date'] || null,
      startDate: props['start-date'] || null,
      endDate: props['end-date'] || null,
      geometryType: feature.geometry?.type,
      position: getFeaturePosition(feature.geometry),
      geometry: feature.geometry,
    };
  });
}
