'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  const [activeTab, setActiveTab] = useState('responsible-bodies');
  
  // Shared map state
  const [mapSites, setMapSites] = useState([]);
  const [hoveredSite, setHoveredSite] = useState(null); // For list tabs
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedBody, setSelectedBody] = useState(null);

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

  // Reset everything when the component unmounts (page loses focus)
  useEffect(() => {
    return () => {
      setActiveTab('responsible-bodies');
      setMapSites([]);
      setHoveredSite(null);
      setSelectedSite(null);
      setSelectedBody(null);
    };
  }, []);

  // Map configuration based on active tab - must be called before any early returns
  const mapConfig = useMemo(() => {
    switch (activeTab) {
      case 'responsible-bodies':
      case 'rb-chart':
        return { type: 'site' };
      case 'lpa':
      case 'lpa-chart':
        return {
          type: 'polygon',
          geoJsonUrl: ARCGIS_LPA_URL,
          nameProperty: 'name',
          selectedItem: selectedBody,
          style: { color: '#3498db', weight: 2, opacity: 0.8, fillOpacity: 0.2 }
        };
      case 'nca':
      case 'nca-chart':
        return {
          type: 'polygon',
          geoJsonUrl: 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query',
          nameProperty: 'name',
          selectedItem: selectedBody,
          style: { color: '#8e44ad', weight: 2, opacity: 0.8, fillOpacity: 0.2 }
        };
      case 'lnrs':
      case 'lnrs-chart':
        return {
          type: 'polygon',
          geoJsonUrl: ARCGIS_LNRS_URL,
          nameProperty: 'name',
          selectedItem: selectedBody,
          style: { color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.3 }
        };
      default:
        return { type: 'site', sites: [] };
    }
  }, [activeTab, selectedBody]);

  // Determine if we should disable zoom on the map (for chart hover)
  const disableZoom = activeTab === 'rb-chart' || activeTab === 'lpa-chart' || activeTab === 'nca-chart' || activeTab === 'lnrs-chart';

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
          key={activeTab}
          selectedItem={mapConfig.selectedItem}
          geoJsonUrl={mapConfig.geoJsonUrl}
          nameProperty={mapConfig.nameProperty}
          sites={mapSites}
          style={mapConfig.style}
          disableZoom={disableZoom}
          hoveredSite={hoveredSite}
          selectedSite={selectedSite}
        />}
      content={
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
              key={activeTab}
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
              key={activeTab}
              lpas={lpas}
              sites={sites}
              onExpandedRowChanged={handleExpandedBodyChanged}
              onHoveredSiteChange={setHoveredSite}
              onSelectedSiteChange={setSelectedSite}
            />
          </Tabs.Content>

          <Tabs.Content value="lpa-chart">
            <LPAMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
          </Tabs.Content>

          <Tabs.Content value="nca">
            <NCAContent
              key={activeTab}
              ncas={ncas}
              sites={sites}
              error={null}
              onExpandedRowChanged={handleExpandedBodyChanged}
              onHoveredSiteChange={setHoveredSite}
              onSelectedSiteChange={setSelectedSite}
            />
          </Tabs.Content>

          <Tabs.Content value="nca-chart">
            <NCAMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
          </Tabs.Content>

          <Tabs.Content value="lnrs">
            <LNRSContent
              key={activeTab}
              lnrs={lnrs}
              sites={sites}
              error={null}
              onExpandedRowChanged={handleExpandedBodyChanged}
              onHoveredSiteChange={setHoveredSite}
              onSelectedSiteChange={setSelectedSite}
            />
          </Tabs.Content>

          <Tabs.Content value="lnrs-chart">
            <LNRSMetricsChart sites={sites} onHoveredEntityChange={handleChartHover} />
          </Tabs.Content>
        </Tabs.Root>
      }
    />
  );
}
