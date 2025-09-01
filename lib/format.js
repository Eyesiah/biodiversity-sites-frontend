/**
 * Formats a number with comma separators for thousands and a fixed number of decimal places.
 * @param {number} num The number to format.
 * @param {number} [decimalPlaces=2] The number of decimal places to show.
 * @returns {string} The formatted number as a string.
 */
export function formatNumber(num, decimalPlaces = 2) {
  if (typeof num !== 'number' || isNaN(num)) {
    return (0).toFixed(decimalPlaces);
  }
  return num.toLocaleString('en-GB', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}