'use client'

import { HabitatsCard } from "@/components/HabitatsCard"
import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/MapContentLayout';
import { SiteDetailsCard} from './SiteDetailsCard'
import { AllocationsCard } from './AllocationsCard'
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { ContentStack } from '@/components/ui/ContentStack'
import { Flex } from "@chakra-ui/react"
import { Button } from '@/components/ui/Button';

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
  return (  
    <MapContentLayout
      map={
        <SiteMap sites={[site]} selectedSite={site} />
      }
      content={(

        <ContentStack>
                    
          <SiteDetailsCard site={site} />

          <HabitatsCard
            title="Improvement Habitats (click any habitat cell for more detail)"
            habitats = {site.improvements}
            isImprovement={true}
          />

          <HabitatsCard
            title="Baseline Habitats (click any habitat cell for more detail)"
            habitats = {site.habitats}
            isImprovement={false}
          />

          <AllocationsCard 
            title="Allocations (click any allocation for more detail)"
            allocations={site.allocations}
          />

          <Flex gap="0.5rem" justifyContent="center">
            <Button onClick={() => handleExportXML(site)}>Export to XML</Button>
            <Button onClick={() => handleExportJSON(site)}>Export to JSON</Button>
          </Flex>
          
        </ContentStack>
        
      )}          
    />
  )
}