'use client'

import { HabitatTable } from "@/components/data/HabitatsTable"
import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/ui/MapContentLayout';
import { SiteDetailsCard} from './SiteDetailsCard'
import { AllocationsTable } from './AllocationsTable'
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { ContentStack } from '@/components/styles/ContentStack'
import { Flex } from "@chakra-ui/react"
import { Button } from '@/components/styles/Button';
import { useSortableData } from '@/lib/hooks';
import { Tabs } from '@/components/styles/Tabs';
import { ImdScoresChart } from '@/components/charts/ImdScoresChart';
import SiteHabitatSankeyChart from "@/components/charts/SiteHabitatSankeyChart";

// Constants for Individual trees habitat types
const INDIVIDUAL_TREES_TYPES = ['Urban tree', 'Rural tree'];

// Units constants
const UNITS = {
  HECTARES: 'ha',
  KILOMETRES: 'km'
};

// Helper functions for filtering habitats
const isIndividualTree = (habitat) => INDIVIDUAL_TREES_TYPES.includes(habitat.type);
const isNotIndividualTree = (habitat) => !INDIVIDUAL_TREES_TYPES.includes(habitat.type);

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

export default function SitePageContent({site, sankeyData}) {

  // Filter out Individual trees from area data for existing tabs
  const filteredImprovementAreas = site.improvements.areas.filter(isNotIndividualTree);
  const filteredBaselineAreas = site.habitats.areas.filter(isNotIndividualTree);

  // Extract Individual trees data for new tabs
  const individualTreesImprovements = site.improvements.areas.filter(isIndividualTree);
  const individualTreesBaseline = site.habitats.areas.filter(isIndividualTree);

  const { items: sortedImprovementAreas, requestSort: requestSortImprovementAreas, sortConfig: sortConfigImprovementAreas } = useSortableData(filteredImprovementAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementHedgerows, requestSort: requestSortImprovementHedgerows, sortConfig: sortConfigImprovementHedgerows } = useSortableData(site.improvements.hedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementWatercourses, requestSort: requestSortImprovementWatercourses, sortConfig: sortConfigImprovementWatercourses } = useSortableData(site.improvements.watercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineAreas, requestSort: requestSortBaselineAreas, sortConfig: sortConfigBaselineAreas } = useSortableData(filteredBaselineAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineHedgerows, requestSort: requestSortBaselineHedgerows, sortConfig: sortConfigBaselineHedgerows } = useSortableData(site.habitats.hedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineWatercourses, requestSort: requestSortBaselineWatercourses, sortConfig: sortConfigBaselineWatercourses } = useSortableData(site.habitats.watercourses, { key: 'type', direction: 'ascending' });

  // Sort Individual trees data
  const { items: sortedIndividualTreesImprovements, requestSort: requestSortIndividualTreesImprovements, sortConfig: sortConfigIndividualTreesImprovements } = useSortableData(individualTreesImprovements, { key: 'type', direction: 'ascending' });
  const { items: sortedIndividualTreesBaseline, requestSort: requestSortIndividualTreesBaseline, sortConfig: sortConfigIndividualTreesBaseline } = useSortableData(individualTreesBaseline, { key: 'type', direction: 'ascending' });

  const tabs = [
    {
      title: 'Habitat<br>Transformation',
      content: () => {
        return <SiteHabitatSankeyChart data={sankeyData} />;
      }
    },
    {
      title: `Area<br>Improvements&nbsp;(${filteredImprovementAreas.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedImprovementAreas}
          sortConfig={sortConfigImprovementAreas}
          isImprovement={true}
          requestSort={requestSortImprovementAreas}
          units={UNITS.HECTARES}
        />)
      }
    },
    {
      title: `Baseline<br>Areas&nbsp;(${filteredBaselineAreas.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedBaselineAreas}
          sortConfig={sortConfigBaselineAreas}
          isBaseline={true}
          requestSort={requestSortBaselineAreas}
          units={UNITS.HECTARES}
        />)
      }
    },
    {
      title: `Individual Trees<br>Improvements&nbsp;(${individualTreesImprovements.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedIndividualTreesImprovements}
          sortConfig={sortConfigIndividualTreesImprovements}
          isImprovement={true}
          requestSort={requestSortIndividualTreesImprovements}
          units={UNITS.HECTARES}
        />)
      }
    },
    {
      title: `Individual Trees<br>Baseline&nbsp;(${individualTreesBaseline.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedIndividualTreesBaseline}
          sortConfig={sortConfigIndividualTreesBaseline}
          isBaseline={true}
          requestSort={requestSortIndividualTreesBaseline}
          units={UNITS.HECTARES}
        />)
      }
    },
    {
      title: `Hedgerow<br>Improvements&nbsp;(${site.improvements.hedgerows.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedImprovementHedgerows}
          sortConfig={sortConfigImprovementHedgerows}
          isImprovement={true}
          requestSort={requestSortImprovementHedgerows}
          units={UNITS.KILOMETRES}
        />)
      }
    },
    {
      title: `Baseline<br>Hedgerows&nbsp;(${site.habitats.hedgerows.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedBaselineHedgerows}
          sortConfig={sortConfigBaselineHedgerows}
          isBaseline={true}
          requestSort={requestSortBaselineHedgerows}
          units={UNITS.KILOMETRES}
        />)
      }
    },
    {
      title: `Watercourse<br>Improvements&nbsp;(${site.improvements.watercourses.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedImprovementWatercourses}
          sortConfig={sortConfigImprovementWatercourses}
          isImprovement={true}
          requestSort={requestSortImprovementWatercourses}
          units={UNITS.KILOMETERS}
        />)
      }
    },
    {
      title: `Baseline<br>Watercourses&nbsp;(${site.habitats.watercourses.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedBaselineWatercourses}
          sortConfig={sortConfigBaselineWatercourses}
          isBaseline={true}
          requestSort={requestSortBaselineWatercourses}
          units={UNITS.KILOMETERS}
        />)
      }
    },
    {
      title: `Allocations&nbsp;(${site.allocations.length})`,
      content: () => (
        <AllocationsTable 
          title="Allocations"
          allocations={site.allocations}
        />
      )
    },
  ];

  if (site.allocations.length > 0) {
    tabs.push({
      title: 'IMD Score<br>Transfers Chart',
      content: () => {
        return (          
          <ImdScoresChart site={site} />
        )
      }
    });
  }

  return (  
    <MapContentLayout
      map={
        <SiteMap sites={[site]} selectedSite={site} />
      }
      content={(

        <ContentStack>
                    
          <SiteDetailsCard site={site} />

          <Tabs.Root lazyMount defaultValue={0} width="100%">
            <Tabs.List>
              {tabs.map((tab, index) => (
                <Tabs.Trigger
                  key={index}
                  value={index}
                  dangerouslySetInnerHTML={{ __html: tab.title }}
                >
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {tabs.map((tab, index) => (
              <Tabs.Content key={index} value={index}>
                {tab.content()}
              </Tabs.Content>
            ))}
          </Tabs.Root>

          <Flex gap="0.5rem" justifyContent="center">
            <Button onClick={() => handleExportXML(site)}>Export to XML</Button>
            <Button onClick={() => handleExportJSON(site)}>Export to JSON</Button>
          </Flex>
          
        </ContentStack>
        
      )}          
    />
  )
}
