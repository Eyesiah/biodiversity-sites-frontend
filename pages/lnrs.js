import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { formatNumber } from '../lib/format';
import { CollapsibleRow } from '../components/CollapsibleRow';
import styles from '../styles/SiteDetails.module.css';
import { XMLBuilder } from 'fast-xml-parser';

export async function getStaticProps() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'LNRSs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawLnrs = JSON.parse(jsonData);
    // Convert size from square meters to hectares
    rawLnrs.forEach(lnrs => {
      lnrs.size = lnrs.size / 10000;
      lnrs.adjacents.forEach(adj => adj.size = adj.size / 10000);
    });
    // Sort by name by default
    const lnrs = rawLnrs.sort((a, b) => a.name.localeCompare(b.name));

    return {
      props: {
        lnrs,
        lastUpdated: new Date().toISOString(),
        error: null,
      },
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    throw e;
  }
}

const DEBOUNCE_DELAY_MS = 300;

export default function LNRSAreasPage({ lnrs, error }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filteredAndSortedLNRS = useMemo(() => {
    let filtered = [...lnrs];

    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name?.toLowerCase() || '').includes(lowercasedTerm)
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [lnrs, debouncedSearchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (name) => {
    if (sortConfig.key !== name) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const totalArea = useMemo(() => lnrs.reduce((sum, item) => sum + item.size, 0), [lnrs]);

  const triggerDownload = (blob, filename) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXML = () => {
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const xmlDataStr = builder.build({ lnrs: filteredAndSortedLNRS });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'lnrs-areas.xml');
  };

  const handleExportJSON = () => {
    const jsonDataStr = JSON.stringify({ lnrs: filteredAndSortedLNRS }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'lnrs-areas.json');
  };

  if (error) {
    return <div className="container"><p className="error">Error fetching data: {error}</p></div>;
  }

  return (
    <div className="container">
      <Head>
        <title>Local Nature Recovery Strategies</title>
      </Head>
      <main className="main">
        <h1 className="title">Local Nature Recovery Strategies</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
          <div className="search-container" style={{ margin: 0 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by LNRS name."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
            {inputValue && (
              <button onClick={() => setInputValue('')} className="clear-search-button" aria-label="Clear search">&times;</button>
            )}
          </div>
          <div className={styles.buttonGroup}>
            <button onClick={handleExportXML} className={styles.exportButton}>Export to XML</button>
            <button onClick={handleExportJSON} className={styles.exportButton}>Export to JSON</button>
          </div>
        </div>
        <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(filteredAndSortedLNRS.length, 0)}</strong> of <strong>{formatNumber(lnrs.length, 0)}</strong> LNRS areas, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.</p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
              <th onClick={() => requestSort('adjacents.length')}># Adjacent LNRS{getSortIndicator('adjacents.length')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLNRS.map((item) => {
              const mainRow = (
                <>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td className="numeric-data">{formatNumber(item.size, 0)}</td>
                  <td className="centered-data">{item.adjacents?.length || 0}</td>
                </>
              );

              const collapsibleContent = (
                <div style={{ padding: '0.5rem' }}>
                  <h4>Adjacent LNRS Areas</h4>
                  {item.adjacents && item.adjacents.length > 0 ? (
                    <table className={styles.subTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Area (ha)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.adjacents.map(adj => (
                          <tr key={adj.id}><td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 0)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No adjacency data available.</p>
                  )}
                </div>
              );

              return <CollapsibleRow key={item.id} mainRow={mainRow} collapsibleContent={collapsibleContent} colSpan={4} />;
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
}