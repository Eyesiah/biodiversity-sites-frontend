'use client'

import { useState, useMemo, useEffect } from 'react';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/MapContentLayout';
import SiteList from '@/components/SiteList';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { Box, Text, Flex, Input, InputGroup, Button } from '@chakra-ui/react';
import { ContentStack } from '@/components/ui/ContentStack'

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const DEBOUNCE_DELAY_MS = 300;

// Column configuration for the main sites list page (includes LNRS and IMD Decile)
const FULL_SITE_COLUMNS = ['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'lpaName', 'ncaName', 'lnrsName', 'imdDecile'];

export default function SiteListPageContent({sites, summary}) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [hoveredSite, setHoveredSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
  };

  // Debounce the search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => {
      clearTimeout(timerId);
    };
  }, [inputValue]);

  const filteredSites = useMemo(() => {
    if (!sites) {
      return [];
    }
    if (!debouncedSearchTerm) {
      return sites;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return sites.filter(site =>
      (site.referenceNumber?.toLowerCase() || '').includes(lowercasedTerm) ||
      (site.responsibleBodies?.join(', ').toLowerCase() || '').includes(lowercasedTerm) ||
      (site.lpaName?.toLowerCase() || '').includes(lowercasedTerm) ||
      (site.ncaName?.toLowerCase() || '').includes(lowercasedTerm) ||
      (site.lnrsName?.toLowerCase() || '').includes(lowercasedTerm) ||
      (site.imdDecile?.toString() || '').includes(lowercasedTerm)
    );
  }, [sites, debouncedSearchTerm]);

  const handleExport = async () => {
    const response = await fetch ('api/query/sites/csv');
    const blob = await response.blob();
    triggerDownload(blob, 'bgs-sites.csv');
  };

  return (
    <MapContentLayout
      map={
        <SiteMap sites={filteredSites} hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} />
      }
      content={
        <ContentStack>
          <Box width="90%" margin="0 auto 1rem" textAlign="left">
            <Box textAlign="center">
              {inputValue ? (
                <Text>
                  Displaying <Text as="strong">{formatNumber(filteredSites.length, 0)}</Text> of <Text as="strong">{formatNumber(summary.totalSites, 0)}</Text> sites
                </Text>
              ) : (
                <Text fontSize="1.2rem">
                  This list of <Text as="strong">{formatNumber(summary.totalSites, 0)}</Text> sites covers <Text as="strong">{formatNumber(summary.totalArea, 0)}</Text> hectares.
                  They comprise <Text as="strong">{formatNumber(summary.totalBaselineHUs, 0)}</Text> baseline and <Text as="strong">{formatNumber(summary.totalCreatedHUs, 0)}</Text> created improvement habitat units.
                </Text>
              )}
            </Box>
          </Box>
          <Flex 
            justifyContent="center" 
            alignItems="center" 
            gap="1rem" 
            marginBottom="1rem" 
            position="sticky" 
            top="0px" 
            bg="bone" 
            padding="0" 
            zIndex="999"
          >
            <Box position="relative" width="90%" maxWidth="500px" margin="1rem auto">
              <InputGroup
                endElement={
                  inputValue ? (
                    <Button
                      onClick={() => setInputValue('')}
                      position="absolute"
                      right="0.5rem"
                      top="50%"
                      transform="translateY(-50%)"
                      bg="transparent"
                      border="none"
                      padding="0.25rem"
                      color="#666"
                      fontSize="1.5rem"
                      lineHeight="1"
                      _hover={{
                        color: "black"
                      }}
                      aria-label="Clear search"
                    >
                      &times;
                    </Button>
                  ) : undefined
                }
              >
                <Input
                  type="text"
                  placeholder="Search by BGS reference, Responsible Body, LPA or NCA."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                  width="100%"
                  padding="0.75rem"
                  paddingRight="2.5rem"
                  fontSize="1rem"
                  borderRadius="5px"
                  border="1px solid #ccc"
                  bg="ivory"
                  color="#333"
                  _placeholder={{
                    color: "#888",
                    fontWeight: "bold"
                  }}
                  _focus={{
                    outline: "none",
                    borderColor: "brand.default",
                    boxShadow: "0 0 0 1px {colors.brand.default}"
                  }}
                />
              </InputGroup>
            </Box>
            <Button 
              onClick={handleExport} 
              fontSize="1rem" 
              padding="0.75rem 1rem"
              border="1px solid"
              borderColor="nephritis"
              borderRadius="5px"
              bg="white"
              color="midnight"
              textDecoration="none"
              display="inline-block"
              textAlign="center"
              transition="all 0.2s"
              _hover={{
                bg: "nephritis",
                color: "white"
              }}
            >
              Export to CSV
            </Button>
            <Button
              as="a"
              href="/charts/imd-decile-distribution"
              target="_blank"
              fontSize="1rem" 
              padding="0.75rem 1rem"
              border="1px solid"
              borderColor="nephritis"
              borderRadius="5px"
              bg="white"
              color="midnight"
              textDecoration="none"
              display="inline-block"
              textAlign="center"
              transition="all 0.2s"
              _hover={{
                bg: "nephritis",
                color: "white"
              }}
            >
              IMD Decile Chart
            </Button>           
          </Flex>
          <Box width="100%" overflowX="auto">
            <SiteList 
              sites={filteredSites} 
              onSiteHover={setHoveredSite} 
              onSiteClick={handleSiteSelect}
              columns={FULL_SITE_COLUMNS}
            />
          </Box>
        </ContentStack>
      }
    />      
  )
}