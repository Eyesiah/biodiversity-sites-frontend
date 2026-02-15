'use client'

import Modal from '@/components/ui/Modal';
import { useState, useEffect, useRef } from 'react';
import { DetailRow } from '@/components/data/DetailRow'
import { formatNumber } from '@/lib/format'
import { VStack, Box, Separator, Text, Heading } from "@chakra-ui/react";

const InfoModalRow = ({ label, value }) => (
  <DetailRow label={label} value={value} textColor="veryLightGray" />
)

export const InfoModal = ({ modalState, onClose }) => {
  const { show, type, name, title, size } = modalState;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset data when name changes to avoid showing stale data
  const previousName = useRef(name);
  
  useEffect(() => {
    if (show && name) {
      // Clear data when name changes while modal is open
      if (previousName.current !== name) {
        setData(null);
        setError(null);
      }
      previousName.current = name;
      
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/modal/${type}/${name}`);
          if (!res.ok) throw new Error(`Failed to fetch details: ${res.status}`);
          const json = await res.json();
          setData(json);
        } catch (err) {
          console.error(err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      if (modalState.data) {
        setData(modalState.data);
      }
      else {
        fetchData()
      }
    }
  }, [show, type, name, modalState.data]);

  const renderContent = () => {
    if (isLoading) return <Text>Fetching data...</Text>;
    if (error) return <Text color="red">Error: {error}</Text>;
    if (!data) return <Text>No data available.</Text>;

    if (type === 'body' && data.body) {
      const { body } = data;
      return (
        <dl>
          <InfoModalRow label="Designation Date" value={body.designationDate} />
          <InfoModalRow label="Area of Expertise" value={body.expertise} />
          <InfoModalRow label="Type of Organisation" value={body.organisationType} />
          <InfoModalRow label="Address" value={body.address} />
          <InfoModalRow label="Email" value={body.emails.map(e => <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)} />
          <InfoModalRow label="Telephone" value={body.telephone} />
          <InfoModalRow label="# BGS Sites" value={body.siteCount} />
        </dl>
      );
    }

    if (type === 'lpa' && data.lpa) {
      const { lpa } = data;
      return (
        <dl>
          <InfoModalRow label="ID" value={lpa.id} />
          <InfoModalRow label="Area (ha)" value={formatNumber(lpa.size, 0)} />
          <InfoModalRow label="# BGS Sites" value={lpa.siteCount} />
          <InfoModalRow label="# Adjacent LPAs" value={lpa.adjacents?.length || 0} />
          {lpa.adjacents?.length > 0 && (
            <Box mt={4}>
              <Heading as="h4" size="md">Adjacent LPAs</Heading>
              <VStack spacing={0} align="stretch" pl={4}>
                {lpa.adjacents.map((adj, index) => (
                  <Box key={adj.id}>
                    <Box py={0.5}>
                      {adj.name} ({adj.id}) - {formatNumber(adj.size, 0)} ha
                    </Box>
                    {index < lpa.adjacents.length - 1 && <Separator borderColor="gray.200" />}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </dl>
      );
    }

    if (type === 'lnrs' && data.lnrs) {
      const { lnrs } = data;
      return (
        <dl>
          <InfoModalRow label="ID" value={lnrs.id} />
          <InfoModalRow label="Name" value={lnrs.name} />
          <InfoModalRow label="Responsible Authority" value={lnrs.responsibleAuthority} />
          <InfoModalRow label="Publication Status" value={lnrs.publicationStatus} />
          <InfoModalRow label="Area (ha)" value={formatNumber(lnrs.size, 0)} />
          <InfoModalRow label="# BGS Sites" value={lnrs.siteCount} />
          <InfoModalRow label="# Adjacent LNRS" value={lnrs.adjacents?.length || 0} />
          {lnrs.adjacents?.length > 0 && (
            <Box mt={4}>
              <Heading as="h4" size="md">Adjacent LNRS Areas</Heading>
              <VStack spacing={0} align="stretch" pl={4}>
                {lnrs.adjacents.map((adj, index) => (
                  <Box key={adj.id}>
                    <Box py={0.5}>
                      {adj.name} ({adj.id}) - {formatNumber(adj.size, 0)} ha
                    </Box>
                    {index < lnrs.adjacents.length - 1 && <Separator borderColor="gray.200" />}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </dl>
      );
    }

    if (type === 'nca' && data.nca) {
      const { nca } = data;
      return (
        <dl>
          <InfoModalRow label="ID" value={nca.id} />
          <InfoModalRow label="Name" value={nca.name} />
          <InfoModalRow label="Area (ha)" value={formatNumber(nca.size, 0)} />
          <InfoModalRow label="# BGS Sites" value={nca.siteCount} />
          <InfoModalRow label="# Adjacent NCAs" value={nca.adjacents?.length || 0} />
          {nca.adjacents?.length > 0 && (
            <Box mt={4}>
              <Heading as="h4" size="md">Adjacent NCAs</Heading>
              <VStack spacing={0} align="stretch" pl={4}>
                {nca.adjacents.map((adj, index) => (
                  <Box key={adj.id}>
                    <Box py={0.5}>
                      {adj.name} ({adj.id}) - {formatNumber(adj.size, 0)} ha
                    </Box>
                    {index < nca.adjacents.length - 1 && <Separator borderColor="gray.200" />}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </dl>
      );
    }
    
    if (type === 'lsoa' && data) {
      return (
        <dl>
          <InfoModalRow label="Index of Multiple Deprivation values" />
          <InfoModalRow label="Decile" value={data.IMDDecile ?? 'N/A'} />
          <InfoModalRow label="Score" value={data.IMDScore ?? 'N/A'} />
          <InfoModalRow label="Rank" value={data.IMDRank ?? 'N/A'} />
        </dl>
      );
    }

    return <Text>Details could not be loaded.</Text>;
  };

  return (
    <Modal show={show} onClose={onClose} title={title} size={size}>
      {renderContent()}
    </Modal>
  );
};
