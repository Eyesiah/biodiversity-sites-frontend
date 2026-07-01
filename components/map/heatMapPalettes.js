// Colour palettes for RegionAllocationHeatMap, kept in a separate Leaflet-free module so
// callers can statically import a palette without pulling react-leaflet into their main bundle
// (RegionAllocationHeatMap.js itself is always loaded via next/dynamic with ssr: false).
export const GREEN_PALETTE = { heatFrom: { r: 204, g: 238, b: 222 }, heatTo: { r: 27, g: 94, b: 32 }, accentColor: '#1b5e20' };
export const YELLOW_PALETTE = { heatFrom: { r: 255, g: 249, b: 196 }, heatTo: { r: 191, g: 144, b: 0 }, accentColor: '#8a6d00' };
export const BLUE_PALETTE = { heatFrom: { r: 209, g: 228, b: 248 }, heatTo: { r: 13, g: 71, b: 161 }, accentColor: '#0d47a1' };
export const ORANGE_PALETTE = { heatFrom: { r: 255, g: 224, b: 178 }, heatTo: { r: 191, g: 54, b: 12 }, accentColor: '#bf360c' };
