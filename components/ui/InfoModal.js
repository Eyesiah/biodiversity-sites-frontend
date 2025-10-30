'use client'

import Modal from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { DetailRow } from '@/components/data/DetailRow'
import { formatNumber } from '@/lib/format'
import { VStack, Box, Separator, Text, Heading } from "@chakra-ui/react";

export const InfoModal = ({ modalState, onClose }) => {
  const { show, type, name, title, size } = modalState;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (show && name) {
      const fetchData = async () => {
        setIsLoading(true);
        setData(null);
        try {
          const res = await fetch(`/api/modal/${type}/${name}`);
          if (!res.ok) throw new Error(`Failed to fetch details: ${res.status}`);
          const json = await res.json();
          setData(json);
        } catch (error) {
          console.error(error);
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
    if (isLoading) return <Text>Loading...</Text>;
    if (!data) return <Text>No data available.</Text>;

    if (type === 'body' && data.body) {
      const { body } = data;
      return (
        <dl>
          <DetailRow label="Designation Date" value={body.designationDate} />
          <DetailRow label="Area of Expertise" value={body.expertise} />
          <DetailRow label="Type of Organisation" value={body.organisationType} />
          <DetailRow label="Address" value={body.address} />
          <DetailRow label="Email" value={body.emails.map(e => <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)} />
          <DetailRow label="Telephone" value={body.telephone} />
          <DetailRow label="# BGS Sites" value={body.siteCount} />
        </dl>
      );
    }

    if (type === 'lpa' && data.lpa) {
      const { lpa } = data;
      return (
        <dl>
          <DetailRow label="ID" value={lpa.id} />
          <DetailRow label="Area (ha)" value={formatNumber(lpa.size, 0)} />
          <DetailRow label="# Adjacent LPAs" value={lpa.adjacents?.length || 0} />
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
    
    if (type === 'lsoa' && data) {
      return (
        <dl>
          <DetailRow label="Index of Multiple Deprivation values" />
          <DetailRow label="Decile" value={data.IMDDecile ?? 'N/A'} />
          <DetailRow label="Score" value={data.IMDScore ?? 'N/A'} />
          <DetailRow label="Rank" value={data.IMDRank ?? 'N/A'} />
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
