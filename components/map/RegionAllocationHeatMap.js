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

// Interpolates between heatFrom and heatTo based on value / max, using a square-root scale
// rather than linear. HU totals per region are heavily right-skewed (a handful of regions
// with large allocations dwarf the rest - e.g. on the LPA maps the highest region can be 70x
// the median), so a linear scale would render the vast majority of regions as barely-visible
// near-white. Square-root compresses the high end and stretches out the low/mid range so real
// differences between typical regions become visible, while still being well-behaved at 0
// (unlike a log scale, which needs special-casing there).
const getHeatColor = (value, max, heatFrom, heatTo) => {
  if (!value || max <= 0) return NO_DATA_COLOR;
  const ratio = Math.min(Math.sqrt(value) / Math.sqrt(max), 1);

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
    // The container may not have its final size yet at this point (e.g. this map sits inside
    // a lazy-mounted tab, and the surrounding flex/aspect-ratio layout can still be settling
    // when this effect runs) - Leaflet caches its container size on init/last invalidateSize
    // call, so without this it can compute the wrong viewport and render blank or mis-fit.
    map.invalidateSize();
    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [10, 10] });
    }
  }, [data, map]);

  return null;
};

// Belt-and-braces fix for the same issue: keeps the map correctly sized for as long as it's
// mounted, in case the container resizes after the initial fitBounds (tab switches, window
// resize, sidebar collapsing, etc), any of which can otherwise leave Leaflet showing a blank
// or wrongly-cropped map until something else forces a resize.
const InvalidateSizeOnResize = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [map]);

  return null;
};

const HeatLegend = ({ maxValue, heatFrom, heatTo }) => {
  const ticks = getNiceTicks(maxValue);
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
        {ticks.map(tick => {
          // Position matches the square-root colour scale used by getHeatColor, so the tick
          // sits at the point on the bar where that HU value actually renders.
          const position = niceMax > 0 ? (Math.sqrt(tick) / Math.sqrt(niceMax)) * 100 : 0;
          return (
            <Text
              key={tick}
              position="absolute"
              right="28px"
              style={{ bottom: `calc(${position}% - 0.6em)` }}
              fontSize="0.85rem"
              color="gray.600"
              whiteSpace="nowrap"
            >
              {formatNumber(tick, 0)} -
            </Text>
          );
        })}
      </Box>
    </Flex>
  );
};

