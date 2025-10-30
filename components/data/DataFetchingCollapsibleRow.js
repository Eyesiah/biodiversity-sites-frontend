import { useState, useEffect } from 'react';
import { CollapsibleRow } from '@/components/data/CollapsibleRow';
import { Box, Text } from '@chakra-ui/react';

/**
 * A reusable component that renders a collapsible table row and fetches 
 * the content for the expanded section on-demand from a Next.js data URL.
 */
export const DataFetchingCollapsibleRow = ({ 
  mainRow, 
  dataUrl, 
  renderDetails, 
  dataExtractor,
  colSpan,
  onRowClick,
  isOpen,
  setIsOpen
}) => {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  if (isOpen == null || setIsOpen == null) {
    if (isOpen != null || setIsOpen != null) {
      throw new Error('Both isOpen and setIsOpen are required but only one was set');
    }

    isOpen = internalIsOpen;
    setIsOpen = setInternalIsOpen;
  }

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && !details && !isLoading) {
        setIsLoading(true);
        setError(null);
        try {
          const buildId = window?.__NEXT_DATA__?.buildId;
          let url = dataUrl
          if (buildId != null) {
            url = `/_next/data/${buildId}${dataUrl}`;
          }
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Failed to fetch data: ${res.status}`);
          }
          const json = await res.json();
          setDetails(dataExtractor(json));
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [isOpen, details, isLoading, dataUrl, dataExtractor]);

  const collapsibleContent = (
    <Box p="0.5rem">
      {isLoading && <Text>Loading...</Text>}
      {error && <Text color="red">Error: {error}</Text>}
      {details && renderDetails(details)}
    </Box>
  );

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={colSpan}
      onMainRowClick={onRowClick}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      tableType='data'
    />
  );
};
