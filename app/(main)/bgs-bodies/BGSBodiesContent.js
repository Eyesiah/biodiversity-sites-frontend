'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Tabs } from '@/components/styles/Tabs';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import { NAV_HEIGHT } from '@/config';
import ResponsibleBodiesContent from './ResponsibleBodiesContent';
import LPAContent from './LPAContent';
import NCAContent from './NCAContent';
import LNRSContent from './LNRSContent';
import { ResponsibleBodyMetricsChart } from '@/components/charts/ResponsibleBodyMetricsChart';
import { LPAMetricsChart } from '@/components/charts/LPAMetricsChart';
import { NCAMetricsChart } from '@/components/charts/NCAMetricsChart';
import { LNRSMetricsChart } from '@/components/charts/LNRSMetricsChart';
import { GREEN_PALETTE, YELLOW_PALETTE, BLUE_PALETTE, ORANGE_PALETTE } from '@/components/map/heatMapPalettes';
import TopAllocationsTab from './TopAllocationsTab';
import Tooltip from '@/components/ui/Tooltip';
import { formatNumber } from '@/lib/format';

const AllocationMapInfo = ({ regionType }) => (
  <Box
    bg="ivory"
    border="1px solid #2d618f"
    borderRadius="6px"
    p="8px 16px"
    mb="0.25rem"
    fontSize="0.85rem"
    color="gray.700"
    flexShrink={0}
    display="table"
    mx="auto"
    textAlign="center"
  >
    <Text marginBottom="0.2rem">
      <strong>Allocation Supply</strong> (left): shading shows total Habitat Units (Area, Hedgerow &amp; Watercourse) already supplied by BGS gain sites within each {regionType} region to approved development allocations.
    </Text>
    <Text marginBottom="0.2rem">
      <strong>Allocation Demand</strong> (right): shading shows total Habitat Units purchased from BGS gain sites by developments located within each {regionType} region.
    </Text>
    <Text marginBottom="0.2rem">
      The popup breakdown shows allocations grouped as <strong>Within</strong>, <strong>Neighbouring</strong>, or <strong>Outside</strong> — reflecting whether the corresponding site&apos;s {regionType} matches, borders, or falls outside the selected region.
    </Text>
    <Text fontStyle="italic">Click on a region to open its popup.</Text>
  </Box>
);

