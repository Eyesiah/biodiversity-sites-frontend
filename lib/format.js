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

/**
 * Converts a string into a URL-friendly "slug".
 * @param {string} text The text to slugify.
 * @returns {string} The slugified text.
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')      // Replace spaces with -
    .replace(/[^\w\-]+/g, '')  // Remove all non-word chars
    .replace(/\-\-+/g, '-')    // Replace multiple - with single -
    .replace(/^-+/, '')        // Trim - from start of text
    .replace(/-+$/, '');       // Trim - from end of text
}


// This function will be used to normalize names for both counting and matching
export const normalizeBodyName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/(\b(county|borough|district|city|metropolitan)\b\s)?council/g, '')
    .replace(/\blpa\b/g, '')
    .replace(/(\bcombined\b\s)?authority/g, '')
    .replace(/(\bwildlife\b\s)?trust/g, '')
    .replace(/limited|ltd/g, '')
    .replace(/\s+/g, ' ').trim();
};

export const calcMedian = (data, property) => {

  const sortedData = data
    .map(d => d[property])
    .filter(d => typeof d === 'number')
    .sort((a, b) => a - b);

  let median = null;
  if (sortedData.length > 0) {
    const mid = Math.floor(sortedData.length / 2);
    if (sortedData.length % 2 === 0) {
      median = (sortedData[mid - 1] + sortedData[mid]) / 2;
    } else {
      median = sortedData[mid];
    }
  }

  return median;
}