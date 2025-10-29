'use client'

import { HabitatTable } from "@/components/HabitatsTable"
import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/MapContentLayout';
import { SiteDetailsCard} from './SiteDetailsCard'
import { AllocationsTable } from './AllocationsTable'
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { ContentStack } from '@/components/ui/ContentStack'
import { Flex } from "@chakra-ui/react"
import { Button } from '@/components/ui/Button';
import { useSortableData } from '@/lib/hooks';
import { Tabs } from '@/components/ui/Tabs';

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
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

export default function SitePageContent({site}) {
    
  const { items: sortedImprovementAreas, requestSort: requestSortImprovementAreas, sortConfig: sortConfigImprovementAreas } = useSortableData(site.improvements.areas, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementHedgerows, requestSort: requestSortImprovementHedgerows, sortConfig: sortConfigImprovementHedgerows } = useSortableData(site.improvements.hedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementWatercourses, requestSort: requestSortImprovementWatercourses, sortConfig: sortConfigImprovementWatercourses } = useSortableData(site.improvements.watercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineAreas, requestSort: requestSortBaselineAreas, sortConfig: sortConfigBaselineAreas } = useSortableData(site.habitats.areas, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineHedgerows, requestSort: requestSortBaselineHedgerows, sortConfig: sortConfigBaselineHedgerows } = useSortableData(site.habitats.hedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineWatercourses, requestSort: requestSortBaselineWatercourses, sortConfig: sortConfigBaselineWatercourses } = useSortableData(site.habitats.watercourses, { key: 'type', direction: 'ascending' });

  const tabs = [
    {
      title: `Area<br>Improvements&nbsp;(${site.improvements.areas.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedImprovementAreas}
          sortConfig={sortConfigImprovementAreas}
          isImprovement={true}
          requestSort={requestSortImprovementAreas}
          units='ha'
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
          units='km'
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
          units='km'
        />)
      }
    },
    {
      title: `Baseline<br>Areas&nbsp;(${site.habitats.areas.length})`,
      content: () => {
        return (<HabitatTable
          habitats={sortedBaselineAreas}
          sortConfig={sortConfigBaselineAreas}
          isBaseline={true}
          requestSort={requestSortBaselineAreas}
          units='ha'
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
          units='km'
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
          units='km'
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