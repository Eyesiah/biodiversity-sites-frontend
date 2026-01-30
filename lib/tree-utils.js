// Client-side utility functions for tree count calculations
import { formatNumber } from './format';

// Helper function to calculate tree count from area
export const calculateTreeCount = (area) => {
  if (area <= 0) return 0;
  return Math.max(1, Math.floor(area / 0.0041));
};

// Helper function to format area with tree count for tree habitats
export const formatAreaWithTreeCount = (area, module) => {
  const formattedArea = formatNumber(area);
  if (module === 'trees' && area > 0) {
    const treeCount = calculateTreeCount(area);
    const formattedTreeCount = formatNumber(treeCount, 0); // Use formatNumber for comma separation
    const treeWord = treeCount === 1 ? 'Small tree' : 'Small trees';
    return `${formattedArea} (${formattedTreeCount} ${treeWord})`;
  }
  return formattedArea;
};
