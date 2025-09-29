'use client'

import { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import { useSortableData } from '@/lib/hooks';
import { formatNumber } from '@/lib/format';
import MapContentLayout from '@/components/MapContentLayout';
import dynamic from 'next/dynamic';
import ChartModalButton from '@/components/ChartModalButton';

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const DEBOUNCE_DELAY_MS = 300;

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

  return (
    <MapContentLayout
      map={
        <SiteMap sites={filteredSites} hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={handleSiteSelect} />
      }
      content={
        <>
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
            <ChartModalButton
              url="/charts/imd-decile-distribution"
              title="IMD Decile Distribution"
              buttonText="IMD Decile Chart"
              className="linkButton"
              style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
            />
          </div>
          <SiteList sites={filteredSites} onSiteHover={setHoveredSite} onSiteClick={handleSiteSelect} />
        </>
      }
    />      
  )
}