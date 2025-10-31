'use client'

import ExternalLink from '@/components/ui/ExternalLink';
import { HabitatSummaryTable } from "@/components/data/HabitatSummaryTable"
import { DetailRow } from "@/components/data/DetailRow"
import { useState, useMemo } from 'react';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { InfoModal } from '@/components/ui/InfoModal';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import { Box, Text } from '@chakra-ui/react';
import InfoButton from '@/components/styles/InfoButton'

export const SiteDetailsCard = ({ site }) => {
  const [modalState, setModalState] = useState({ show: false, type: null, name: null, title: '', data: null, size: 'md' });

  const medianAllocationDistance = useMemo(() => {
    if (!site.allocations || site.allocations.length === 0) return null;
    const distances = site.allocations.map(alloc => alloc.distance).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) return null;
    const mid = Math.floor(distances.length / 2);
    return distances.length % 2 === 0 ? (distances[mid - 1] + distances[mid]) / 2 : distances[mid];
  }, [site.allocations]);

  const showModal = (type, name, title, data, size='md') => {
    setModalState({ show: true, type, name: slugify(normalizeBodyName(name)), title, data, size: size });
  };

  return (
    <PrimaryCard>
      <Box>
        <DetailRow label="BGS Reference" value={<ExternalLink href={`https://environment.data.gov.uk/biodiversity-net-gain/search/${site.referenceNumber}`}>{site.referenceNumber}</ExternalLink>} />
        <DetailRow 
          label="Responsible Body"
          value={
            (site.responsibleBodies && site.responsibleBodies.length > 0) ? (
              site.responsibleBodies.map((bodyName, index) => (
                <span key={index}>
                  <InfoButton onClick={() => showModal('body', bodyName, bodyName)}>
                    <Text>{bodyName}</Text>
                  </InfoButton>
                  {index < site.responsibleBodies.length - 1 && ', '}
                </span>
              ))
            ) : 'N/A'
          } 
        />
        <DetailRow label="Start date of enhancement works" value={site.startDate ? new Date(site.startDate).toLocaleDateString('en-GB') : 'N/A'} />
        <DetailRow label="Location (Lat/Long)" value={(site.latitude && site.longitude) ? `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}` : '??'} />
        {site.latitude && site.longitude && <DetailRow label="Map" value={<><ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}>View on Google Maps</ExternalLink> {site.landBoundary && <ExternalLink href={site.landBoundary}>Boundary Map</ExternalLink>}</>} />}
        <DetailRow label="NCA" value={site.ncaName ? <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(site.ncaName)}`}>{site.ncaName}</ExternalLink> : 'N/A'} />
        <DetailRow 
          label="LPA" 
          value={
            site.lpaName ? (
              <InfoButton onClick={() => showModal('lpa', site.lpaName, site.lpaName)}>
                <Text>{site.lpaName}</Text>
              </InfoButton>
            ) : 'N/A'
          } 
        />
        <DetailRow 
          label="LSOA" 
          value={
            site.lsoa?.name ? (
              <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                <InfoButton onClick={() => showModal('lsoa', site.lsoa.name, site.lsoa.name, site.lsoa)}>
                  <Text>{site.lsoa.name}</Text>
                </InfoButton>
              </Box>
            ) : 'N/A'
          } 
        />
        <DetailRow label="# Allocations" value={site.allocations?.length || 0} />
        <DetailRow label="# Planning applications" value={site.allocations?.length || 0} />
        {medianAllocationDistance !== null && <DetailRow label="Median allocation distance" value={`${formatNumber(Math.round(medianAllocationDistance), 0)} km`} />}
        <DetailRow label="Site Area" value={`${formatNumber(site.siteSize || 0)} ha`} />
        <Box 
          display="flex" 
          justifyContent="space-between"
          alignItems="flex-start"
          padding="0.1rem 0"
          borderBottom="1px solid"
          borderColor="subtleBorder"
        >
          <Box 
            as="dt"
            fontWeight="bold" 
            color="fg"
            margin="0"
            paddingRight="1rem"
          >
            Habitat Summary
          </Box>
          <Box 
            as="dd"
            margin="0"
            flex="1"
            minWidth="0"
            display="flex"
            justifyContent="flex-end"
          >
            <HabitatSummaryTable site={site} />
          </Box>
        </Box>
      </Box>
      <InfoModal modalState={modalState} onClose={() => setModalState({ show: false, type: null, name: null, title: '' })} />
    </PrimaryCard>
  )
}
