import React from 'react';

const KeyItem = ({ color, label, fillOpacity = 1 }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
    <span
      style={{
        backgroundColor: color,
        opacity: fillOpacity,
        width: '20px',
        height: '20px',
        marginRight: '8px',
        border: '1px solid #555',
      }}
    ></span>
    <span>{label}</span>
  </div>
);

const MapKey = ({ keys }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '0.25rem', backgroundColor: '#F9F6EE', borderRadius: '2px', marginTop: '0.25rem' }}>
      {keys.map(keyItem => (
        <KeyItem key={keyItem.label} color={keyItem.color} label={keyItem.label} fillOpacity={keyItem.fillOpacity} />
      ))}
    </div>
  );
};

export default MapKey;