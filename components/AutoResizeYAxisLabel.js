import { useEffect, useState } from 'react';
import { Text } from 'recharts';

/**
 * A cached canvas context for measuring text widths.
 * This avoids creating a new canvas for every label.
 */
let canvasContext;
function getTextWidth(text, font) {
  if (!canvasContext) {
    const canvas = document.createElement('canvas');
    canvasContext = canvas.getContext('2d');
  }
  canvasContext.font = font;
  return canvasContext.measureText(text).width;
}

const ELLIPSIS = '...';
const FONT_STYLE = '0.9rem sans-serif'; // Must match the font in the Text component

export const AutoResizeYAxisLabel = (props) => {
  const { x, y, payload, width } = props;
  const [displayText, setDisplayText] = useState(payload.value);

  useEffect(() => {
    const originalText = payload.value;
    if (!originalText) return;

    const textWidth = getTextWidth(originalText, FONT_STYLE);

    if (textWidth > width) {
      // Text is too long, so we need to truncate it.
      const avgCharWidth = textWidth / originalText.length;
      // Estimate the number of characters that can fit, with a buffer for the ellipsis.
      let estimatedChars = Math.floor(width / avgCharWidth) - ELLIPSIS.length;
      let truncated = originalText.substring(0, estimatedChars);

      // Iteratively remove characters until the text with ellipsis fits.
      while (truncated.length > 0) {
        const truncatedWidth = getTextWidth(`${truncated}${ELLIPSIS}`, FONT_STYLE);
        if (truncatedWidth <= width) break;
        truncated = truncated.slice(0, -1);
      }
      setDisplayText(`${truncated}${ELLIPSIS}`);
    } else {
      // Text fits, so display it as is.
      setDisplayText(originalText);
    }
  }, [payload.value, width]);

  return (
    <g transform={`translate(${x},${y})`}>
      <Text x={0} y={0} dy={0} textAnchor="end" verticalAnchor="middle" fill="#594c4cff" fontSize="0.9rem" fontFamily="sans-serif">
        {displayText}
      </Text>
    </g>
  );
};