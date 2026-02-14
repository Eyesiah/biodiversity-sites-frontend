'use client';

import { useState, useMemo, useEffect } from 'react';
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

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const PolygonMap = dynamic(() => import('@/components/map/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function BGSBodiesContent({
  responsibleBodies = [],
  lpas = [],
  lpaSites = [],
  ncas = [],
  ncaSites = [],
  lnrs = [],
  lnrsSites = [],
  error = null
}) {
  const [activeTab, setActiveTab] = useState('responsible-bodies');
  
  // Shared map state
  const [mapSites, setMapSites] = useState([]);
  const [hoveredSite, setHoveredSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedPolygon, setSelectedPolygon] = useState(null);

  // Reset map state when switching tabs
  useEffect(() => {
    setMapSites([]);
    setHoveredSite(null);
    setSelectedSite(null);
    setSelectedPolygon(null);
  }, [activeTab]);

  // Map configuration based on active tab - must be called before any early returns
  const mapConfig = useMemo(() => {
    switch (activeTab) {
      case 'responsible-bodies':
      case 'rb-chart':
        return { type: 'site', sites: mapSites };
      case 'lpa':
      case 'lpa-chart':
        return {
          type: 'polygon',
          geoJsonUrl: ARCGIS_LPA_URL,
          nameProperty: 'name',
          selectedItem: selectedPolygon,
          sites: mapSites,
          style: { color: '#3498db', weight: 2, opacity: 0.8, fillOpacity: 0.2 }
        };
      case 'nca':
      case 'nca-chart':
        return {
          type: 'polygon',
          geoJsonUrl: 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query',
          nameProperty: 'name',
          selectedItem: selectedPolygon,
          sites: mapSites,
          style: { color: '#8e44ad', weight: 2, opacity: 0.8, fillOpacity: 0.2 }
        };
      case 'lnrs':
      case 'lnrs-chart':
        return {
          type: 'polygon',
          geoJsonUrl: ARCGIS_LNRS_URL,
          nameProperty: 'name',
          selectedItem: selectedPolygon,
          sites: mapSites,
          style: { color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.3 }
        };
      default:
        return { type: 'site', sites: [] };
    }
  }, [activeTab, mapSites, selectedPolygon]);

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

  const renderMap = () => {
    // For chart tabs, render SiteMap with empty sites to avoid polygon fetch attempts
    const isChartTab = activeTab.endsWith('-chart');
    
    // Only render PolygonMap if we have a selected polygon to avoid "No polygon data found" errors
    if (mapConfig.type === 'polygon' && !isChartTab && selectedPolygon) {
      return (
        <PolygonMap
          key={activeTab}
          selectedItem={mapConfig.selectedItem}
          geoJsonUrl={mapConfig.geoJsonUrl}
          nameProperty={mapConfig.nameProperty}
          sites={mapConfig.sites}
          style={mapConfig.style}
        />
      );
    }
    return (
      <SiteMap
        key={activeTab}
        sites={mapConfig.sites}
        hoveredSite={hoveredSite}
        selectedSite={selectedSite}
        onSiteSelect={setSelectedSite}
      />
    );
  };

  return (
    <MapContentLayout
      map={renderMap()}
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
              responsibleBodies={responsibleBodies}
              onMapSitesChange={setMapSites}
              onHoveredSiteChange={setHoveredSite}
              onSelectedSiteChange={setSelectedSite}
            />
          </Tabs.Content>

          <Tabs.Content value="rb-chart">
            <ResponsibleBodyMetricsChart sites={responsibleBodies.flatMap(body => body.sites)} />
          </Tabs.Content>

          <Tabs.Content value="lpa">
            <LPAContent
              lpas={lpas}
              sites={lpaSites}
              onMapSitesChange={setMapSites}
              onSelectedPolygonChange={setSelectedPolygon}
            />
          </Tabs.Content>

          <Tabs.Content value="lpa-chart">
            <LPAMetricsChart sites={lpaSites} />
          </Tabs.Content>

          <Tabs.Content value="nca">
            <NCAContent
              ncas={ncas}
              sites={ncaSites}
              error={null}
              onMapSitesChange={setMapSites}
              onSelectedPolygonChange={setSelectedPolygon}
            />
          </Tabs.Content>

          <Tabs.Content value="nca-chart">
            <NCAMetricsChart sites={ncaSites} />
          </Tabs.Content>

          <Tabs.Content value="lnrs">
            <LNRSContent
              lnrs={lnrs}
              sites={lnrsSites}
              error={null}
              onMapSitesChange={setMapSites}
              onSelectedPolygonChange={setSelectedPolygon}
            />
          </Tabs.Content>

          <Tabs.Content value="lnrs-chart">
            <LNRSMetricsChart sites={lnrsSites} />
          </Tabs.Content>
        </Tabs.Root>
      }
    />
  );
}
