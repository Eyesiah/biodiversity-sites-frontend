import { GeoJSON } from 'react-leaflet';
import React, { useEffect, useState } from 'react';
import { getPolys } from '@/components/map/BaseMap';
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL, ARCGIS_LSOA_NAME_FIELD } from '@/config';
import { lsoaStyle, lnrsStyle, ncaStyle, lpaStyle } from '@/components/map/MapStyles'
import L from 'leaflet';

// Bounds calculation function for GeoJSON data
export function CalcBodyMapLayerBounds(geoJson) {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    return null;
  }

  const bounds = L.latLngBounds([]);

  // Iterate through all features and their coordinates
  geoJson.features.forEach(feature => {
    if (feature.geometry && feature.geometry.coordinates) {
      const coordinates = feature.geometry.coordinates;

      // Handle different geometry types
      if (feature.geometry.type === 'Polygon') {
        // For polygons, coordinates is an array of linear rings
        coordinates.forEach(linearRing => {
          linearRing.forEach(coord => {
            bounds.extend([coord[1], coord[0]]); // GeoJSON is [lng, lat], Leaflet expects [lat, lng]
          });
        });
      } else if (feature.geometry.type === 'MultiPolygon') {
        // For multipolygons, coordinates is an array of polygons
        coordinates.forEach(polygon => {
          polygon.forEach(linearRing => {
            linearRing.forEach(coord => {
              bounds.extend([coord[1], coord[0]]);
            });
          });
        });
      }
    }
  });

  return bounds.isValid() ? bounds : null;
}

// Body type configurations
const BODY_CONFIGS = {
  lpa: {
    url: ARCGIS_LPA_URL,
    field: 'LPA23NM',
    style: lpaStyle
  },
  nca: {
    url: ARCGIS_NCA_URL,
    field: 'NCA_Name',
    style: ncaStyle
  },
  lnrs: {
    url: ARCGIS_LNRS_URL,
    field: 'Name',
    style: lnrsStyle
  },
  lsoa: {
    url: ARCGIS_LSOA_URL,
    field: ARCGIS_LSOA_NAME_FIELD,
    style: lsoaStyle
  }
};

function BodyMapLayer({ bodyType, bodyName, enabled, polygonCache, updatePolygonCache }) {
  const [geoJson, setGeoJson] = useState(null);

  const config = BODY_CONFIGS[bodyType];

  useEffect(() => {
    let isMounted = true;
    const fetchKey = `${bodyType}:${bodyName}`;

    if (!bodyName || !config) {
      if (isMounted) setGeoJson(null);
      return;
    }

    const fetchPolygon = async () => {
      const cacheKey = bodyName;

      // Check cache first
      const cached = polygonCache.current[bodyType]?.[cacheKey];
      if (cached) {
        if (isMounted) setGeoJson(cached);
        return;
      }

      // Fetch if not cached
      try {
        // use the existing fetch if there's one already in progress
        let fetchPromise = polygonCache.current.promises[cacheKey];
        if (fetchPromise == null) {
          fetchPromise = getPolys(config.url, config.field, bodyName);
          polygonCache.current.promises[fetchKey] = fetchPromise;
        }
        const data = await fetchPromise;
        if (data && isMounted) {
          // Update cache using the provided function
          updatePolygonCache(bodyType, cacheKey, data);
          setGeoJson(data);
        }
      } catch (error) {
        console.error(`Failed to fetch ${bodyType} polygon data:`, error);
        if (isMounted) setGeoJson(null);
      } finally {
        // Mark fetch as completed
        if (polygonCache.current.promises[fetchKey]) {
          delete polygonCache.current.promises[fetchKey];
        }
      }
    };

    fetchPolygon();

    return () => {
      isMounted = false;
    };
  }, [bodyName, bodyType, config, polygonCache, updatePolygonCache]);

  if (!enabled || !geoJson) {
    return null;
  }

  return <GeoJSON data={geoJson} style={config.style} />;
}

export default BodyMapLayer;