const BodiesMap = dynamic(() => import('@/components/map/BodiesMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const RegionAllocationHeatMap = dynamic(() => import('@/components/map/RegionAllocationHeatMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

// The Isles of Scilly are too small/remote to reliably see or click on the rendered
// choropleth at England-wide zoom, so each map gets a fixed-pixel-size marker over them -
// the region name differs per dataset (LNRS combines them with Cornwall; LPA and NCA each
// have a distinct "Isles of Scilly" entry).
const SCILLY_LNRS_MARKERS = [
  { position: [49.92, -6.32], regionName: 'Cornwall and the Isles of Scilly', radius: 5 }
];
const SCILLY_LPA_MARKERS = [
  { position: [49.92, -6.32], regionName: 'Isles of Scilly LPA', radius: 5 }
];
const SCILLY_NCA_MARKERS = [
  { position: [49.92, -6.32], regionName: 'Isles of Scilly', radius: 5 }
];

export default function BGSBodiesContent({
  responsibleBodies = [],
  lpas = [],
  ncas = [],
  lnrs = [],
  sites = [],
  error = null
}) {
  // Handle filter clear events from any content component
  const handleFilterCleared = useCallback(() => {
    // Reset map state to show all bodies for the current tab
    setSelectedBody(null);
    setMapSites([]);
  }, []);
  const [activeTab, setActiveTab] = useState('responsible-bodies');
  const [mapInfoOpen, setMapInfoOpen] = useState(false);

  // Data for the region allocation heat maps (5 tabs below) is fetched client-side rather than
  // passed down as server-rendered props - the boundary GeoJSON and full allocations data are
  // large enough that embedding them in this page's server-rendered payload pushed the BGS
  // Bodies page's pre-rendered ISR response over Vercel's 19.07MB limit and broke the production
  // deployment (FALLBACK_BODY_TOO_LARGE). See app/api/region-allocations/route.js and
  // public/region-boundaries/.
  const [allocations, setAllocations] = useState([]);

  const allocationTotals = useMemo(() => {
    let area = 0, hedgerow = 0, watercourse = 0;
    (allocations || []).forEach(alloc => {
      area += alloc.au || 0;
      hedgerow += alloc.hu || 0;
      watercourse += alloc.wu || 0;
    });
    return { area, hedgerow, watercourse, total: area + hedgerow + watercourse, count: (allocations || []).length };
  }, [allocations]);
  const [lnrsBoundaries, setLnrsBoundaries] = useState(null);
  const [lpaBoundaries, setLpaBoundaries] = useState(null);
  const [ncaBoundaries, setNcaBoundaries] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch('/api/region-allocations').then(res => res.json()),
      fetch('/region-boundaries/lnrs.json').then(res => res.json()),
      fetch('/region-boundaries/lpa.json').then(res => res.json()),
      fetch('/region-boundaries/nca.json').then(res => res.json()),
    ]).then(([allocationsData, lnrsData, lpaData, ncaData]) => {
      if (cancelled) return;
      setAllocations(allocationsData);
      setLnrsBoundaries(lnrsData);
      setLpaBoundaries(lpaData);
      setNcaBoundaries(ncaData);
    }).catch(e => {
      console.error('Failed to load region allocation map data:', e);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Shared map state
  const [mapSites, setMapSites] = useState([]);
  const [hoveredSite, setHoveredSite] = useState(null); // For list tabs
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedBody, setSelectedBody] = useState(null);
  const [filteredBodiesLPA, setFilteredBodiesLPA] = useState(null);
  const [filteredBodiesNCA, setFilteredBodiesNCA] = useState(null);
  const [filteredBodiesLNRS, setFilteredBodiesLNRS] = useState(null);

  // Refs for content components to enable direct filter setting
  const lpaContentRef = useRef(null);
  const ncaContentRef = useRef(null);
  const lnrsContentRef = useRef(null);

  const handleExpandedBodyChanged = useCallback((body, sites) => {
    setSelectedBody(body);
    setMapSites(sites);
  }, []);

  // Handle hover on chart segment - pass all sites for the hovered entity
  const handleChartHover = useCallback((hoverData) => {
    if (!hoverData) {
      setMapSites(null);
      setSelectedBody(null);
      return;
    }

    const { sites: entitySites, isOther } = hoverData;

    if (isOther) {
      // For "Other" segment, show all BGS sites
      setMapSites(sites);
      setSelectedBody(null);
    } else if (entitySites && entitySites.length > 0) {
      setMapSites(entitySites);

      // Get the correct body name from the first site's properties
      let bodyName = null;
      if (activeTab === 'lpa-chart' && entitySites[0].lpaName) {
        bodyName = `${entitySites[0].lpaName} LPA`;
      } else if (activeTab === 'nca-chart' && entitySites[0].ncaName) {
        bodyName = entitySites[0].ncaName;
      } else if (activeTab === 'lnrs-chart' && entitySites[0].lnrsName) {
        bodyName = entitySites[0].lnrsName;
      }

      if (bodyName) {
        setSelectedBody({ name: bodyName });
      }
    } else {
      setMapSites(null);
      setSelectedBody(null);
    }
  }, [sites, activeTab]);

  // Reset map state when switching tabs
  useEffect(() => {
    setMapSites([]);
    setHoveredSite(null);
    setSelectedSite(null);
    setSelectedBody(null);
    setMapInfoOpen(false);
  }, [activeTab]);

  // Handle polygon click on map - find the clicked body and set it as selected
  const handlePolygonClick = useCallback((clickedBodyName) => {
    // Find the clicked body from the appropriate data array based on current tab
    let clickedBody = null;

    switch (activeTab) {
      case 'lpa':
      case 'lpa-chart':
        clickedBody = lpas.find(body => body.name === clickedBodyName);
        break;
      case 'nca':
      case 'nca-chart':
        clickedBody = ncas.find(body => body.name === clickedBodyName);
        break;
      case 'lnrs':
      case 'lnrs-chart':
        clickedBody = lnrs.find(body => body.name === clickedBodyName);
        break;
      default:
        return; // Don't handle clicks in non-polygon modes
    }

    if (clickedBody) {
      // Set the clicked body as selected, which will trigger the existing logic
      // to show only that body's polygon and its adjacent bodies
      setSelectedBody(clickedBody);
      setMapSites(sites.filter(s => clickedBody.sites.includes(s.referenceNumber)));

      // Get the appropriate content ref based on current tab
      let contentRef = null;
      if (activeTab === 'lpa' || activeTab === 'lpa-chart') {
        contentRef = lpaContentRef;
      } else if (activeTab === 'nca' || activeTab === 'nca-chart') {
        contentRef = ncaContentRef;
      } else if (activeTab === 'lnrs' || activeTab === 'lnrs-chart') {
        contentRef = lnrsContentRef;
      }

      // Call the setFilterValue method on the content component
      if (contentRef && contentRef.current && contentRef.current.setFilterValue) {
        contentRef.current.setFilterValue(clickedBody.name);
      } else {
        console.warn('Content ref not available or setFilterValue method not found');
      }
    }
  }, [activeTab, lpas, ncas, lnrs, sites]);

  // Handle filtered body updates from content components
  const handleFilteredBodiesChange = useCallback((newFilteredBodies, setFilteredBodies) => {
    // Update map to show only filtered bodies
    setSelectedBody(null);
    setMapSites([]);

    setFilteredBodies(newFilteredBodies || null);

    // If there are filtered bodies, get their sites
    if (newFilteredBodies && newFilteredBodies.length > 0) {
      const filteredSites = [];
      newFilteredBodies.forEach(body => {
        if (body.sites) {
          body.sites.forEach(siteRef => {
            const site = sites.find(s => s.referenceNumber === siteRef);
            if (site) filteredSites.push(site);
          });
        }
      });
      setMapSites(filteredSites);
    }
  }, [sites]);


  // Map configuration based on active tab - must be called before any early returns
  const bodyType = useMemo(() => {
    switch (activeTab) {
      case 'responsible-bodies':
      case 'rb-chart':
        return 'rb';
      case 'lpa':
      case 'lpa-chart':
        return 'lpa';
      case 'nca':
      case 'nca-chart':
        return 'nca';
      case 'lnrs':
      case 'lnrs-chart':
        return 'lnrs';
      default:
        return '';
    }
  }, [activeTab]);

  // Calculate selectedBodiesForMap based on current state
  const selectedBodiesForMap = useMemo(() => {
    // If a specific body is selected, show only that body
    if (selectedBody) {
      return [selectedBody];
    }

    const selectBodies = (allBodies, filteredBodies) => {
      if (filteredBodies && filteredBodies.length != allBodies.length) {
        return filteredBodies;
      }
      return allBodies.filter(body => body.sites && body.sites.length > 0)
    }

    let activeBodies;
    switch (activeTab) {
      case 'lpa':
      case 'lpa-chart':
        return selectBodies(lpas, filteredBodiesLPA);
      case 'nca':
      case 'nca-chart':
        return selectBodies(ncas, filteredBodiesNCA);
      case 'lnrs':
      case 'lnrs-chart':
        return selectBodies(lnrs, filteredBodiesLNRS);
    }

    return [];

  }, [selectedBody, filteredBodiesLPA, filteredBodiesNCA, filteredBodiesLNRS, activeTab, lpas, ncas, lnrs]);

  // Determine if we should disable zoom on the map (for chart hover)
  const disableZoom = activeTab === 'rb-chart' || activeTab === 'lpa-chart' || activeTab === 'nca-chart' || activeTab === 'lnrs-chart';

  const isAllocationMapTab = activeTab === 'lnrs-allocation-maps' || activeTab === 'lpa-allocation-maps' || activeTab === 'nca-allocation-maps';

  const mainContent = useMemo(() => (
    <Tabs.Root value={activeTab} onValueChange={(details) => setActiveTab(details.value)}>
      <Tabs.List>
        <Tabs.Trigger value="responsible-bodies">
          Responsible Bodies List
        </Tabs.Trigger>
        <Tabs.Trigger value="rb-chart">
          Responsible Bodies Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="lnrs">
          LNRS List
        </Tabs.Trigger>
        <Tabs.Trigger value="lnrs-chart">
          LNRS Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="lnrs-allocation-maps">
          LNRS Allocation Maps
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa">
          LPA List
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa-chart">
          LPA Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa-allocation-maps">
          LPA Allocation Maps
        </Tabs.Trigger>
        <Tabs.Trigger value="nca">
          NCA List
        </Tabs.Trigger>
        <Tabs.Trigger value="nca-chart">
          NCA Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="nca-allocation-maps">
          NCA Allocation Maps
        </Tabs.Trigger>
        <Tabs.Trigger value="top-10">
          Allocation Top 10
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="responsible-bodies">
        <ResponsibleBodiesContent
          responsibleBodies={responsibleBodies}
          sites={sites}
          onExpandedRowChanged={handleExpandedBodyChanged}
          onHoveredSiteChange={setHoveredSite}
          onSelectedSiteChange={setSelectedSite}
        />
      </Tabs.Content>

      <Tabs.Content value="rb-chart">
        <ResponsibleBodyMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
      </Tabs.Content>

      <Tabs.Content value="lnrs">
        <LNRSContent
          ref={lnrsContentRef}
          lnrs={lnrs}
          sites={sites}
          error={null}
          onExpandedRowChanged={handleExpandedBodyChanged}
          onHoveredSiteChange={setHoveredSite}
          onSelectedSiteChange={setSelectedSite}
          onFilterCleared={handleFilterCleared}
          onSortedItemsChange={(bodies) => handleFilteredBodiesChange(bodies, setFilteredBodiesLNRS)}
        />
      </Tabs.Content>

      <Tabs.Content value="lnrs-chart">
        <LNRSMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
      </Tabs.Content>

      <Tabs.Content value="lnrs-allocation-maps">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
          <Flex direction="column" height="100%">
            <Flex justify="center" paddingY="0.3rem" flexShrink={0}>
              <Box
                as="button"
                fontSize="0.8rem"
                fontWeight="semibold"
                color={mapInfoOpen ? 'white' : '#2d618f'}
                bg={mapInfoOpen ? '#2d618f' : 'transparent'}
                cursor="pointer"
                border="1.5px solid #2d618f"
                borderRadius="4px"
                px="0.6rem"
                py="0.15rem"
                userSelect="none"
                onClick={() => setMapInfoOpen(v => !v)}
                style={{ transition: 'background 0.15s, color 0.15s' }}
              >
                ⓘ Map Info
              </Box>
            </Flex>
            <Text fontSize="1rem" fontWeight="semibold" textAlign="center" color="gray.700" flexShrink={0} paddingBottom="0.2rem">
              {formatNumber(allocationTotals.count, 0)} allocations — {formatNumber(allocationTotals.total, 2)} HU total — Area: {formatNumber(allocationTotals.area, 2)} HU, Hedgerow: {formatNumber(allocationTotals.hedgerow, 2)} HU, Watercourse: {formatNumber(allocationTotals.watercourse, 2)} HU
            </Text>
            {mapInfoOpen && <AllocationMapInfo regionType="LNRS" />}
            <Flex flex="1" minHeight="0" direction={{ base: 'column', xl: 'row' }} gap="0.5rem">
              <Flex flex="1" direction="column" height={{ base: '50vh', xl: '100%' }} minWidth="0">
                <Text fontSize="0.85rem" fontWeight="bold" color={GREEN_PALETTE.accentColor} textAlign="center" py="0.2rem" flexShrink={0}>
                  <Tooltip text="Map shading is based on total HUs already supplied by all the BGS in each LNRS to approved development allocations.">LNRS Allocation Supply</Tooltip>
                </Text>
                <Box flex="1" minHeight="0">
                  <RegionAllocationHeatMap
                    allocations={allocations}
                    regionField="lnrs"
                    nameField="Name"
                    boundaries={lnrsBoundaries}
                    specialMarkers={SCILLY_LNRS_MARKERS}
                    description="Allocations grouped by where the BGS gain site is located (supply)."
                    shadingTooltip="Map shading is based on total HUs already supplied by all the BGS in each LNRS to approved development allocations."
                    allocationsLabel="Allocations Supplied"
                    bySiteLabel="Demand Side"
                    breakdownKeyField="srCat"
                    breakdownNameField="srCat"
                    breakdownLinkPrefix={null}
                    breakdownOrder={['Within', 'Neighbouring', 'Outside']}
                    breakdownShowDistance={false}
                    breakdownShowPercentage={true}
                  />
                </Box>
              </Flex>
              <Flex flex="1" direction="column" height={{ base: '50vh', xl: '100%' }} minWidth="0">
                <Text fontSize="0.85rem" fontWeight="bold" color={ORANGE_PALETTE.accentColor} textAlign="center" py="0.2rem" flexShrink={0}>
                  <Tooltip text="Map shading is based on the total HUs already purchased from BGS gain sites by developments in each LNRS region.">LNRS Allocation Demand</Tooltip>
                </Text>
                <Box flex="1" minHeight="0">
                  <RegionAllocationHeatMap
                    allocations={allocations}
                    regionField="allocLnrs"
                    nameField="Name"
                    boundaries={lnrsBoundaries}
                    specialMarkers={SCILLY_LNRS_MARKERS}
                    heatFrom={ORANGE_PALETTE.heatFrom}
                    heatTo={ORANGE_PALETTE.heatTo}
                    accentColor={ORANGE_PALETTE.accentColor}
                    description="Allocations grouped by where the originating development is located (demand)."
                    shadingTooltip="Map shading is based on the number of HUs already purchased from all developments in the region."
                    allocationsLabel="Allocation Demand"
                    bySiteLabel="Supply Side"
                    breakdownKeyField="srCat"
                    breakdownNameField="srCat"
                    breakdownLinkPrefix={null}
                    breakdownOrder={['Within', 'Neighbouring', 'Outside']}
                    breakdownShowDistance={false}
                    breakdownShowPercentage={true}
                  />
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </Box>
      </Tabs.Content>

      <Tabs.Content value="lpa">
        <LPAContent
          ref={lpaContentRef}
          lpas={lpas}
          sites={sites}
          onExpandedRowChanged={handleExpandedBodyChanged}
          onHoveredSiteChange={setHoveredSite}
          onSelectedSiteChange={setSelectedSite}
          onFilterCleared={handleFilterCleared}
          onSortedItemsChange={(bodies) => handleFilteredBodiesChange(bodies, setFilteredBodiesLPA)}
        />
      </Tabs.Content>

      <Tabs.Content value="lpa-chart">
        <LPAMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
      </Tabs.Content>

      <Tabs.Content value="lpa-allocation-maps">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
          <Flex direction="column" height="100%">
            <Flex justify="center" paddingY="0.3rem" flexShrink={0}>
              <Box
                as="button"
                fontSize="0.8rem"
                fontWeight="semibold"
                color={mapInfoOpen ? 'white' : '#2d618f'}
                bg={mapInfoOpen ? '#2d618f' : 'transparent'}
                cursor="pointer"
                border="1.5px solid #2d618f"
                borderRadius="4px"
                px="0.6rem"
                py="0.15rem"
                userSelect="none"
                onClick={() => setMapInfoOpen(v => !v)}
                style={{ transition: 'background 0.15s, color 0.15s' }}
              >
                ⓘ Map Info
              </Box>
            </Flex>
            <Text fontSize="1rem" fontWeight="semibold" textAlign="center" color="gray.700" flexShrink={0} paddingBottom="0.2rem">
              {formatNumber(allocationTotals.count, 0)} allocations — {formatNumber(allocationTotals.total, 2)} HU total — Area: {formatNumber(allocationTotals.area, 2)} HU, Hedgerow: {formatNumber(allocationTotals.hedgerow, 2)} HU, Watercourse: {formatNumber(allocationTotals.watercourse, 2)} HU
            </Text>
            {mapInfoOpen && <AllocationMapInfo regionType="LPA" />}
            <Flex flex="1" minHeight="0" direction={{ base: 'column', xl: 'row' }} gap="0.5rem">
              <Flex flex="1" direction="column" height={{ base: '50vh', xl: '100%' }} minWidth="0">
                <Text fontSize="0.85rem" fontWeight="bold" color={YELLOW_PALETTE.accentColor} textAlign="center" py="0.2rem" flexShrink={0}>
                  <Tooltip text="Map shading is based on total HUs already supplied by all the BGS in each LPA to approved development allocations.">LPA Allocation Supply</Tooltip>
                </Text>
                <Box flex="1" minHeight="0">
                  <RegionAllocationHeatMap
                    allocations={allocations}
                    regionField="siteLpa"
                    nameField="LPA23NM"
                    boundaries={lpaBoundaries}
                    specialMarkers={SCILLY_LPA_MARKERS}
                    heatFrom={YELLOW_PALETTE.heatFrom}
                    heatTo={YELLOW_PALETTE.heatTo}
                    accentColor={YELLOW_PALETTE.accentColor}
                    description="Allocations grouped by where the BGS gain site is located (supply)."
                    shadingTooltip="Map shading is based on total HUs already supplied by all the BGS in each LPA to approved development allocations."
                    allocationsLabel="Allocations Supplied"
                    bySiteLabel="Demand Side"
                    breakdownKeyField="srCat"
                    breakdownNameField="srCat"
                    breakdownLinkPrefix={null}
                    breakdownOrder={['Within', 'Neighbouring', 'Outside']}
                    breakdownShowDistance={false}
                    breakdownShowPercentage={true}
                  />
                </Box>
              </Flex>
              <Flex flex="1" direction="column" height={{ base: '50vh', xl: '100%' }} minWidth="0">
                <Text fontSize="0.85rem" fontWeight="bold" color={ORANGE_PALETTE.accentColor} textAlign="center" py="0.2rem" flexShrink={0}>
                  <Tooltip text="Map shading is based on the total HUs already purchased from BGS gain sites by developments in each LPA.">LPA Allocation Demand</Tooltip>
                </Text>
                <Box flex="1" minHeight="0">
                  <RegionAllocationHeatMap
                    allocations={allocations}
                    regionField="lpa"
                    nameField="LPA23NM"
                    boundaries={lpaBoundaries}
                    specialMarkers={SCILLY_LPA_MARKERS}
                    heatFrom={ORANGE_PALETTE.heatFrom}
                    heatTo={ORANGE_PALETTE.heatTo}
                    accentColor={ORANGE_PALETTE.accentColor}
                    description="Allocations grouped by where the originating development is located (demand)."
                    shadingTooltip="Map shading is based on the number of HUs already purchased from all developments in the region."
                    allocationsLabel="Allocation Demand"
                    bySiteLabel="Supply Side"
                    breakdownKeyField="srCat"
                    breakdownNameField="srCat"
                    breakdownLinkPrefix={null}
                    breakdownOrder={['Within', 'Neighbouring', 'Outside']}
                    breakdownShowDistance={false}
                    breakdownShowPercentage={true}
                  />
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </Box>
      </Tabs.Content>

      <Tabs.Content value="nca">
        <NCAContent
          ref={ncaContentRef}
          ncas={ncas}
          sites={sites}
          error={null}
          onExpandedRowChanged={handleExpandedBodyChanged}
          onHoveredSiteChange={setHoveredSite}
          onSelectedSiteChange={setSelectedSite}
          onFilterCleared={handleFilterCleared}
          onSortedItemsChange={(bodies) => handleFilteredBodiesChange(bodies, setFilteredBodiesNCA)}
        />
      </Tabs.Content>

      <Tabs.Content value="nca-chart">
        <NCAMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
      </Tabs.Content>

      <Tabs.Content value="nca-allocation-maps">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
          <Flex direction="column" height="100%">
            <Flex justify="center" paddingY="0.3rem" flexShrink={0}>
              <Box
                as="button"
                fontSize="0.8rem"
                fontWeight="semibold"
                color={mapInfoOpen ? 'white' : '#2d618f'}
                bg={mapInfoOpen ? '#2d618f' : 'transparent'}
                cursor="pointer"
                border="1.5px solid #2d618f"
                borderRadius="4px"
                px="0.6rem"
                py="0.15rem"
                userSelect="none"
                onClick={() => setMapInfoOpen(v => !v)}
                style={{ transition: 'background 0.15s, color 0.15s' }}
              >
                ⓘ Map Info
              </Box>
            </Flex>
            <Text fontSize="1rem" fontWeight="semibold" textAlign="center" color="gray.700" flexShrink={0} paddingBottom="0.2rem">
              {formatNumber(allocationTotals.count, 0)} allocations — {formatNumber(allocationTotals.total, 2)} HU total — Area: {formatNumber(allocationTotals.area, 2)} HU, Hedgerow: {formatNumber(allocationTotals.hedgerow, 2)} HU, Watercourse: {formatNumber(allocationTotals.watercourse, 2)} HU
            </Text>
            {mapInfoOpen && <AllocationMapInfo regionType="NCA" />}
            <Flex flex="1" minHeight="0" direction={{ base: 'column', xl: 'row' }} gap="0.5rem">
              <Flex flex="1" direction="column" height={{ base: '50vh', xl: '100%' }} minWidth="0">
                <Text fontSize="0.85rem" fontWeight="bold" color={BLUE_PALETTE.accentColor} textAlign="center" py="0.2rem" flexShrink={0}>
                  <Tooltip text="Map shading is based on total HUs already supplied by all the BGS in each NCA to approved development allocations.">NCA Allocation Supply</Tooltip>
                </Text>
                <Box flex="1" minHeight="0">
                  <RegionAllocationHeatMap
                    allocations={allocations}
                    regionField="nca"
                    nameField="NCA_Name"
                    boundaries={ncaBoundaries}
                    specialMarkers={SCILLY_NCA_MARKERS}
                    heatFrom={BLUE_PALETTE.heatFrom}
                    heatTo={BLUE_PALETTE.heatTo}
                    accentColor={BLUE_PALETTE.accentColor}
                    description="Allocations grouped by where the BGS gain site is located (supply)."
                    shadingTooltip="Map shading is based on total HUs already supplied by all the BGS in each NCA to approved development allocations."
                    allocationsLabel="Allocations Supplied"
                    bySiteLabel="Demand Side"
                    breakdownKeyField="srCat"
                    breakdownNameField="srCat"
                    breakdownLinkPrefix={null}
                    breakdownOrder={['Within', 'Neighbouring', 'Outside']}
                    breakdownShowDistance={false}
                    breakdownShowPercentage={true}
                  />
                </Box>
              </Flex>
              <Flex flex="1" direction="column" height={{ base: '50vh', xl: '100%' }} minWidth="0">
                <Text fontSize="0.85rem" fontWeight="bold" color={ORANGE_PALETTE.accentColor} textAlign="center" py="0.2rem" flexShrink={0}>
                  <Tooltip text="Map shading is based on the total HUs already purchased from BGS gain sites by developments in each NCA.">NCA Allocation Demand</Tooltip>
                </Text>
                <Box flex="1" minHeight="0">
                  <RegionAllocationHeatMap
                    allocations={allocations}
                    regionField="allocNca"
                    nameField="NCA_Name"
                    boundaries={ncaBoundaries}
                    specialMarkers={SCILLY_NCA_MARKERS}
                    heatFrom={ORANGE_PALETTE.heatFrom}
                    heatTo={ORANGE_PALETTE.heatTo}
                    accentColor={ORANGE_PALETTE.accentColor}
                    description="Allocations grouped by where the originating development is located (demand)."
                    shadingTooltip="Map shading is based on the number of HUs already purchased from all developments in the region."
                    allocationsLabel="Allocation Demand"
                    bySiteLabel="Supply Side"
                    breakdownKeyField="srCat"
                    breakdownNameField="srCat"
                    breakdownLinkPrefix={null}
                    breakdownOrder={['Within', 'Neighbouring', 'Outside']}
                    breakdownShowDistance={false}
                    breakdownShowPercentage={true}
                  />
                </Box>
              </Flex>
            </Flex>
          </Flex>
        </Box>
      </Tabs.Content>

      <Tabs.Content value="top-10">
        <TopAllocationsTab allocations={allocations} />
      </Tabs.Content>
    </Tabs.Root>
  ), [activeTab, mapInfoOpen, allocationTotals, handleChartHover, handleExpandedBodyChanged, setHoveredSite, lnrs, lpas, ncas, responsibleBodies, sites, allocations, lnrsBoundaries, lpaBoundaries, ncaBoundaries, handleFilterCleared, handleFilteredBodiesChange]);

  // Check for error after all hooks are called
  if (error) {
    return (
      <Box padding="2rem">
        <Text color="red" fontSize="1.2rem">
          Error loading data: {error}
        </Text>
      </Box>
    );
  }

  return (
    <MapContentLayout
      map={<BodiesMap
        bodiesToDisplay={selectedBodiesForMap}
        bodyType={bodyType}
        sites={mapSites}
        disableZoom={disableZoom}
        hoveredSite={hoveredSite}
        selectedSite={selectedSite}
        onPolygonClick={handlePolygonClick}
      />}
      content={mainContent}
      hideMap={isAllocationMapTab}
    />
  );
}
