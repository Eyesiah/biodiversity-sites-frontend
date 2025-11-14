import { GeoJSON } from 'react-leaflet';
import React, { useEffect, useState } from 'react';
import { getPolys } from '@/components/map/BaseMap';
import { ARCGIS_LSOA_URL, ARCGIS_LNRS_URL, ARCGIS_NCA_URL, ARCGIS_LPA_URL, ARCGIS_LSOA_NAME_FIELD } from '@/config';

// Body type configurations
const BODY_CONFIGS = {
  lpa: {
    url: ARCGIS_LPA_URL,
    field: 'LPA23NM',
    style: {
      color: '#3388ff',
      weight: 2,
      opacity: 1,
      fillColor: '#3388ff',
      fillOpacity: 0.1
    }
  },
  nca: {
    url: ARCGIS_NCA_URL,
    field: 'NCA_Name',
    style: {
      color: '#ff6b35',
      weight: 2,
      opacity: 1,
      fillColor: '#ff6b35',
      fillOpacity: 0.1
    }
  },
  lnrs: {
    url: ARCGIS_LNRS_URL,
    field: 'Name',
    style: {
      color: '#4CAF50',
      weight: 2,
      opacity: 1,
      fillColor: '#4CAF50',
      fillOpacity: 0.1
    }
  },
  lsoa: {
    url: ARCGIS_LSOA_URL,
    field: ARCGIS_LSOA_NAME_FIELD,
    style: {
      color: '#9C27B0',
      weight: 2,
      opacity: 1,
      fillColor: '#9C27B0',
      fillOpacity: 0.1
    }
  }
};

function BodyMapLayer({ bodyType, bodyName, enabled, polygonCache }) {
  const [geoJson, setGeoJson] = useState(null);

  const config = BODY_CONFIGS[bodyType];

  useEffect(() => {
    if (!enabled || !bodyName || !config) {
      setGeoJson(null);
      return;
    }

    const fetchPolygon = async () => {
      const cacheKey = bodyName;

      // Check cache first
      const cached = polygonCache.current[bodyType]?.[cacheKey];
      if (cached) {
        setGeoJson(cached);
        return;
      }

      // Fetch if not cached
      try {
        const data = await getPolys(config.url, config.field, bodyName);
        if (data) {
          // Update cache
          if (!polygonCache.current[bodyType]) {
            polygonCache.current[bodyType] = {};
          }
          polygonCache.current[bodyType][cacheKey] = data;
          setGeoJson(data);
        }
      } catch (error) {
        console.error(`Failed to fetch ${bodyType} polygon data:`, error);
        setGeoJson(null);
      }
    };

    fetchPolygon();
  }, [enabled, bodyName, bodyType, config, polygonCache]);

  if (!enabled || !geoJson) {
    return null;
  }

  return <GeoJSON data={geoJson} style={config.style} />;
}

export default BodyMapLayer;
