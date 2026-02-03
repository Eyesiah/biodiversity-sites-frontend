// Client-side utility functions for tree count calculations
import { formatNumber } from './format';

// Helper function to calculate tree count from area
export const calculateTreeCount = (area) => {
  if (area <= 0) return 0;
  return Math.max(1, Math.round(area / 0.0041));
};

// Helper function to format area with tree count for tree habitats
export const formatAreaWithTreeCount = (area, module) => {
  const formattedArea = formatNumber(area);
  if (module === 'trees' && area > 0) {
    const treeCount = calculateTreeCount(area);
    const formattedTreeCount = formatNumber(treeCount, 0); // Use formatNumber for comma separation
    const treeWord = treeCount === 1 ? 'Small tree' : 'Small trees';
    return {
      isTreeCount: true,
      area: formattedArea,
      treeCount: formattedTreeCount,
      treeWord: treeWord,
      fullString: `${formattedArea} (${formattedTreeCount} ${treeWord})`
    };
  }
  return formattedArea;
};

// Helper function to format tree count with tooltip data for new display format
export const formatTreeCountWithTooltipData = (area) => {
  const treeCount = calculateTreeCount(area);
  const displayArea = formatNumber(treeCount * 0.0041, 2) + ' ha';
  const display = formatNumber(treeCount, 0) + (treeCount === 1 ? ' tree' : ' trees');
  const tooltipText = `<b>Habitat area</b>: ${displayArea}. The tree count assumes that each tree is a BNG Small category tree with a habitat area of 0.0041 ha. This includes baseline trees, even though not all baseline trees may be a BNG Small category tree.`;
  return { display, tooltipText };
};
