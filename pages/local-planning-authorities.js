import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { formatNumber } from '../lib/format';
import styles from '../styles/SiteDetails.module.css';
import { DataFetchingCollapsibleRow } from '../components/DataFetchingCollapsibleRow';
import Papa from 'papaparse';

export async function getStaticProps() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawLpas = JSON.parse(jsonData);

    const lpas = rawLpas
      .filter(lpa => lpa.id && lpa.id.startsWith('E'))
      .map(lpa => ({
        id: lpa.id,
        name: lpa.name,
        size: lpa.size / 10000,
        adjacentsCount: lpa.adjacents ? lpa.adjacents.length : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      props: {
        lpas,
        lastUpdated: new Date().toISOString(),
        error: null,
      },
    };
  } catch (e) {
    throw e;
  }
}

function LpaDetails({ lpa }) {
  if (!lpa) {
    return null;
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      <h4>Adjacent LPAs</h4>
      {lpa.adjacents && lpa.adjacents.length > 0 ? (
        <table className={styles.subTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Area (ha)</th>
            </tr>
          </thead>
          <tbody>
            {lpa.adjacents.map(adj => (
              <tr key={adj.id}>
                <td>{adj.id}</td>
                <td>{adj.name}</td>
                <td className="numeric-data">{formatNumber(adj.size, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No adjacency data available.</p>
      )}
    </div>
  );
}

const LpaDataRow = ({ lpa }) => (
  <DataFetchingCollapsibleRow
    mainRow={(
      <>
        <td>{lpa.id}</td>
        <td>{lpa.name}</td>
        <td className="numeric-data">{formatNumber(lpa.size, 0)}</td>
        <td className="centered-data">{lpa.adjacentsCount}</td>
      </>
    )}
    dataUrl={`/modals/lpas/${lpa.id}.json`}
    renderDetails={details => <LpaDetails lpa={details} />}
    dataExtractor={json => json.pageProps.lpa}
    colSpan={4}
  />
);

const DEBOUNCE_DELAY_MS = 300;

export default function LocalPlanningAuthoritiesPage({ lpas, error }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filteredAndSortedLPAs = useMemo(() => {
    let filtered = [...lpas];

    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(lpa =>
        (lpa.name?.toLowerCase() || '').includes(lowercasedTerm)
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
  }, [lpas, debouncedSearchTerm, sortConfig]);

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

  const totalArea = useMemo(() => lpas.reduce((sum, lpa) => sum + lpa.size, 0), [lpas]);

  const handleExport = () => {
    const csvData = filteredAndSortedLPAs.map(lpa => ({
      'ID': lpa.id,
      'Name': lpa.name,
      'Area (ha)': formatNumber(lpa.size, 0),
      '# Adjacent LPAs': lpa.adjacentsCount,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'local-planning-authorities.csv');
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
        <title>Local Planning Authorities</title>
      </Head>
      <main className="main">
        <h1 className="title">Local Planning Authorities</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
          <div className="search-container" style={{ margin: 0 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by LPA name."
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
        <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(filteredAndSortedLPAs.length, 0)}</strong> of <strong>{formatNumber(lpas.length, 0)}</strong> LPAs, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.</p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
              <th onClick={() => requestSort('adjacentsCount')}># Adjacent LPAs{getSortIndicator('adjacentsCount')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLPAs.map((lpa) => (
              <LpaDataRow key={lpa.id} lpa={lpa} />
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
