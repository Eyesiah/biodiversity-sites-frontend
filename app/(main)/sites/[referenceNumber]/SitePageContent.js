'use client'

import { HabitatsCard, HabitatTable } from "@/components/HabitatsCard"
import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/MapContentLayout';
import { SiteDetailsCard} from './SiteDetailsCard'
import { AllocationsCard } from './AllocationsCard'
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { ContentStack } from '@/components/ui/ContentStack'
import { Tabs, Flex } from "@chakra-ui/react"
import { Button } from '@/components/ui/Button';
import { useSortableData } from '@/lib/hooks';

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
      title: 'Improvement Areas',
      content: () => {
        return (<HabitatTable
          title="Improvement Areas"
          habitats={sortedImprovementAreas}
          sortConfig={sortConfigImprovementAreas}
          isImprovement={true}
          requestSort={requestSortImprovementAreas}
        />)
      }
    },
    {
      title: 'Improvement Hedgerows',
      content: () => {
        return (<HabitatTable
          title="Improvement Hedgerows"
          habitats={sortedImprovementHedgerows}
          sortConfig={sortConfigImprovementHedgerows}
          isImprovement={true}
          requestSort={requestSortImprovementHedgerows}
        />)
      }
    },
    {
      title: 'Improvement Watercourses',
      content: () => {
        return (<HabitatTable
          title="Improvement Watercourses"
          habitats={sortedImprovementWatercourses}
          sortConfig={sortConfigImprovementWatercourses}
          isImprovement={true}
          requestSort={requestSortImprovementWatercourses}
        />)
      }
    },
    {
      title: 'Baseline Areas',
      content: () => {
        return (<HabitatTable
          title="Baseline Areas"
          habitats={sortedBaselineAreas}
          sortConfig={sortConfigBaselineAreas}
          isBaseline={true}
          requestSort={requestSortBaselineAreas}
        />)
      }
    },
    {
      title: 'Baseline Hedgerows',
      content: () => {
        return (<HabitatTable
          title="Baseline Hedgerows"
          habitats={sortedBaselineHedgerows}
          sortConfig={sortConfigBaselineHedgerows}
          isBaseline={true}
          requestSort={requestSortBaselineHedgerows}
        />)
      }
    },
    {
      title: 'Baseline Watercourses',
      content: () => {
        return (<HabitatTable
          title="Baseline Watercourses"
          habitats={sortedBaselineWatercourses}
          sortConfig={sortConfigBaselineWatercourses}
          isBaseline={true}
          requestSort={requestSortBaselineWatercourses}
        />)
      }
    },
    {
      title: 'Allocations',
      content: () => (
        <AllocationsCard 
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
            <Tabs.List
              width="100%"
            >
              {tabs.map((tab, index) => (
                <Tabs.Trigger
                  key={index}
                  value={index}
                  _selected={{ color: '#333', borderColor: '#2980b9', borderBottomWidth: '2px' }}
                  color="#aaa"
                >
                  {tab.title}
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