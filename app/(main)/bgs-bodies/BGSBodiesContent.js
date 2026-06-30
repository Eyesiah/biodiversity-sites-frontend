'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';
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
import { YELLOW_PALETTE, BLUE_PALETTE, ORANGE_PALETTE } from '@/components/map/heatMapPalettes';

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

  // Data for the region allocation heat maps (5 tabs below) is fetched client-side rather than
  // passed down as server-rendered props - the boundary GeoJSON and full allocations data are
  // large enough that embedding them in this page's server-rendered payload pushed the BGS
  // Bodies page's pre-rendered ISR response over Vercel's 19.07MB limit and broke the production
  // deployment (FALLBACK_BODY_TOO_LARGE). See app/api/region-allocations/route.js and
  // public/region-boundaries/.
  const [allocations, setAllocations] = useState([]);
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
        <Tabs.Trigger value="lnrs-allocation-map">
          LNRS Allocation Supply
        </Tabs.Trigger>
        <Tabs.Trigger value="lnrs-allocation-demand-map">
          LNRS Allocation Demand
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa">
          LPA List
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa-chart">
          LPA Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa-allocation-map">
          LPA Allocation Supply
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa-allocation-demand-map">
          LPA Allocation Demand
        </Tabs.Trigger>
        <Tabs.Trigger value="nca">
          NCA List
        </Tabs.Trigger>
        <Tabs.Trigger value="nca-chart">
          NCA Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="nca-allocation-map">
          NCA Allocation Supply
        </Tabs.Trigger>
        <Tabs.Trigger value="nca-allocation-demand-map">
          NCA Allocation Demand
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

      <Tabs.Content value="lnrs-allocation-map">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
          <RegionAllocationHeatMap
            allocations={allocations}
            regionField="lnrs"
            nameField="Name"
            boundaries={lnrsBoundaries}
            specialMarkers={SCILLY_LNRS_MARKERS}
            description="Allocations grouped by where the BGS gain site is located (supply)."
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
      </Tabs.Content>

      <Tabs.Content value="lnrs-allocation-demand-map">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
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

      <Tabs.Content value="lpa-allocation-map">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
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
      </Tabs.Content>

      <Tabs.Content value="lpa-allocation-demand-map">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
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

      <Tabs.Content value="nca-allocation-map">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
          <RegionAllocationHeatMap
            allocations={allocations}
            regionField="nca"
            nameField="NCA_Name"
            boundaries={ncaBoundaries}
            specialMarkers={SCILLY_NCA_MARKERS}
            heatFrom={BLUE_PALETTE.heatFrom}
            heatTo={BLUE_PALETTE.heatTo}
            accentColor={BLUE_PALETTE.accentColor}
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
      </Tabs.Content>

      <Tabs.Content value="nca-allocation-demand-map">
        <Box height={`calc(100vh - ${NAV_HEIGHT})`} width="100%">
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
      </Tabs.Content>
    </Tabs.Root>
  ), [activeTab, handleChartHover, handleExpandedBodyChanged, setHoveredSite, lnrs, lpas, ncas, responsibleBodies, sites, allocations, lnrsBoundaries, lpaBoundaries, ncaBoundaries, handleFilterCleared, handleFilteredBodiesChange]);

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
    />
  );
}
