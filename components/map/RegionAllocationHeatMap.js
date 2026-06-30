'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Flex, Text } from '@chakra-ui/react';
import { formatNumber } from '@/lib/format';
import { GREEN_PALETTE } from '@/components/map/heatMapPalettes';

const OUTLINE_COLOR = '#ffffff';
const NO_DATA_COLOR = '#e3ded6';

// Interpolates between heatFrom and heatTo based on count / max.
const getHeatColor = (count, max, heatFrom, heatTo) => {
  if (!count || max <= 0) return NO_DATA_COLOR;
  const ratio = Math.min(count / max, 1);

  const r = Math.round(heatFrom.r + (heatTo.r - heatFrom.r) * ratio);
  const g = Math.round(heatFrom.g + (heatTo.g - heatFrom.g) * ratio);
  const b = Math.round(heatFrom.b + (heatTo.b - heatFrom.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
};

// Picks "nice" round tick values for the legend axis, e.g. [0, 50, 100, 150, 200].
const getNiceTicks = (max) => {
  if (max <= 0) return [0];
  const rawStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / magnitude) * magnitude;
  const niceMax = step * 4;
  return [0, step, step * 2, step * 3, niceMax];
};

// Fits the map view tightly to the supplied GeoJSON's bounds once it loads,
// so the map crops in on the relevant area rather than showing the default wide view.
const FitBoundsToData = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    if (!data) return;
    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [10, 10] });
    }
  }, [data, map]);

  return null;
};

const HeatLegend = ({ maxCount, heatFrom, heatTo }) => {
  const ticks = getNiceTicks(maxCount);
  const niceMax = ticks[ticks.length - 1];

  return (
    <Flex direction="column" align="center" justify="center" height="100%" width="90px" flexShrink="0">
      <Box position="relative" height="60%" width="22px" marginLeft="34px">
        <Box
          height="100%"
          width="100%"
          borderRadius="4px"
          style={{
            background: `linear-gradient(to top, ${NO_DATA_COLOR}, rgb(${heatFrom.r},${heatFrom.g},${heatFrom.b}), rgb(${heatTo.r},${heatTo.g},${heatTo.b}))`
          }}
        />
        {ticks.map(tick => (
          <Text
            key={tick}
            position="absolute"
            right="28px"
            style={{ bottom: `calc(${(tick / niceMax) * 100}% - 0.6em)` }}
            fontSize="0.85rem"
            color="gray.600"
            whiteSpace="nowrap"
          >
            {formatNumber(tick, 0)} -
          </Text>
        ))}
      </Box>
    </Flex>
  );
};

