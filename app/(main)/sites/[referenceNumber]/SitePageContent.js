'use client'

import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/ui/MapContentLayout';
import { SiteDetailsCard } from './SiteDetailsCard'
import { AllocationsTable } from './AllocationsTable'
import HabitatTabContent from './HabitatTabContent'
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { ContentStack } from '@/components/styles/ContentStack'
import { Flex } from "@chakra-ui/react"
import { Button } from '@/components/styles/Button';
import { Tabs } from '@/components/styles/Tabs';
import { ImdScoresChart } from '@/components/charts/ImdScoresChart';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

// Units constants
const UNITS = {
  HECTARES: 'ha',
  KILOMETRES: 'km'
};

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const handleExportXML = (site) => {
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const xmlDataStr = builder.build({ site });

  const blob = new Blob([xmlDataStr], { type: 'application/xml' });
  triggerDownload(blob, `bgs-site-${site.referenceNumber}.xml`);
};

const handleExportJSON = (site) => {
  const jsonDataStr = JSON.stringify({ site }, null, 2);

  const blob = new Blob([jsonDataStr], { type: 'application/json' });
  triggerDownload(blob, `bgs-site-${site.referenceNumber}.json`);
};

export default function SitePageContent({ site, sankeyData }) {
  const [shouldRenderAllocationLayer, setShouldRenderAllocationLayer] = useState(false);
  const contentRef = useRef(null);


  const { items: sortedImprovementAreas, requestSort: requestSortImprovementAreas, sortConfig: sortConfigImprovementAreas } = useSortableData(site.improvements.areas, { key: 'type', direction: 'ascending' });
  const { items: sortedIndividualTreesImprovements, requestSort: requestSortIndividualTreesImprovements, sortConfig: sortConfigIndividualTreesImprovements } = useSortableData(site.improvements.trees, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementHedgerows, requestSort: requestSortImprovementHedgerows, sortConfig: sortConfigImprovementHedgerows } = useSortableData(site.improvements.hedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementWatercourses, requestSort: requestSortImprovementWatercourses, sortConfig: sortConfigImprovementWatercourses } = useSortableData(site.improvements.watercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineAreas, requestSort: requestSortBaselineAreas, sortConfig: sortConfigBaselineAreas } = useSortableData(site.habitats.areas, { key: 'type', direction: 'ascending' });
  const { items: sortedIndividualTreesBaseline, requestSort: requestSortIndividualTreesBaseline, sortConfig: sortConfigIndividualTreesBaseline } = useSortableData(site.habitats.trees, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineHedgerows, requestSort: requestSortBaselineHedgerows, sortConfig: sortConfigBaselineHedgerows } = useSortableData(site.habitats.hedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineWatercourses, requestSort: requestSortBaselineWatercourses, sortConfig: sortConfigBaselineWatercourses } = useSortableData(site.habitats.watercourses, { key: 'type', direction: 'ascending' });
  const tabs = useMemo(() => [
    {
      title: `Areas&nbsp;(${Math.max(site.habitats.areas.length, site.improvements.areas.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={sankeyData.areas}
          habitatType="Area Habitats"
          units={UNITS.HECTARES}
          improvementHabitats={sortedImprovementAreas}
          improvementSortConfig={sortConfigImprovementAreas}
          improvementRequestSort={requestSortImprovementAreas}
          baselineHabitats={sortedBaselineAreas}
          baselineSortConfig={sortConfigBaselineAreas}
          baselineRequestSort={requestSortBaselineAreas}
        />
      )
    },
    {
      title: `Individual Trees&nbsp;(${Math.max(sortedIndividualTreesBaseline.length, sortedIndividualTreesImprovements.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={sankeyData.trees}
          habitatType="Individual Trees"
          units={UNITS.HECTARES}
          improvementHabitats={sortedIndividualTreesImprovements}
          improvementSortConfig={sortConfigIndividualTreesImprovements}
          improvementRequestSort={requestSortIndividualTreesImprovements}
          baselineHabitats={sortedIndividualTreesBaseline}
          baselineSortConfig={sortConfigIndividualTreesBaseline}
          baselineRequestSort={requestSortIndividualTreesBaseline}
        />
      ),
      shouldRender: () => site.improvements.trees.length > 0 || site.habitats.trees.length > 0
    },
    {
      title: `Hedgerow&nbsp;(${Math.max(site.habitats.hedgerows.length, site.improvements.hedgerows.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={sankeyData.hedgerows}
          habitatType="Hedgerows"
          units={UNITS.KILOMETRES}
          improvementHabitats={sortedImprovementHedgerows}
          improvementSortConfig={sortConfigImprovementHedgerows}
          improvementRequestSort={requestSortImprovementHedgerows}
          baselineHabitats={sortedBaselineHedgerows}
          baselineSortConfig={sortConfigBaselineHedgerows}
          baselineRequestSort={requestSortBaselineHedgerows}
        />
      ),
      shouldRender: () => site.habitats.hedgerows.length > 0 || site.improvements.hedgerows.length > 0
    },
    {
      title: `Watercourse&nbsp;(${Math.max(site.habitats.watercourses.length, site.improvements.watercourses.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={sankeyData.watercourses}
          habitatType="Watercourses"
          units={UNITS.KILOMETRES}
          improvementHabitats={sortedImprovementWatercourses}
          improvementSortConfig={sortConfigImprovementWatercourses}
          improvementRequestSort={requestSortImprovementWatercourses}
          baselineHabitats={sortedBaselineWatercourses}
          baselineSortConfig={sortConfigBaselineWatercourses}
          baselineRequestSort={requestSortBaselineWatercourses}
        />
      ),
      shouldRender: () => site.habitats.watercourses.length > 0 || site.improvements.watercourses.length > 0
    },
    {
      title: `Allocations&nbsp;(${site.allocations.length})`,
      content: () => (
        <AllocationsTable
          title="Allocations"
          allocations={site.allocations}
        />
      ),
      onIsActiveTabChanged: (isActive) => {
        console.log(`setShouldRenderAllocationLayer: ${isActive}`);
        setShouldRenderAllocationLayer(isActive);
      }
    },
    {
      title: 'IMD Score<br>Transfers Chart',
      content: () => {
        return (
          <ImdScoresChart site={site} />
        )
      },
      shouldRender: () => site.allocations.length > 0
    },
    {
      title: 'Data Export',
      content: () => (
        <Flex gap="0.5rem" justifyContent="center">
          <Button onClick={() => handleExportXML(site)}>Export to XML</Button>
          <Button onClick={() => handleExportJSON(site)}>Export to JSON</Button>
        </Flex>
      )
    }
  ], [
    site,
    sankeyData
  ]);

  const handleTabChange = useCallback((newTabIndex) => {
    // Call onIsActiveTabChanged callbacks for all tabs
    tabs.forEach((tab, index) => {
      if (tab.onIsActiveTabChanged) {
        tab.onIsActiveTabChanged(index === newTabIndex.value);
      }
    });
  }, [tabs]);

  // Initialize the active tab callback on mount
  useEffect(() => {
    handleTabChange(0); // Default to first tab
  }, [handleTabChange]);

  return (
    <MapContentLayout
      map={
        <SiteMap
          sites={[site]}
          selectedSite={site}
          isForSitePage={true}
          shouldRenderAllocationLayer={shouldRenderAllocationLayer}
        />
      }
      content={(

        <ContentStack ref={contentRef}>

          <SiteDetailsCard site={site} />

          <Tabs.Root lazyMount defaultValue={0} onValueChange={handleTabChange} width="100%">
            <Tabs.List>
              {tabs.map((tab, index) => (
                (tab.shouldRender == null || tab.shouldRender()) && (
                  <Tabs.Trigger
                    key={index}
                    value={index}
                    dangerouslySetInnerHTML={{ __html: tab.title }}
                  />
                )
              ))}
            </Tabs.List>
            {tabs.map((tab, index) => (
              <Tabs.Content key={index} value={index} paddingTop={1}>
                {tab.content()}
              </Tabs.Content>
            ))}
          </Tabs.Root>


        </ContentStack>

      )}
    />
  )
}
