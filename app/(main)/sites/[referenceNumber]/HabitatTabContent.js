'use client'

import { HabitatTable } from "@/components/data/HabitatsTable"
import { ContentStack } from '@/components/styles/ContentStack'
import { PrimaryCard, CardTitle } from '@/components/styles/PrimaryCard'
import { Collapsible, Text } from '@chakra-ui/react'
import { useState } from 'react'
import SiteHabitatSankeyChart from "@/components/charts/SiteHabitatSankeyChart";

export default function HabitatTabContent({
  sankeyData,
  habitatType,
  units,
  improvementHabitats,
  improvementSortConfig,
  improvementRequestSort,
  baselineHabitats,
  baselineSortConfig,
  baselineRequestSort
}) {
  const [improvementOpen, setImprovementOpen] = useState(true);
  const [baselineOpen, setBaselineOpen] = useState(true);

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
              habitats={improvementHabitats}
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
              habitats={baselineHabitats}
              sortConfig={baselineSortConfig}
              isBaseline={true}
              requestSort={baselineRequestSort}
              units={units}
            />
          </Collapsible.Content>
        </Collapsible.Root>
      </PrimaryCard>
    </ContentStack>
  )
}
