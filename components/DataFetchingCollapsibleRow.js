import { useState, useEffect } from 'react';
import { CollapsibleRow } from 'components/CollapsibleRow';

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

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && !details && !isLoading) {
        setIsLoading(true);
        setError(null);
        try {
          const buildId = window.__NEXT_DATA__.buildId;
          const res = await fetch(`/_next/data/${buildId}${dataUrl}`);
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
    <div style={{ padding: '0.5rem' }}>
      {isLoading && <p>Loading...</p>}
      {error && <p className="error">Error: {error}</p>}
      {details && renderDetails(details)}
    </div>
  );

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={colSpan}
      onMainRowClick={onRowClick}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  );
};
