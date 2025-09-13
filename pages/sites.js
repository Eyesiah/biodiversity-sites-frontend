// This function runs on the server side before the page is rendered.

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic'; 
import Link from 'next/link';
import { useSortableData } from '../lib/hooks';
import { fetchAllSites } from '../lib/api';
import { processSiteDataForIndex } from '../lib/sites';
import { formatNumber } from '../lib/format';
import Papa from 'papaparse';

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites(0, true);
    const { processedSites, summary } = processSiteDataForIndex(allSites);

    // The value of the `props` key will be
    // passed to the `HomePage` component.
    return {
      props: {
        sites: processedSites,
        summary,
        lastUpdated: new Date().toISOString(),
        error: null
      },
      revalidate: 3600, // In seconds
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    throw e;
  }
}

const SiteList = ({ sites, onSiteHover, onSiteClick }) => {
  const { items: sortedSites, requestSort, getSortIndicator } = useSortableData(sites, { key: 'referenceNumber', direction: 'ascending' });

  if (!sites || sites.length === 0) {
    return <p>No site data available.</p>;
  }

  return (
    <table className="site-table">
      <thead>
        <tr>
          <th onClick={() => requestSort('referenceNumber')}>{getSortIndicator('referenceNumber')}BGS Reference</th>
          <th onClick={() => requestSort('responsibleBodies')}>{getSortIndicator('responsibleBodies')}Responsible Body</th>
          <th onClick={() => requestSort('siteSize')}>{getSortIndicator('siteSize')}Size (ha)</th>
          <th onClick={() => requestSort('allocationsCount')}>{getSortIndicator('allocationsCount')}# Allocations</th>
          <th onClick={() => requestSort('lpaName')}>{getSortIndicator('lpaName')}Local Planning Authority (LPA)</th>
          <th onClick={() => requestSort('ncaName')}>{getSortIndicator('ncaName')}National Character Area (NCA)</th>
          <th onClick={() => requestSort('lnrsName')}>{getSortIndicator('lnrsName')}Local Nature Recovery Strategy (LNRS)</th>
          <th onClick={() => requestSort('imdDecile')}>{getSortIndicator('imdDecile')}IMD Decile</th>
        </tr>
      </thead>
      <tbody>
        {sortedSites.map((site) => (
          <tr
            key={site.referenceNumber}
            onMouseEnter={() => onSiteHover(site)}
            onMouseLeave={() => onSiteHover(null)}
            onClick={() => onSiteClick(site)}
            style={{ cursor: 'pointer' }}
          >
            <td>
              <Link href={`/sites/${site.referenceNumber}`}>
                {site.referenceNumber}
              </Link>
            </td>
            <td>{Array.isArray(site.responsibleBodies) ? site.responsibleBodies.join(', ') : site.responsibleBodies}</td>
            <td className="numeric-data">{formatNumber(site.siteSize)}</td>
            <td className="centered-data">{site.allocationsCount}</td>
            <td>{site.lpaName}</td>
            <td>{site.ncaName}</td>
            <td>{site.lnrsName}</td>
            <td className="centered-data">{site.imdDecile}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const DEBOUNCE_DELAY_MS = 300;

// The main page component. It receives props from getServerSideProps.
export default function HomePage({ sites, error, summary = { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0 } }) {
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

  const handleExport = () => {
    const csvData = filteredSites.map(site => ({
      'BGS Reference': site.referenceNumber,
      'Responsible Body': site.responsibleBodies.join(', '),
      'Area (ha)': formatNumber(site.siteSize),
      '# Allocations': site.allocationsCount,
      'Local Planning Authority (LPA)': site.lpaName,
      'National Character Area (NCA)': site.ncaName,
      'Local Nature Recovery Strategy (LNRS)': site.lnrsName,
      'IMD Decile': site.imdDecile,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bgs-sites.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openChartWindow = (url) => {
    const width = window.screen.width * 0.65;
    const height = window.screen.height * 0.4;
    window.open(url, 'chartWindow', `width=${width},height=${height}`);
  };

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
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <div style={{ flex: '1 1 33%', marginRight: '1rem', position: 'sticky', top: '80px', alignSelf: 'flex-start' }} >
            <Map sites={filteredSites} height="85vh" hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} />
          </div>
          <div style={{ flex: '1 1 67%' }}>
            <h1 className="title">
              Biodiversity Gain Sites
            </h1>
            <div className="summary">
              <div className="summary" style={{ textAlign: 'center' }}>
              {inputValue ? (
                <p>Displaying <strong>{formatNumber(filteredSites.length, 0)}</strong> of <strong>{formatNumber(summary.totalSites, 0)}</strong> sites</p>
              ) : (
                <p style={{ fontSize: '1.2rem' }}>
                  This list of <strong>{formatNumber(summary.totalSites, 0)}</strong> sites covers <strong>{formatNumber(summary.totalArea, 0)}</strong> hectares.
                  They comprise <strong>{formatNumber(summary.totalBaselineHUs, 0)}</strong> baseline and <strong>{formatNumber(summary.totalCreatedHUs, 0)}</strong> created improvement habitat units.            </p>
              )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div className="search-container" style={{ margin: 0 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by BGS reference, Responsible Body, LPA or NCA."
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
              <button onClick={handleExport} className="linkButton" style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
                Export to CSV
              </button>
              <button onClick={() => openChartWindow('/imd-decile-distribution')} className="linkButton" style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
                IMD Decile Chart
              </button>
            </div>
            <SiteList sites={filteredSites} onSiteHover={setHoveredSite} onSiteClick={handleSiteSelect} />
          </div>
        </div>
      </main>
    </div>
  );
}