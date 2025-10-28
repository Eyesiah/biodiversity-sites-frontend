'use client'

import Modal from '@/components/Modal';
import { useState, useEffect } from 'react';
import { DetailRow } from '@/components/DetailRow'
import { ImdScoresChart } from './ImdScoresChart';
import { formatNumber } from '@/lib/format'
import { VStack, Box, Separator } from "@chakra-ui/react";

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
    if (isLoading) return <p>Loading...</p>;
    if (!data) return <p>No data available.</p>;

    if (type === 'body' && data.body) {
      const { body } = data;
      return (
        <dl>
          <DetailRow label="Designation Date" value={body.designationDate} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Area of Expertise" value={body.expertise} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Type of Organisation" value={body.organisationType} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Address" value={body.address} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Email" value={body.emails.map(e => <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Telephone" value={body.telephone} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="# BGS Sites" value={body.siteCount} labelColor="#f0f0f0" valueColor="#bdc3c7" />
        </dl>
      );
    }

    if (type === 'lpa' && data.lpa) {
      const { lpa } = data;
      return (
        <dl>
          <DetailRow label="ID" value={lpa.id} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Area (ha)" value={formatNumber(lpa.size, 0)} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="# Adjacent LPAs" value={lpa.adjacents?.length || 0} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          {lpa.adjacents?.length > 0 && (
            <Box mt={4}>
              <h4>Adjacent LPAs</h4>
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
          <DetailRow label="Index of Multiple Deprivation values"labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Decile" value={data.IMDDecile ?? 'N/A'} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Score" value={data.IMDScore ?? 'N/A'} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Rank" value={data.IMDRank ?? 'N/A'} labelColor="#f0f0f0" valueColor="#bdc3c7" />          
        </dl>
      );
    }

    if (type === 'imd-graph' && data) {
      return <ImdScoresChart site={data} />;
    }

    return <p>Details could not be loaded.</p>;
  };

  return (
    <Modal show={show} onClose={onClose} title={title} size={size}>
      {renderContent()}
    </Modal>
  );
};