// Generic choropleth showing total Habitat Units (area + hedgerow + watercourse) allocated
// per region (LNRS / LPA / NCA / etc), shaded from white (no data) through a configurable
// colour palette at the highest HU total, with a vertical legend to the left and a
// click-for-detail popup per region.
//
// - regionField: the key on each allocation object holding that region's name (e.g. 'lnrs', 'siteLpa', 'nca')
// - nameField: the property key on each GeoJSON feature holding the region's display name
//   (varies by ArcGIS service - e.g. 'Name' for LNRS, 'LPA23NM' for LPA, 'NCA_Name' for NCA)
// - boundaries: pre-fetched GeoJSON (preferred - fetched server-side and cached, see
//   app/(main)/bgs-bodies/page.js) to avoid a slow client-side ArcGIS round-trip on every page
//   load. If omitted, falls back to fetching fallbackFetchUrl itself.
// - specialMarkers: optional fixed-pixel-size CircleMarkers for regions too small/remote to
//   reliably see or click on the rendered choropleth (e.g. the Isles of Scilly)
// - heatFrom/heatTo/accentColor: colour palette (see GREEN_PALETTE/YELLOW_PALETTE/BLUE_PALETTE/
//   ORANGE_PALETTE exported above) - defaults to green if not supplied
// - description: optional line of text shown under the title, e.g. to clarify what "region"
//   means for this particular map (supply vs demand, etc)
// - allocationsLabel: label used in the popup for the allocation count, e.g. "Allocations
//   Supplied" or "Allocations Demand" - defaults to "Total Allocations"
// - bySiteLabel: label used in the popup for the per-site breakdown - on a demand map (region =
//   where the development is) this should read "Supply site", and on a supply map (region =
//   where the gain site already is) it should read "Demand site" - defaults to "By site"
// - breakdownKeyField/breakdownNameField: which allocation fields the per-site breakdown groups
//   and labels by. Defaults to the BGS gain site ('srn'/'siteName', linked to /sites/{srn}) -
//   the right choice for demand maps, where the breakdown shows which supply sites fulfilled
//   the demand in that region. For supply maps, pass breakdownKeyField="lpa"
//   breakdownNameField="lpa" breakdownLinkPrefix={null} instead, so the breakdown shows which
//   demand-side LPAs the allocations in that supply region originated from.
// - breakdownLinkPrefix: if set, breakdown entries link to `${breakdownLinkPrefix}${key}`;
//   if null, rendered as plain text (LPAs have no detail page in this app)
// - breakdownOrder: optional array of keys giving a fixed display order for the breakdown
//   (e.g. ['Within', 'Neighbouring', 'Outside'] for spatial risk) - if omitted, entries are
//   sorted by count descending instead
// - breakdownShowDistance: whether to show each breakdown row's average distance - defaults
//   to true (meaningful for the demand maps' per-supply-site breakdown), set false where it
//   isn't (e.g. the supply maps' spatial-risk-category breakdown)
// - breakdownShowPercentage: if true, shows each breakdown row's share of the region's total
//   allocations as a percentage instead of a raw count - defaults to false
// - breakdownShowSpatialRisk: if true, appends each row's spatial risk category (Within /
//   Neighbouring / Outside) - defaults to false
// - shadingTooltip: optional tooltip text shown on hover over the main title, explaining what
//   the map's colour shading is based on (e.g. differs for supply vs demand maps)
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
  description = null,
  shadingTooltip = null,
  allocationsLabel = 'Total Allocations',
  bySiteLabel = 'By site',
  breakdownKeyField = 'srn',
  breakdownNameField = 'siteName',
  breakdownLinkPrefix = '/sites/',
  breakdownOrder = null,
  breakdownShowDistance = true,
  breakdownShowPercentage = false,
  breakdownShowSpatialRisk = false,
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

  const { regionData, maxHU, totalAllocations, totalArea, totalHedgerow, totalWatercourse, totalHU } = useMemo(() => {
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
        data[regionName] = { total: 0, area: 0, hedgerow: 0, watercourse: 0, totalHU: 0, bySite: {} };
      }
      const regionEntry = data[regionName];
      regionEntry.total += 1;
      regionEntry.area += alloc.au || 0;
      regionEntry.hedgerow += alloc.hu || 0;
      regionEntry.watercourse += alloc.wu || 0;
      regionEntry.totalHU += (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
      total += 1;

      const breakdownKey = alloc[breakdownKeyField] || 'Unknown';
      if (!regionEntry.bySite[breakdownKey]) {
        regionEntry.bySite[breakdownKey] = { key: breakdownKey, name: alloc[breakdownNameField] || breakdownKey, count: 0, distanceTotal: 0, distanceCount: 0, srCat: alloc.srCat };
      }
      regionEntry.bySite[breakdownKey].count += 1;
      if (typeof alloc.d === 'number') {
        regionEntry.bySite[breakdownKey].distanceTotal += alloc.d;
        regionEntry.bySite[breakdownKey].distanceCount += 1;
      }
    });

    const max = Math.max(0, ...Object.values(data).map(d => d.totalHU));
    return {
      regionData: data,
      maxHU: max,
      totalAllocations: total,
      totalArea: area,
      totalHedgerow: hedgerow,
      totalWatercourse: watercourse,
      totalHU: area + hedgerow + watercourse,
    };
  }, [allocations, regionField, breakdownKeyField, breakdownNameField]);

  const styleFeature = (feature) => {
    const totalHU = regionData[feature.properties[nameField]]?.totalHU || 0;
    return {
      color: OUTLINE_COLOR,
      weight: 1,
      opacity: 1,
      fillColor: getHeatColor(totalHU, maxHU, heatFrom, heatTo),
      fillOpacity: 1,
    };
  };

  const getPopupHtml = (name) => {
    const entry = regionData[name];
    const count = entry?.total || 0;

    const sitesBySize = entry
      ? Object.values(entry.bySite).sort((a, b) => (
        breakdownOrder
          ? breakdownOrder.indexOf(a.key) - breakdownOrder.indexOf(b.key)
          : b.count - a.count
      ))
      : [];
    const siteRows = sitesBySize.length > 0
      ? sitesBySize.map(s => {
        const label = breakdownLinkPrefix
          ? `<a href="${breakdownLinkPrefix}${s.key}" target="_blank" rel="noopener noreferrer">${s.name}</a>`
          : s.name;
        const value = breakdownShowPercentage
          ? `${s.count} (${formatNumber(count > 0 ? (s.count / count) * 100 : 0, 1)}%)`
          : s.count;

        const extras = [];
        if (breakdownShowDistance) {
          extras.push(s.distanceCount > 0 ? `${formatNumber(s.distanceTotal / s.distanceCount, 0)} km` : 'unknown distance');
        }
        if (breakdownShowSpatialRisk) {
          extras.push(s.srCat || 'Unknown');
        }

        return extras.length > 0 ? `${label}: ${value}, ${extras.join(', ')}` : `${label}: ${value}`;
      }).join('<br />')
      : 'No allocations';

    return (
      `<b>${name}</b><br />` +
      `${allocationsLabel}: ${count}<br />` +
      `Total HU: ${formatNumber(entry?.totalHU || 0, 2)} - Area: ${formatNumber(entry?.area || 0, 2)} HU, Hedgerow: ${formatNumber(entry?.hedgerow || 0, 2)} HU, Watercourse: ${formatNumber(entry?.watercourse || 0, 2)} HU<br /><br />` +
      `<b>${bySiteLabel}:</b><br />${siteRows}`
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
      <Flex flex="1" minHeight="0" width="100%">
        <HeatLegend maxValue={maxHU} heatFrom={heatFrom} heatTo={heatTo} />
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
                fillColor={getHeatColor(regionData[marker.regionName]?.totalHU || 0, maxHU, heatFrom, heatTo)}
                fillOpacity={1}
              >
                <Popup maxWidth={300}>
                  <div dangerouslySetInnerHTML={{ __html: getPopupHtml(marker.regionName) }} />
                </Popup>
              </CircleMarker>
            ))}
            <FitBoundsToData data={boundaries} />
            <InvalidateSizeOnResize />
          </MapContainer>
        </Box>
      </Flex>
    </Flex>
  );
};

export default RegionAllocationHeatMap;
