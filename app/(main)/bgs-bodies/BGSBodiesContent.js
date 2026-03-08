'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { Tabs } from '@/components/styles/Tabs';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import ResponsibleBodiesContent from './ResponsibleBodiesContent';
import LPAContent from './LPAContent';
import NCAContent from './NCAContent';
import LNRSContent from './LNRSContent';
import { ResponsibleBodyMetricsChart } from '@/components/charts/ResponsibleBodyMetricsChart';
import { LPAMetricsChart } from '@/components/charts/LPAMetricsChart';
import { NCAMetricsChart } from '@/components/charts/NCAMetricsChart';
import { LNRSMetricsChart } from '@/components/charts/LNRSMetricsChart';
import { ARCGIS_LPA_URL, ARCGIS_LNRS_URL } from '@/config';

const PolygonMap = dynamic(() => import('@/components/map/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

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
    console.log('Filter cleared - resetting map state');
    // Reset map state to show all bodies for the current tab
    setSelectedBody(null);
    setMapSites([]);
  }, []);
  const [activeTab, setActiveTab] = useState('responsible-bodies');

  // Shared map state
  const [mapSites, setMapSites] = useState([]);
  const [hoveredSite, setHoveredSite] = useState(null); // For list tabs
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedBody, setSelectedBody] = useState(null);
  const [filteredBodies, setFilteredBodies] = useState(null); // null means no filter

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

  // Helper function to get bodies that have at least one site
  const getBodiesWithSites = useCallback((bodies, sites) => {
    if (!bodies || !sites) return [];
    
    // Create a set of site reference numbers for quick lookup
    const siteRefs = new Set(sites.map(site => site.referenceNumber));
    
    return bodies.filter(body => {
      // Check if the body has any sites (by checking if any site reference matches)
      if (body.sites && body.sites.length > 0) {
        return body.sites.some(siteRef => siteRefs.has(siteRef));
      }
      return false;
    });
  }, []);

  // Reset map state when switching tabs
  useEffect(() => {
    setMapSites([]);
    setHoveredSite(null);
    setSelectedSite(null);
    setSelectedBody(null);
    setFilteredBodies(null); // Clear any filters when switching tabs
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
      
      // NEW: Use ref-based approach to directly set filter value on the appropriate content component
      console.log(`SETTING FILTER VALUE ${clickedBody.name} via ref`);
      
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
  const handleFilteredBodiesChange = useCallback((filteredBodies) => {
    // Update map to show only filtered bodies
    setSelectedBody(null);
    setMapSites([]);
    
    // Update filteredBodies state to trigger selectedBodiesForMap recalculation
    setFilteredBodies(filteredBodies || null);
    
    // If there are filtered bodies, get their sites
    if (filteredBodies && filteredBodies.length > 0) {
      const filteredSites = [];
      filteredBodies.forEach(body => {
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
    
    // If filtered bodies exist, show only filtered bodies
    if (filteredBodies && filteredBodies.length > 0) {
      return filteredBodies;
    }
    
    // Otherwise show all bodies for current tab
    switch (activeTab) {
      case 'lpa':
      case 'lpa-chart':
        return getBodiesWithSites(lpas, sites);
      case 'nca':
      case 'nca-chart':
        return getBodiesWithSites(ncas, sites);
      case 'lnrs':
      case 'lnrs-chart':
        return getBodiesWithSites(lnrs, sites);
      default:
        return [];
    }
  }, [selectedBody, filteredBodies, activeTab, lpas, ncas, lnrs, sites, getBodiesWithSites]);

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
        <Tabs.Trigger value="lpa">
          LPA List
        </Tabs.Trigger>
        <Tabs.Trigger value="lpa-chart">
          LPA Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="nca">
          NCA List
        </Tabs.Trigger>
        <Tabs.Trigger value="nca-chart">
          NCA Chart
        </Tabs.Trigger>
        <Tabs.Trigger value="lnrs">
          LNRS List
        </Tabs.Trigger>
        <Tabs.Trigger value="lnrs-chart">
          LNRS Chart
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

      <Tabs.Content value="lpa">
        <LPAContent
          ref={lpaContentRef}
          lpas={lpas}
          sites={sites}
          onExpandedRowChanged={handleExpandedBodyChanged}
          onHoveredSiteChange={setHoveredSite}
          onSelectedSiteChange={setSelectedSite}
          onFilterCleared={handleFilterCleared}
          onSortedItemsChange={handleFilteredBodiesChange}
        />
      </Tabs.Content>

      <Tabs.Content value="lpa-chart">
        <LPAMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
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
          onSortedItemsChange={handleFilteredBodiesChange}
        />
      </Tabs.Content>

      <Tabs.Content value="nca-chart">
        <NCAMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
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
          onSortedItemsChange={handleFilteredBodiesChange}
        />
      </Tabs.Content>

      <Tabs.Content value="lnrs-chart">
        <LNRSMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
      </Tabs.Content>
    </Tabs.Root>
  ), [activeTab, handleChartHover, handleExpandedBodyChanged, setHoveredSite, lnrs, lpas, ncas, responsibleBodies, sites, handleFilterCleared, handleFilteredBodiesChange]);

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
      map={<PolygonMap
        selectedItems={selectedBodiesForMap}
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
