'use client'

import { HabitatTable } from "@/components/data/HabitatsTable"
import { ContentStack } from '@/components/styles/ContentStack'
import { PrimaryCard, CardTitle } from '@/components/styles/PrimaryCard'
import { Collapsible, Text } from '@chakra-ui/react'
import { useState } from 'react'
import SiteHabitatSankeyChart from "@/components/charts/SiteHabitatSankeyChart";
import { useSortableData } from '@/lib/hooks';

export default function HabitatTabContent({
  sankeyData,
  habitatType,
  units,
  improvements,
  baseline,
}) {
  const [improvementOpen, setImprovementOpen] = useState(true);
  const [baselineOpen, setBaselineOpen] = useState(true);

  const { items: improvementItems, requestSort: improvementRequestSort, sortConfig: improvementSortConfig } = useSortableData(improvements || [], { key: 'type', direction: 'ascending' });
  const { items: baselineItems, requestSort: baselineRequestSort, sortConfig: baselineSortConfig } = useSortableData(baseline || [], { key: 'type', direction: 'ascending' });

  return (
    <ContentStack>
      <SiteHabitatSankeyChart data={sankeyData} habitatType={habitatType} />
      <PrimaryCard>
        <CardTitle onClick={() => setImprovementOpen(!improvementOpen)}>
          <Text >{`${habitatType} Improvements ${improvementOpen ? '▼' : '▶'}`}</Text>            
        </CardTitle>
        <Collapsible.Root open={improvementOpen} onOpenChange={setImprovementOpen}>
          <Collapsible.Content>
            <HabitatTable
              habitats={improvementItems}
              sortConfig={improvementSortConfig}
              isImprovement={true}
              requestSort={improvementRequestSort}
              units={units}
            />
          </Collapsible.Content>
        </Collapsible.Root>
      </PrimaryCard>
      <PrimaryCard>
        <CardTitle onClick={() => setBaselineOpen(!baselineOpen)}>
          <Text >{`Baseline ${habitatType} ${improvementOpen ? '▼' : '▶'}`}</Text>
        </CardTitle>
        <Collapsible.Root open={baselineOpen} onOpenChange={setBaselineOpen}>
          <Collapsible.Content>
            <HabitatTable
              habitats={baselineItems}
              sortConfig={baselineSortConfig}
              requestSort={baselineRequestSort}
              units={units}
            />
          </Collapsible.Content>
        </Collapsible.Root>
      </PrimaryCard>
    </ContentStack>
  )
}
