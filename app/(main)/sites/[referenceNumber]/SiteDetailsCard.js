'use client'

import ExternalLink from '@/components/ui/ExternalLink';
import { HabitatSummaryTable } from "@/components/data/HabitatSummaryTable"
import { DetailRow } from "@/components/data/DetailRow"
import { useState, useMemo } from 'react';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { InfoModal } from '@/components/ui/InfoModal';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import { Box, Text, VStack, Stack, Checkbox, Flex } from '@chakra-ui/react';
import InfoButton from '@/components/styles/InfoButton'
import Tooltip from '@/components/ui/Tooltip';
import { lsoaStyle, lnrsStyle, ncaStyle, lpaStyle } from '@/components/map/MapStyles'

const bodyDetailTypes = {
  'lpa': {
    style: lpaStyle,
    label: 'LPA'
  },
  'lnrs': {
    style: lnrsStyle,
    label: 'LNRS'
  },
  'lsoa': {
    style: lsoaStyle,
    label: 'LSOA'
  },
  'nca': {
    style: ncaStyle,
    label: 'NCA'
  }
}

const BodyDetailRow = ({ bodyType, children, hasData, isChecked, setIsChecked }) => {

  const bodyInfo = bodyDetailTypes[bodyType];
  if (bodyInfo == null) {
    return <p>{`Unknown body type ${bodyType}`}</p>
  }

  return (
    <DetailRow
      label={bodyInfo.label}
      value={
        <Box textAlign="right">
          {children}
          {hasData && setIsChecked && (
            <Checkbox.Root
              checked={isChecked}
              onCheckedChange={() => setIsChecked(!isChecked)}
              size="sm"
              marginLeft={2}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Flex align="center" gap={1}>
                  <Text fontSize="sm">Show</Text>
                  <Box
                    w="12px"
                    h="12px"
                    bg={bodyInfo.style.color}
                    border="1px solid #555"
                    borderRadius="2px"
                  />
                </Flex>
              </Checkbox.Label>
            </Checkbox.Root>
          )}
        </Box>
      }
    />
  );
}

export const SiteDetailsCard = ({ site, bodyLayerStates }) => {
  const [modalState, setModalState] = useState({ show: false, type: null, name: null, title: '', data: null, size: 'md' });

  const medianAllocationDistance = useMemo(() => {
    if (!site.allocations || site.allocations.length === 0) return null;
    const distances = site.allocations.map(alloc => alloc.distance).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) return null;
    const mid = Math.floor(distances.length / 2);
    return distances.length % 2 === 0 ? (distances[mid - 1] + distances[mid]) / 2 : distances[mid];
  }, [site.allocations]);

  const showModal = (type, name, title, data, size = 'md') => {
    setModalState({ show: true, type, name: slugify(normalizeBodyName(name)), title, data, size: size });
  };

  return (
    <VStack>
      <Stack direction={['column', 'row']} width='100%'>
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

            <DetailRow label="Site Area" value={(
              <Tooltip text="The circle displayed on the map represents the site area. For a more accurate map of exactly where the site is, see the Boundary Map (if available).">
                {`${formatNumber(site.siteSize || 0)} ha`}
              </Tooltip>
            )} />

          </Box>
        </PrimaryCard>

        <PrimaryCard>
          <Box>
            <BodyDetailRow bodyType='nca' hasData={site.ncaName != null} isChecked={bodyLayerStates?.showNCA} setIsChecked={bodyLayerStates?.setShowNCA} >
              {site.ncaName ? <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(site.ncaName)}`}>{site.ncaName}</ExternalLink> : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lnrs' hasData={site.lnrsName != null} isChecked={bodyLayerStates?.showLNRS} setIsChecked={bodyLayerStates?.setShowLNRS} >
              {site.lnrsName ? site.lnrsName : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lpa' hasData={site.lpaName != null} isChecked={bodyLayerStates?.showLPA} setIsChecked={bodyLayerStates?.setShowLPA} >
              {site.lpaName ? (
                <InfoButton onClick={() => showModal('lpa', site.lpaName, site.lpaName)}>
                  <Text>{site.lpaName}</Text>
                </InfoButton>
              ) : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lsoa' hasData={site.lsoa?.name != null} isChecked={bodyLayerStates?.showLSOA} setIsChecked={bodyLayerStates?.setShowLSOA} >
              {site.lsoa?.name ? (
                <InfoButton onClick={() => showModal('lsoa', site.lsoa.name, site.lsoa.name, site.lsoa)}>
                  <Text>{site.lsoa.name}</Text>
                </InfoButton>
              ) : 'N/A'}
            </BodyDetailRow>
            <DetailRow label="# Allocations" value={site.allocations?.length || 0} />
            {medianAllocationDistance !== null && <DetailRow label="Median allocation distance" value={`${formatNumber(Math.round(medianAllocationDistance), 0)} km`} />}
          </Box>
        </PrimaryCard>
        <InfoModal modalState={modalState} onClose={() => setModalState({ show: false, type: null, name: null, title: '' })} />
      </Stack>
      <PrimaryCard>
        <Box>
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
              Habitat<br />Summary
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
      </PrimaryCard>
    </VStack>
  )
}
