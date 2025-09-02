// This function runs on the server side before the page is rendered.

import { useState, useMemo, useEffect } from 'react';
import SiteList from "../components/SiteList";
import API_URL from '../config';
import { fetchAllSites } from '../lib/api';
import { processSiteDataForIndex } from '../lib/sites';
import { formatNumber } from '../lib/format';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();
    const { processedSites, summary } = processSiteDataForIndex(allSites);

    // The value of the `props` key will be
    // passed to the `HomePage` component.
    return {
      props: {
        sites: processedSites,
        summary,
        error: null
      },
      revalidate: 3600, // In seconds
    };
  } catch (e) {
    // Handle any errors during the fetch.
    console.error(e);
    return {
      props: {
        sites: null,
        summary: { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0 },
        error: e.message
      },
    };
  }
}

const DEBOUNCE_DELAY_MS = 300;

// The main page component. It receives props from getServerSideProps.
export default function HomePage({ sites, error, summary = { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0 } }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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
      (site.ncaName?.toLowerCase() || '').includes(lowercasedTerm)
    );
  }, [sites, debouncedSearchTerm]);

  if (error) {
    return (
      <div className="container">
        <main className="main">
          <h1 className="title">Biodiversity Gain Sites</h1>
          <p className="error">Error fetching data: {error}</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="container">
      <main className="main">
        <h1 className="title">
          Biodiversity Gain Sites
        </h1>
        <div className="summary">
          {inputValue ? (
            <p>Displaying <strong>{formatNumber(filteredSites.length, 0)}</strong> of <strong>{formatNumber(summary.totalSites, 0)}</strong> sites.</p>
          ) : (
            <p style={{ fontStyle: 'normalitalic', fontSize: '1.9rem' }}>
              This list of <strong>{formatNumber(summary.totalSites, 0)}</strong> sites covers <strong>{formatNumber(summary.totalArea, 0)}</strong> hectares.
              They comprise <strong>{formatNumber(summary.totalBaselineHUs, 0)}</strong> baseline and <strong>{formatNumber(summary.totalCreatedHUs, 0)}</strong> created habitat units.
            </p>
          )}
        </div>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by BGS reference, Responsible Body, LPA or NCA..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          {inputValue && (
            <button
              onClick={() => setInputValue('')}
              className="clear-search-button"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
        <SiteList sites={filteredSites} />
      </main>
    </div>
  );
}
