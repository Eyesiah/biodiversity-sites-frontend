import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { BaseMap } from '@/components/map/BaseMap';
import { NSIP_TYPE_COLORS } from '@/lib/nsip-data';

const DEFAULT_COLOR = '#7f8c8d';
const HIGHLIGHT_COLOR = '#ff0000';

// Converts a register CSV date (YYYY-MM-DD) to DD/MM/YYYY for display.
const formatDate = (date) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

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
          type: p.type,
          typeLabel: p.typeLabel,
          documentationUrl: p.documentationUrl,
          location: p.location,
          description: p.description,
          dateOfApplication: p.dateOfApplication,
          dateOfDecision: p.dateOfDecision,
        },
        geometry: p.geometry,
      }))
  }), [projects]);

  const styleFeature = (feature) => {
    const isHighlighted = highlightedReference && feature.properties.reference === highlightedReference;
    const color = isHighlighted ? HIGHLIGHT_COLOR : (NSIP_TYPE_COLORS[feature.properties.type] || DEFAULT_COLOR);
    return {
      color,
      weight: isHighlighted ? 4 : 2,
      opacity: 1,
      fillOpacity: isHighlighted ? 0.5 : 0.2,
    };
  };

  const pointToLayer = (feature, latlng) => {
    const isHighlighted = highlightedReference && feature.properties.reference === highlightedReference;
    const color = isHighlighted ? HIGHLIGHT_COLOR : (NSIP_TYPE_COLORS[feature.properties.type] || DEFAULT_COLOR);
    return L.circleMarker(latlng, {
      radius: isHighlighted ? 9 : 5,
      color,
      weight: isHighlighted ? 3 : 2,
      opacity: 1,
      fillColor: color,
      fillOpacity: isHighlighted ? 0.9 : 0.6,
    });
  };

  const onEachFeature = (feature, layer) => {
    const { name, reference, typeLabel, documentationUrl, location, description, dateOfApplication, dateOfDecision } = feature.properties;
    const locationLine = location ? `<br /><b>Location:</b> ${location}` : '';
    const dateOfApplicationLine = dateOfApplication ? `<br /><b>Date of application:</b> ${formatDate(dateOfApplication)}` : '';
    const dateOfDecisionLine = dateOfDecision ? `<br /><b>Date of decision:</b> ${formatDate(dateOfDecision)}` : '';
    const descriptionLine = description
      ? `<br />${description.length > 400 ? `${description.slice(0, 400)}…` : description}`
      : '';
    const link = documentationUrl
      ? `<br /><a href="${documentationUrl}" target="_blank" rel="noopener noreferrer">View project page</a>`
      : '';
    layer.bindPopup(
      `<b>${name}</b><br />` +
      `<b>Reference:</b> ${reference}<br />` +
      `<b>Type:</b> ${typeLabel}` +
      locationLine +
      dateOfApplicationLine +
      dateOfDecisionLine +
      descriptionLine +
      link,
      { maxWidth: 350 }
    );
  };

  const geoJsonKey = useMemo(
    () => `${geoJson.features.map(f => f.properties.reference).join(',')}|${highlightedReference || ''}`,
    [geoJson, highlightedReference]
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <BaseMap style={{ height: '100%', width: '100%' }}>
        <GeoJSON
          key={geoJsonKey}
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
