'use client'

import ExternalLink from '@/components/ui/ExternalLink';
import { HabitatSummaryTable } from "@/components/data/HabitatSummaryTable"
import { DetailRow, BodyDetailRow } from "@/components/data/DetailRow"
import { useState, useMemo } from 'react';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { InfoModal } from '@/components/ui/InfoModal';
import Modal from '@/components/ui/Modal';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import { Box, Text, VStack, Stack, Checkbox, Flex, HStack } from '@chakra-ui/react';
import InfoButton from '@/components/styles/InfoButton'
import Tooltip from '@/components/ui/Tooltip';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';

export const SiteDetailsCard = ({ site, bodyLayerStates }) => {
  const [modalState, setModalState] = useState({ show: false, type: null, name: null, title: '', data: null, size: 'md' });
  const [showBgsModal, setShowBgsModal] = useState(false);

  const hasBgsLinks = !!(site.bgsReferenceUrl || site.bgsWebsite || site.miscUrls);
  const miscUrlList = site.miscUrls ? site.miscUrls.split(',').map(u => u.trim()).filter(Boolean) : [];

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
            <DetailRow
              label={
                hasBgsLinks ? (
                  <HStack spacing={2} align="center">
                    <GlossaryTooltip term="BGS Reference"><span>BGS Reference</span></GlossaryTooltip>
                  </HStack>
                ) : (
                  <GlossaryTooltip term="BGS Reference"><span>BGS Reference</span></GlossaryTooltip>
                )
              }
              value={<ExternalLink href={`https://environment.data.gov.uk/biodiversity-net-gain/search/${site.referenceNumber}`}>{site.referenceNumber}</ExternalLink>}
            />
            <DetailRow
              label="Responsible Body"
              glossaryTerm="Responsible Body"
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
            {site.latitude && site.longitude && <DetailRow label="Location & Maps" value={<><ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}>Google Maps</ExternalLink> {site.landBoundary && <ExternalLink href={site.landBoundary}>Boundary Map</ExternalLink>}{` (Lat/Long: ${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)})`}</>} />}
            <Tooltip text="Please email us at BGS_Suggestions@bristoltreeforum.org to suggest Links or a Name for this site."><DetailRow label="External Links" value={<>
              {site.bgsWebsite && <ExternalLink href={site.bgsWebsite}>Project Website</ExternalLink>} {site.bgsReferenceUrl && <ExternalLink href={site.bgsReferenceUrl}>Site Planning Application</ExternalLink>} {miscUrlList.length > 0 && <InfoButton onClick={() => setShowBgsModal(true)} fontSize="sm" color="fg" opacity={0.75}>More...</InfoButton>}
            </>} /></Tooltip>
            <DetailRow label="Site Area" glossaryTerm="Size (ha)" value={(
              <Tooltip text="The circle displayed on the map represents the site area. For a more accurate map of exactly where the site is, see the Boundary Map (if available).">
                {`${formatNumber(site.siteSize || 0)} ha`}
              </Tooltip>
            )} />

          </Box>
        </PrimaryCard>

        <PrimaryCard>
          <Box>
            <BodyDetailRow bodyType='nca' glossaryTerm='National Character Area (NCA)' hasData={site.ncaName != null} isChecked={bodyLayerStates?.showNCA} setIsChecked={bodyLayerStates?.setShowNCA} >
              {site.ncaName ? <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(site.ncaName)}`}>{site.ncaName}</ExternalLink> : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lnrs' glossaryTerm='Local Nature Recovery Strategy (LNRS) site' hasData={site.lnrsName != null} isChecked={bodyLayerStates?.showLNRS} setIsChecked={bodyLayerStates?.setShowLNRS} >
              {site.lnrsName ? site.lnrsName : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lpa' glossaryTerm='Local Planning Authority (LPA)' hasData={site.lpaName != null} isChecked={bodyLayerStates?.showLPA} setIsChecked={bodyLayerStates?.setShowLPA} >
              {site.lpaName ? (
                <InfoButton onClick={() => showModal('lpa', site.lpaName, site.lpaName)}>
                  <Text>{site.lpaName}</Text>
                </InfoButton>
              ) : 'N/A'}
            </BodyDetailRow>
            <BodyDetailRow bodyType='lsoa' glossaryTerm='Lower Layer Super Output Area (LSOA)' hasData={site.lsoa?.name != null} isChecked={bodyLayerStates?.showLSOA} setIsChecked={bodyLayerStates?.setShowLSOA} >
              {site.lsoa?.name ? (
                <InfoButton onClick={() => showModal('lsoa', site.lsoa.name, site.lsoa.name, site.lsoa)}>
                  <Text>{site.lsoa.name}</Text>
                </InfoButton>
              ) : 'N/A'}
            </BodyDetailRow>
            <DetailRow label="# Allocations" glossaryTerm='Allocation' value={site.allocations?.length || 0} />
            {medianAllocationDistance !== null && <DetailRow label="Median allocation distance" value={`${formatNumber(Math.round(medianAllocationDistance), 0)} km`} />}
          </Box>
        </PrimaryCard>
        <InfoModal modalState={modalState} onClose={() => setModalState({ show: false, type: null, name: null, title: '' })} />
        <Modal show={showBgsModal} onClose={() => setShowBgsModal(false)} title="BGS Links" size="md">
          <VStack align="stretch" spacing={3} pt={2}>
            {site.bgsWebsite && (
              <Box>
                <Text fontWeight="bold" color="veryLightGray" mb={1}>BGS Website:</Text>
                <ExternalLink href={site.bgsWebsite} wordBreak="break-all">{site.bgsWebsite}</ExternalLink>
              </Box>
            )}
            {site.bgsReferenceUrl && (
              <Box>
                <Text fontWeight="bold" color="veryLightGray" mb={1}>BGS Planning Application:</Text>
                <ExternalLink href={site.bgsReferenceUrl} wordBreak="break-all">
                  {site.bgsReference || site.bgsReferenceUrl}
                </ExternalLink>
              </Box>
            )}
            {miscUrlList.length > 0 && (
              <Box>
                <Text fontWeight="bold" color="veryLightGray" mb={1}>Miscellaneous Links:</Text>
                <VStack align="stretch" spacing={1}>
                  {miscUrlList.map((url, idx) => (
                    <ExternalLink key={idx} href={url} wordBreak="break-all">{url}</ExternalLink>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Modal>
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
