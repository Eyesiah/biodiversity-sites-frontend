import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import API_URL from '../config';
import { formatNumber } from '../lib/format';
import ExternalLink from '../components/ExternalLink';
import styles from '../styles/SiteDetails.module.css'; // Re-using some styles for collapsible rows

export async function getStaticProps() {
  try {
    const res = await fetch(`${API_URL}/LocalNatureRecoveryStrategies/Areas?includeAdjacent=true`);
    if (!res.ok) {
      throw new Error(`Failed to fetch LNRS data, status: ${res.status}`);
    }
    const rawLnrs = await res.json();
    // Sort by name by default
    const lnrs = rawLnrs.sort((a, b) => a.name.localeCompare(b.name));

    return {
      props: {
        lnrs,
        error: null,
      },
      revalidate: 3600, // Re-generate the page at most once per hour
    };
  } catch (e) {
    console.error(e);
    return {
      props: {
        lnrs: [],
        error: e.message,
      },
    };
  }
}

const CollapsibleRow = ({ mainRow, collapsibleContent, colSpan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <tr
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.clickableRow} ${isHovered ? styles.subTableHovered : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {mainRow}
      </tr>
      {isOpen && (
        <tr className={`${isHovered ? styles.subTableHovered : ''}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <td colSpan={colSpan}>
            {collapsibleContent}
          </td>
        </tr>
      )}
    </>
  );
};

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
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by LNRS name."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>
        <p>Displaying <strong>{formatNumber(filteredAndSortedLNRS.length, 0)}</strong> of <strong>{formatNumber(lnrs.length, 0)}</strong> LNRS areas.</p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              <th onClick={() => requestSort('size')}>Area (ha){getSortIndicator('size')}</th>
              <th onClick={() => requestSort('adjacents.length')}># Adjacent LNRS{getSortIndicator('adjacents.length')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLNRS.map((item) => {
              const mainRow = (
                <>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td className="numeric-data">{formatNumber(item.size, 2)}</td>
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
                          <tr key={adj.id}><td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 2)}</td></tr>
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