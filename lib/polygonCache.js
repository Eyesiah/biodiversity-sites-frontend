import { useRef, useState, useCallback } from 'react';

/**
 * Shared polygon cache hook using useRef pattern with cacheVersion for triggering re-renders.
 * This maintains the original SiteMap behavior while providing reusable cache logic.
 * 
 * @returns {Object} - Cache object, version, and update function
 */
export const usePolygonCacheRef = () => {
  const polygonCache = useRef({ lsoa: {}, lnrs: {}, nca: {}, lpa: {}, promises: {} });
  const [cacheVersion, setCacheVersion] = useState(0);
  
  const updatePolygonCache = useCallback((bodyType, cacheKey, data) => {
    polygonCache.current = {
      ...polygonCache.current,
      [bodyType]: {
        ...polygonCache.current[bodyType],
        [cacheKey]: data
      }
    };
    setCacheVersion(v => v + 1); // Trigger re-render when cache updates
  }, []);
  
  return { polygonCache, cacheVersion, updatePolygonCache };
};
