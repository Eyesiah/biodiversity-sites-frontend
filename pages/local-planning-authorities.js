import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { formatNumber } from '../lib/format';
import ExternalLink from '../components/ExternalLink';
import styles from '../styles/SiteDetails.module.css'; // Re-using some styles for collapsible rows

export async function getStaticProps() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawLpas = JSON.parse(jsonData);

    // Convert size from square meters to hectares
    rawLpas.forEach(lpa => {
      lpa.size = lpa.size / 10000;      
    });
    // Filter to include only LPAs with an ID starting with 'E'
    const filteredLpas = rawLpas.filter(lpa => lpa.id && lpa.id.startsWith('E'));
    // Add adjacent count but remove the heavy adjacent data from initial props
    filteredLpas.forEach(lpa => {
      lpa.adjacentCount = lpa.adjacents?.length || 0;
      delete lpa.adjacents;
    });
    // Sort by name by default
    const lpas = filteredLpas.sort((a, b) => a.name.localeCompare(b.name));

    return {
      props: {
        lpas,
        error: null,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: {
        lpas: [],
        error: e.message,
      },
    };
  }
}

const CollapsibleRow = ({ lpa, mainRow, colSpan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [adjacents, setAdjacents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    // Fetch data only when opening the row for the first time
    if (newIsOpen && adjacents.length === 0 && lpa.adjacentCount > 0) {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/lpa/${lpa.id}`);
        if (!res.ok) throw new Error('Failed to fetch adjacency data.');
        const data = await res.json();
        setAdjacents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <tr
        onClick={handleToggle}
        className={`${styles.clickableRow} ${isHovered ? styles.subTableHovered : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {mainRow}
      </tr>
      {isOpen && lpa.adjacentCount > 0 && (
        <tr className={`${isHovered ? styles.subTableHovered : ''}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <td colSpan={colSpan}>
            <div style={{ padding: '0.5rem' }}>
              <h4>Adjacent LPAs</h4>
              {isLoading && <p>Loading...</p>}
              {error && <p className="error">{error}</p>}
              {!isLoading && !error && adjacents.length > 0 && (
                <table className={styles.subTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Area (ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjacents.map(adj => (
                      <tr key={adj.id}><td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 0)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

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
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by LPA name."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>
        <p>Displaying <strong>{formatNumber(filteredAndSortedLPAs.length, 0)}</strong> of <strong>{formatNumber(lpas.length, 0)}</strong> LPAs, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.</p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              <th onClick={() => requestSort('size')}>Area (ha){getSortIndicator('size')}</th>
              <th onClick={() => requestSort('adjacentCount')}># Adjacent LPAs{getSortIndicator('adjacentCount')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLPAs.map((lpa) => {
              const mainRow = (
                <>
                  <td>{lpa.id}</td>
                  <td>{lpa.name}</td>
                  <td className="numeric-data">{formatNumber(lpa.size, 0)}</td>
                  <td className="centered-data">{lpa.adjacentCount}</td>
                </>
              );

              return <CollapsibleRow key={lpa.id} lpa={lpa} mainRow={mainRow} colSpan={4} />;
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
}