import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { formatNumber } from '../lib/format';
import { CollapsibleRow } from '../components/CollapsibleRow';
import styles from '../styles/SiteDetails.module.css'; // Re-using some styles for collapsible rows
import Papa from 'papaparse';

export async function getStaticProps() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'NCAs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawNcas = JSON.parse(jsonData);
    // Convert size from square meters to hectares
    rawNcas.forEach(nca => {
      nca.size = nca.size / 10000;
      nca.adjacents.forEach(adj => adj.size = adj.size / 10000);
    });
    // Sort by name by default
    const ncas = rawNcas.sort((a, b) => a.name.localeCompare(b.name));

    return {
      props: {
        ncas,
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

export default function NationalCharacterAreasPage({ ncas, error }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filteredAndSortedNCAs = useMemo(() => {
    let filtered = [...ncas];

    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(nca =>
        (nca.name?.toLowerCase() || '').includes(lowercasedTerm)
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
  }, [ncas, debouncedSearchTerm, sortConfig]);

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

  const totalArea = useMemo(() => ncas.reduce((sum, nca) => sum + nca.size, 0), [ncas]);

  const handleExport = () => {
    const csvData = filteredAndSortedNCAs.map(nca => ({
      'ID': nca.id,
      'Name': nca.name,
      'Area (ha)': formatNumber(nca.size, 0),
      '# Adjacent NCAs': nca.adjacents?.length || 0,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'national-character-areas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return <div className="container"><p className="error">Error fetching data: {error}</p></div>;
  }

  return (
    <div className="container">
      <Head>
        <title>National Character Areas</title>
      </Head>
      <main className="main">
        <h1 className="title">National Character Areas</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
          <div className="search-container" style={{ margin: 0 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by NCA name."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
            {inputValue && (
              <button onClick={() => setInputValue('')} className="clear-search-button" aria-label="Clear search">&times;</button>
            )}
          </div>
          <button onClick={handleExport} className="linkButton" style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
            Export to CSV
          </button>
        </div>
        <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(filteredAndSortedNCAs.length, 0)}</strong> of <strong>{formatNumber(ncas.length, 0)}</strong> NCAs, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.</p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
              <th onClick={() => requestSort('adjacents.length')}># Adjacent NCAs{getSortIndicator('adjacents.length')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedNCAs.map((nca) => {
              const mainRow = (
                <>
                  <td>{nca.id}</td>
                  <td>{nca.name}</td>
                  <td className="numeric-data">{formatNumber(nca.size, 0)}</td>
                  <td className="centered-data">{nca.adjacents?.length || 0}</td>
                </>
              );

              const collapsibleContent = (
                <div style={{ padding: '0.5rem' }}>
                  <h4>Adjacent NCAs</h4>
                  {nca.adjacents && nca.adjacents.length > 0 ? (
                    <table className={styles.subTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Area (ha)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nca.adjacents.map(adj => (
                          <tr key={adj.id}><td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 0)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No adjacency data available.</p>
                  )}
                </div>
              );

              return <CollapsibleRow key={nca.id} mainRow={mainRow} collapsibleContent={collapsibleContent} colSpan={4} />;
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
}