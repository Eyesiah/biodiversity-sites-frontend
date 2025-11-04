'use client'

import { useState, useCallback, useEffect, useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SiteList from '@/components/data/SiteList';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { Box, Text, SimpleGrid } from '@chakra-ui/react';
import { ContentStack } from '@/components/styles/ContentStack'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { SitesAreaCompositionChart } from '@/components/charts/SitesAreaCompositionChart';
// Constants for habitat calculations
const HABITAT_DISTINCTIVENESS_SCORES = {
  'low': 1, 'medium': 2, 'high': 3
};

const HABITAT_CONDITION_SCORES = {
  'good': 3,
  'fairly good': 2.5,
  'moderate': 2,
  'fairly poor': 1.5,
  'poor': 1,
  'condition assessment n/a': 1,
  'n/a – other': 0,
  'n/a - other': 0,
};

const CALCULATION_CONSTANTS = {
  STRATEGIC_SIGNIFICANCE: 1.0,
  SPATIAL_RISK: 1.0,
  TEMPORAL_RISK: 1.0, // Simplified
  DIFFICULTY_FACTOR: 1.0 // Simplified
};

// Utility functions for habitat calculations
const getDistinctivenessScore = (habitat) => HABITAT_DISTINCTIVENESS_SCORES[habitat] || 1;

const getConditionScore = (condition) => {
  const key = condition.toLowerCase().trim();
  return HABITAT_CONDITION_SCORES[key] || 1;
};

const calculateBaselineHUInline = (size, habitat, condition) => {
  return size * getDistinctivenessScore(habitat) * getConditionScore(condition) * CALCULATION_CONSTANTS.STRATEGIC_SIGNIFICANCE;
};

const calculateImprovementHUInline = (size, habitat, condition, interventionType) => {
  if (interventionType.toLowerCase() === 'creation') {
    return size * getDistinctivenessScore(habitat) * getConditionScore(condition) *
           CALCULATION_CONSTANTS.STRATEGIC_SIGNIFICANCE * CALCULATION_CONSTANTS.TEMPORAL_RISK *
           CALCULATION_CONSTANTS.DIFFICULTY_FACTOR * CALCULATION_CONSTANTS.SPATIAL_RISK;
  } else if (interventionType.toLowerCase() === 'enhanced') {
    return 0; // No HU calculation for enhanced
  }
  return 0;
};

// Helper function to sum habitat units from an array of habitats
const sumHabitatUnits = (habitats, calculateFn) => {
  if (!habitats) return 0;
  return habitats.reduce((sum, habitat) => {
    if (habitat.HUs !== undefined) return sum + habitat.HUs;
    return sum + calculateFn(habitat.size || 0, habitat.type || '', habitat.condition || 'N/A - Other', habitat.interventionType || '');
  }, 0);
};

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

// Column configuration for the main sites list page (includes LNRS and IMD Decile)
const FULL_SITE_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName', 'lnrsName', 'imdDecile'];

export default function SiteListPageContent({ sites, fullSites, summary, imdChart }) {
  const [hoveredSite, setHoveredSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [filteredSites, setFilteredSites] = useState(sites);

  // Update filteredSites when sites prop changes
  useEffect(() => {
    setFilteredSites(sites);
  }, [sites]);

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
  };

  const handleExport = async () => {
    const response = await fetch('api/query/sites/csv');
    const blob = await response.blob();
    triggerDownload(blob, 'bgs-sites.csv');
  };

  const handleSortedItemsChange = useCallback((sortedItems) => {
    // todo: fix infinite loop here
    //setFilteredSites(sortedItems);
  }, []);

  return (
    <MapContentLayout
      map={
        <SiteMap sites={filteredSites} hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} />
      }
      content={
        <ContentStack>
          <SearchableTableLayout
            initialItems={sites}
            filterPredicate={(item, term) => {
              const lowercasedTerm = term.toLowerCase();
              return (
                (item.referenceNumber?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.responsibleBodies?.join(', ').toLowerCase() || '').includes(lowercasedTerm) ||
                (item.lpaName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.ncaName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.lnrsName?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.imdDecile?.toString() || '').includes(lowercasedTerm)
              );
            }}
            initialSortConfig={{ key: 'referenceNumber', direction: 'descending' }}
            placeholder="Search by BGS reference, Responsible Body, LPA or NCA."
            exportConfig={{
              onExportCsv: handleExport
            }}
            summary={(filteredCount, totalCount, sortedItems) => {
              // Calculate filtered totals from the current sorted/filtered items
              const filteredFullSites = sortedItems.map(processedSite =>
                fullSites.find(fullSite => fullSite.referenceNumber === processedSite.referenceNumber)
              ).filter(Boolean);

              const filteredArea = filteredFullSites.reduce((sum, site) => sum + (site.siteSize || 0), 0);

              let filteredBaselineHUs = 0;
              let filteredCreatedHUs = 0;

              // Calculate habitat units for all filtered sites
              filteredFullSites.forEach(site => {
                // Sum baseline HUs from all habitat types
                if (site.habitats) {
                  filteredBaselineHUs += sumHabitatUnits(site.habitats.areas, calculateBaselineHUInline);
                  filteredBaselineHUs += sumHabitatUnits(site.habitats.hedgerows, calculateBaselineHUInline);
                  filteredBaselineHUs += sumHabitatUnits(site.habitats.watercourses, calculateBaselineHUInline);
                }

                // Sum improvement HUs from all habitat types
                if (site.improvements) {
                  filteredCreatedHUs += sumHabitatUnits(site.improvements.areas, calculateImprovementHUInline);
                  filteredCreatedHUs += sumHabitatUnits(site.improvements.hedgerows, calculateImprovementHUInline);
                  filteredCreatedHUs += sumHabitatUnits(site.improvements.watercourses, calculateImprovementHUInline);
                }
              });

              return (
                <Text fontSize="1.2rem">
                  This list of <Text as="strong">{formatNumber(filteredCount, 0)}</Text> sites covers <Text as="strong">{formatNumber(filteredArea, 0)}</Text> hectares.
                  They comprise <Text as="strong">{formatNumber(filteredBaselineHUs, 0)}</Text> baseline and <Text as="strong">{formatNumber(filteredCreatedHUs, 0)}</Text> created improvement habitat units.
                </Text>
              );
            }}
            onSortedItemsChange={handleSortedItemsChange}
            tabs={[
              {
                title: "Sites",
                content: ({ sortedItems }) => (
                  <Box width="100%" overflowX="auto">
                    <SiteList
                      sites={sortedItems}
                      onSiteHover={setHoveredSite}
                      onSiteClick={handleSiteSelect}
                      columns={FULL_SITE_COLUMNS}
                    />
                  </Box>
                )
              },
              {
                title: "IMD Decile chart",
                content: ({ sortedItems }) => (
                  <Box display="flex" flexDirection="row" width="100%" height="500px" marginBottom="5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={imdChart} margin={{ top: 50, right: 30, left: 20, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" name="BGS IMD Score" label={{ value: 'BGS IMD Score', position: 'insideBottom', offset: -10, fill: '#36454F', fontWeight: 'bold', fontSize: '1.1rem' }} tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                        <YAxis tick={{ fill: '#36454F' }} axisLine={{ stroke: 'black' }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#dcab1bff">
                          <LabelList />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )
              },
              {
                title: ({ sortedItems }) => `BGS Site Use Chart (${sortedItems.length})`,
                content: ({ sortedItems }) => {
                  // Map processed sites back to full sites for chart data
                  const fullSitesForChart = sortedItems.map(processedSite =>
                    fullSites.find(fullSite => fullSite.referenceNumber === processedSite.referenceNumber)
                  ).filter(Boolean);
                  return <SitesAreaCompositionChart sites={fullSitesForChart} />;
                }
              },

            ]}
          />
        </ContentStack>
      }
    />
  )
}
