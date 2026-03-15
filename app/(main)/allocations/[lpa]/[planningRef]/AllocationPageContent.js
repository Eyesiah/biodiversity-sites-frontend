'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import AllocationListTab from './AllocationListTab';
import { Tabs } from '@/components/styles/Tabs';
import { FilteredAllocationsPieChart } from '@/components/charts/FilteredHabitatPieChart';
import AllocationAnalysis from '@/components/charts/AllocationAnalysis';
import ExternalLink from '@/components/ui/ExternalLink';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { InfoModal } from '@/components/ui/InfoModal';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import { Box, Text, VStack, Stack, Checkbox, Flex } from '@chakra-ui/react';
import InfoButton from '@/components/styles/InfoButton'
import { DetailRow, BodyDetailRow } from "@/components/data/DetailRow"
import { toaster } from '@/components/ui/toaster';
import Tooltip from '@/components/ui/Tooltip';
import LPAs from '@/data/LPAs.json';

// Build a lookup map from LPA name → planningPortalUrls[]
const lpaPortalMap = new Map(LPAs.map(lpa => [lpa.name, lpa.planningPortalUrls || []]));

// Dynamic import for SiteMap to avoid SSR issues with Leaflet
const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export const PlanningDetailsCard = ({ summary, allocations, bodyLayerStates }) => {

  const [modalState, setModalState] = useState({ show: false, type: null, name: null, title: '', data: null, size: 'md' });

  const medianAllocationDistance = useMemo(() => {
    if (!allocations || allocations.length === 0) return null;
    const distances = allocations.map(alloc => alloc.d).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) return null;
    const mid = Math.floor(distances.length / 2);
    return distances.length % 2 === 0 ? (distances[mid - 1] + distances[mid]) / 2 : distances[mid];
  }, [allocations]);

  const huTotal = useMemo(() => {
    return formatNumber(allocations.reduce((acc, alloc) => acc + (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0), 0));
  }, [allocations]);

  const showModal = (type, name, title, data, size = 'md') => {
    setModalState({ show: true, type, name: slugify(normalizeBodyName(name)), title, data, size: size });
  };

  const portalUrls = lpaPortalMap.get(summary.lpaName) || [];
  const singlePortalUrl = portalUrls.length === 1 ? portalUrls[0].url : null;

  const handlePlanningRefClick = () => {
    if (singlePortalUrl && summary.ref) {
      navigator.clipboard.writeText(summary.ref).catch(() => {});
      toaster.create({
        title: `Planning reference copied: ${summary.ref}`,
        description: `Paste it into the portal to search for this application.`,
        type: 'success',
        duration: 6000,
      });
    }
  };

  if (allocations.length == 0) {
    return <Text>No Allocations</Text>
  }

  return (
    <VStack>
      <Stack direction={['column', 'row']} width='100%'>
        <PrimaryCard>
          <Box>
            <DetailRow
              label="Planning Reference"
              value={
                singlePortalUrl ? (
                  <Tooltip text="Opens the LPA planning portal in a new tab. The planning reference will be copied to your clipboard ready to paste.">
                    <ExternalLink href={singlePortalUrl} onClick={handlePlanningRefClick}>
                      {summary.ref}
                    </ExternalLink>
                  </Tooltip>
                ) : (
                  summary.ref
                )
              }
            />
            <DetailRow label="Planning Address" value={summary.address} />

            <DetailRow label="Location (Lat/Long)" value={(summary.latitude && summary.longitude) ? `${summary.latitude.toFixed(5)}, ${summary.longitude.toFixed(5)}` : '??'} />
            {summary.latitude && summary.longitude && <DetailRow label="Map" value={<><ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${summary.latitude},${summary.longitude}`}>View on Google Maps</ExternalLink></>} />}

            <DetailRow label="Total HUs Allocated" value={huTotal} />
          </Box>
        </PrimaryCard>

        <PrimaryCard>
          <Box>
            <BodyDetailRow bodyType='nca' glossaryTerm='National Character Area (NCA)' hasData={summary.ncaName != null} isChecked={bodyLayerStates?.showNCA} setIsChecked={bodyLayerStates?.setShowNCA} >
              {summary.ncaName ? <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(summary.ncaName)}`}>{summary.ncaName}</ExternalLink> : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lpa' glossaryTerm='Local Planning Authority (LPA)' hasData={summary.lpaName != null} isChecked={bodyLayerStates?.showLPA} setIsChecked={bodyLayerStates?.setShowLPA} >
              {summary.lpaName ? (
                <InfoButton onClick={() => showModal('lpa', summary.lpaName, summary.lpaName)}>
                  <Text>{summary.lpaName}</Text>
                </InfoButton>
              ) : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lsoa' glossaryTerm='Lower Layer Super Output Area (LSOA)' hasData={summary.lsoa?.name != null} isChecked={bodyLayerStates?.showLSOA} setIsChecked={bodyLayerStates?.setShowLSOA} >
              {summary.lsoa?.name ? (
                <InfoButton onClick={() => showModal('lsoa', summary.lsoa.name, summary.lsoa.name, summary.lsoa)}>
                  <Text>{summary.lsoa.name}</Text>
                </InfoButton>
              ) : 'N/A'}
            </BodyDetailRow>
            <DetailRow label="# Allocations" glossaryTerm='Allocation' value={allocations?.length || 0} />
            {medianAllocationDistance !== null && <DetailRow label="Median allocation distance" value={`${formatNumber(Math.round(medianAllocationDistance), 0)} km`} />}
          </Box>
        </PrimaryCard>
        <InfoModal modalState={modalState} onClose={() => setModalState({ show: false, type: null, name: null, title: '' })} />
      </Stack>
    </VStack>
  )
}

export default function AllocationPageContent({ allocations, sites, summary }) {
  const [hoveredSite, setHoveredSite] = useState(null);
  const [showLPA, setShowLPA] = useState(false);
  const [showNCA, setShowNCA] = useState(false);
  const [showLSOA, setShowLSOA] = useState(false);

  // Handle site selection from map
  const handleSiteSelect = (site) => {
    // For now, we just track the hovered site for highlighting
    setHoveredSite(site);
  };

  // Define tab configuration
  const tabs = useMemo(() => {

    let tabList = [
      {
        title: 'Allocations List',
        content: () => <AllocationListTab allocations={allocations} />
      },
      {
        title: 'Allocation<br>Analysis',
        content: () => <AllocationAnalysis allocations={allocations} />
      }
    ];

    if (allocations.map(a => a.habitats.areas || []).flat().length > 0) {
      tabList.push({
        title: 'Area<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='areas' name='Area' />
      });
    }
    if (allocations.map(a => a.habitats.trees || []).flat().length > 0) {
      tabList.push({
        title: 'Individual Tree<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='trees' name='Individual Tree' />
      });
    }
    if (allocations.map(a => a.habitats.hedgerows || []).flat().length > 0) {
      tabList.push({
        title: 'Hedgerow<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='hedgerows' name='Hedgerow' />
      });
    }
    if (allocations.map(a => a.habitats.watercourses || []).flat().length > 0) {
      tabList.push({
        title: 'Watercourse<br>Habitats Chart',
        content: () => <FilteredAllocationsPieChart allocs={allocations} module='watercourses' name='Watercourse' />
      });
    }

    return tabList;
  }, [allocations]);

  return (
    <MapContentLayout
      map={
        <SiteMap
          sites={sites}
          hoveredSite={hoveredSite}
          onSiteSelect={handleSiteSelect}
          showAllocations={true}
          showLPA={showLPA}
          showNCA={showNCA}
          showLNRS={false}
          showLSOA={showLSOA}
          showSiteArea={false}
          openPopups={true}
          mapLayer={'OpenStreetMap'}
          allocations={allocations}
          selectedSite={{lpaName: summary.lpaName, ncaName: summary.ncaName, lsoa: summary.lsoa}}
        />
      }
      content={
        <>
          <PlanningDetailsCard summary={summary} allocations={allocations} bodyLayerStates={{ showLPA, setShowLPA, showNCA, setShowNCA, showLSOA, setShowLSOA }} />
          <Tabs.Root lazyMount defaultValue={0} width="100%">
            <Tabs.List>
              {tabs.map((tab, index) => (
                <Tabs.Trigger
                  key={index}
                  value={index}
                  dangerouslySetInnerHTML={{ __html: tab.title }}
                />
              ))}
            </Tabs.List>
            {tabs.map((tab, index) => (
              <Tabs.Content key={index} value={index} paddingTop={1}>
                {tab.content()}
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </>
      }
    />
  );
}
