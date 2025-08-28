import React from 'react';

export const DEFAULT_NUMERIC_DECIMAL_PLACES = 2;

const Numeric = ({ value, decimals = DEFAULT_NUMERIC_DECIMAL_PLACES }) => {
  const formattedValue = (typeof value === 'number') 
    ? value.toFixed(decimals) 
    : 'N/A';
  
  return <>{formattedValue}</>;
};

export default Numeric;