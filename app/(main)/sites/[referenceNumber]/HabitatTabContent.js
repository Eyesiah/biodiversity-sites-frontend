'use client'

import { HabitatTable } from "@/components/data/HabitatsTable"
import { ContentStack } from '@/components/styles/ContentStack'
import { PrimaryCard, CardTitle } from '@/components/styles/PrimaryCard'
import { Collapsible, Heading } from '@chakra-ui/react'
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
          <Heading as="h2" size="lg">{`${habitatType} Improvements ${improvementOpen ? '▼' : '▶'}`}</Heading>            
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
          <Heading as="h2" size="lg">{`Baseline ${habitatType} ${improvementOpen ? '▼' : '▶'}`}</Heading>
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