// Generic choropleth showing allocation counts per region (LNRS / LPA / NCA / etc), shaded
// from white (no data) through a configurable colour palette at the highest count, with a
// vertical legend to the left and a click-for-detail popup per region.
//
// - regionField: the key on each allocation object holding that region's name (e.g. 'lnrs', 'siteLpa', 'nca')
// - nameField: the property key on each GeoJSON feature holding the region's display name
//   (varies by ArcGIS service - e.g. 'Name' for LNRS, 'LPA23NM' for LPA, 'NCA_Name' for NCA)
// - boundaries: pre-fetched GeoJSON (preferred - fetched server-side and cached, see
//   app/(main)/bgs-bodies/page.js) to avoid a slow client-side ArcGIS round-trip on every page
//   load. If omitted, falls back to fetching fallbackFetchUrl itself.
// - specialMarkers: optional fixed-pixel-size CircleMarkers for regions too small/remote to
//   reliably see or click on the rendered choropleth (e.g. the Isles of Scilly)
// - heatFrom/heatTo/accentColor: colour palette (see GREEN_PALETTE/YELLOW_PALETTE/BLUE_PALETTE
//   exported above) - defaults to green if not supplied
const RegionAllocationHeatMap = ({
  allocations,
  regionField,
  nameField,
  boundaries: providedBoundaries = null,
  fallbackFetchUrl = null,
  specialMarkers = [],
  heatFrom = GREEN_PALETTE.heatFrom,
  heatTo = GREEN_PALETTE.heatTo,
  accentColor = GREEN_PALETTE.accentColor,
}) => {
  const [fetchedBoundaries, setFetchedBoundaries] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (providedBoundaries || !fallbackFetchUrl) return;

    let cancelled = false;

    const fetchBoundaries = async () => {
      try {
        const url = `${fallbackFetchUrl}?where=1%3D1&outFields=${nameField}&returnGeometry=true&geometryPrecision=5&f=geojson`;
        const res = await fetch(url);
        const geoJson = await res.json();
        if (!cancelled) {
          setFetchedBoundaries(geoJson);
        }
      } catch (e) {
        console.error('Failed to fetch region boundaries:', e);
        if (!cancelled) {
          setError('Failed to load region boundaries.');
        }
      }
    };

    fetchBoundaries();

    return () => {
      cancelled = true;
    };
  }, [providedBoundaries, fallbackFetchUrl, nameField]);

  const boundaries = providedBoundaries || fetchedBoundaries;

  const { regionData, maxCount, totalAllocations, totalArea, totalHedgerow, totalWatercourse } = useMemo(() => {
    const data = {};
    let total = 0;
    let area = 0;
    let hedgerow = 0;
    let watercourse = 0;

    (allocations || []).forEach(alloc => {
      area += alloc.au || 0;
      hedgerow += alloc.hu || 0;
      watercourse += alloc.wu || 0;

      const regionName = alloc[regionField];
      if (!regionName || regionName === 'N/A') return;

      if (!data[regionName]) {
        data[regionName] = { total: 0, area: 0, hedgerow: 0, watercourse: 0, bySite: {} };
      }
      const regionEntry = data[regionName];
      regionEntry.total += 1;
      regionEntry.area += alloc.au || 0;
      regionEntry.hedgerow += alloc.hu || 0;
      regionEntry.watercourse += alloc.wu || 0;
      total += 1;

      const siteKey = alloc.srn || 'Unknown';
      if (!regionEntry.bySite[siteKey]) {
        regionEntry.bySite[siteKey] = { srn: alloc.srn, siteName: alloc.siteName, count: 0 };
      }
      regionEntry.bySite[siteKey].count += 1;
    });

    const max = Math.max(0, ...Object.values(data).map(d => d.total));
    return {
      regionData: data,
      maxCount: max,
      totalAllocations: total,
      totalArea: area,
      totalHedgerow: hedgerow,
      totalWatercourse: watercourse,
    };
  }, [allocations, regionField]);

  const styleFeature = (feature) => {
    const count = regionData[feature.properties[nameField]]?.total || 0;
    return {
      color: OUTLINE_COLOR,
      weight: 1,
      opacity: 1,
      fillColor: getHeatColor(count, maxCount, heatFrom, heatTo),
      fillOpacity: 1,
    };
  };

  const getPopupHtml = (name) => {
    const entry = regionData[name];
    const count = entry?.total || 0;

    const sitesBySize = entry ? Object.values(entry.bySite).sort((a, b) => b.count - a.count) : [];
    const siteRows = sitesBySize.length > 0
      ? sitesBySize.map(s => `<a href="/sites/${s.srn}" target="_blank" rel="noopener noreferrer">${s.siteName || s.srn}</a>: ${s.count}`).join('<br />')
      : 'No allocations';

    return (
      `<b>${name}</b><br />` +
      `Total Allocations: ${count}<br />` +
      `Area: ${formatNumber(entry?.area || 0, 2)} HU, Hedgerow: ${formatNumber(entry?.hedgerow || 0, 2)} HU, Watercourse: ${formatNumber(entry?.watercourse || 0, 2)} HU<br /><br />` +
      `<b>By site:</b><br />${siteRows}`
    );
  };

  const onEachFeature = (feature, layer) => {
    layer.bindPopup(getPopupHtml(feature.properties[nameField]), { maxWidth: 300 });
  };

  const geoJsonKey = useMemo(
    () => (boundaries ? `${boundaries.features.length}|${Object.keys(regionData).join(',')}` : 'pending'),
    [boundaries, regionData]
  );

  if (error) {
    return <p>{error}</p>;
  }

  if (!boundaries) {
    return <p>Loading region boundaries...</p>;
  }

  return (
    <Flex direction="column" height="100%" width="100%">
      <Text fontSize="1.2rem" fontWeight="bold" color={accentColor} textAlign="center" marginBottom="0.5rem">
        Total Allocations<br />{formatNumber(totalAllocations, 0)} total
        <br />
        <Text as="span" fontSize="0.95rem" fontWeight="normal">
          Area: {formatNumber(totalArea, 2)} HU, Hedgerow: {formatNumber(totalHedgerow, 2)} HU, Watercourse: {formatNumber(totalWatercourse, 2)} HU
        </Text>
        <br />
        <Text as="span" fontSize="0.85rem" fontWeight="normal" fontStyle="italic" color="gray.600">
          Click on a region to see more information.
        </Text>
      </Text>
      <Flex flex="1" minHeight="0" width="100%">
        <HeatLegend maxCount={maxCount} heatFrom={heatFrom} heatTo={heatTo} />
        <Box flex="1" height="100%" style={{ aspectRatio: '3 / 4', maxHeight: '100%' }} marginX="auto">
          <MapContainer
            style={{ height: '100%', width: '100%', background: 'transparent' }}
            zoomControl={true}
            attributionControl={false}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            boxZoom={true}
            keyboard={true}
            touchZoom={true}
            center={[52.9522, -2.0153]}
            zoom={6}
          >
            <GeoJSON
              key={geoJsonKey}
              data={boundaries}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
            {specialMarkers.map(marker => (
              <CircleMarker
                key={marker.regionName}
                center={marker.position}
                radius={marker.radius || 5}
                color={OUTLINE_COLOR}
                weight={1}
                fillColor={getHeatColor(regionData[marker.regionName]?.total || 0, maxCount, heatFrom, heatTo)}
                fillOpacity={1}
              >
                <Popup maxWidth={300}>
                  <div dangerouslySetInnerHTML={{ __html: getPopupHtml(marker.regionName) }} />
                </Popup>
              </CircleMarker>
            ))}
            <FitBoundsToData data={boundaries} />
          </MapContainer>
        </Box>
      </Flex>
    </Flex>
  );
};

export default RegionAllocationHeatMap;
