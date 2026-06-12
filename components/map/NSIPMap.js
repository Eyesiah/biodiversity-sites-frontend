import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap } from '@/components/map/BaseMap';
import { NSIP_TYPE_COLORS } from '@/lib/nsip-data';

const DEFAULT_COLOR = '#7f8c8d';

const NSIPMap = ({ projects, highlightedReference = null }) => {
  const geoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: (projects || [])
      .filter(p => p.geometry)
      .map(p => ({
        type: 'Feature',
        properties: {
          reference: p.reference,
          name: p.name,
          typeLabel: p.typeLabel,
          decision: p.decision,
          documentationUrl: p.documentationUrl,
        },
        geometry: p.geometry,
      }))
  }), [projects]);

  const styleFeature = (feature) => {
    const color = NSIP_TYPE_COLORS[feature.properties.type] || DEFAULT_COLOR;
    const isHighlighted = highlightedReference && feature.properties.reference === highlightedReference;
    return {
      color,
      weight: isHighlighted ? 4 : 2,
      opacity: 1,
      fillOpacity: 0.2,
    };
  };

  const pointToLayer = (feature, latlng) => {
    const color = NSIP_TYPE_COLORS[feature.properties.type] || DEFAULT_COLOR;
    const isHighlighted = highlightedReference && feature.properties.reference === highlightedReference;
    return L.circleMarker(latlng, {
      radius: isHighlighted ? 8 : 5,
      color,
      weight: 2,
      opacity: 1,
      fillColor: color,
      fillOpacity: 0.6,
    });
  };

  const onEachFeature = (feature, layer) => {
    const { name, reference, typeLabel, decision, documentationUrl } = feature.properties;
    const link = documentationUrl
      ? `<br /><a href="${documentationUrl}" target="_blank" rel="noopener noreferrer">View project page</a>`
      : '';
    layer.bindPopup(
      `<b>${name}</b><br />` +
      `<b>Reference:</b> ${reference}<br />` +
      `<b>Type:</b> ${typeLabel}<br />` +
      `<b>Status:</b> ${decision}` +
      link
    );
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: '100%', width: '100%' }}>
        <GeoJSON
          key={highlightedReference || 'all'}
          data={geoJson}
          style={styleFeature}
          pointToLayer={pointToLayer}
          onEachFeature={onEachFeature}
        />
      </BaseMap>
    </div>
  );
};

export default NSIPMap;
