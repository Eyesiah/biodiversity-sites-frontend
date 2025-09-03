import Head from 'next/head';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { useState, useMemo, useEffect } from 'react';
import { formatNumber } from '../lib/format';

export async function getStaticProps() {
  const csvPath = path.join(process.cwd(), 'data', 'responsible-bodies.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');

  const parsedData = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  const bodyItems = parsedData.data.map(item => ({
    name: item['Name'] || '',
    designationDate: item['Designation Date'] || '',
    expertise: item['Area of Expertise'] || '',
    organisationType: item['Type of Organisation'] || '',
    address: item['Address'] || '',
    emails: item['Email'] ? item['Email'].split('; ') : [],
    telephone: item['Telephone'] || '',
  }));

  return {
    props: {
      responsibleBodies: bodyItems,
    },
  };
}

const DEBOUNCE_DELAY_MS = 300;

export default function ResponsibleBodiesPage({ responsibleBodies }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => {
      clearTimeout(timerId);
    };
  }, [inputValue]);

  const filteredAndSortedBodies = useMemo(() => {
    let filtered = [...responsibleBodies];

    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(body =>
        (body.name?.toLowerCase() || '').includes(lowercasedTerm) ||
        (body.expertise?.toLowerCase() || '').includes(lowercasedTerm) ||
        (body.organisationType?.toLowerCase() || '').includes(lowercasedTerm) ||
        (body.address?.toLowerCase() || '').includes(lowercasedTerm)
      );
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [responsibleBodies, debouncedSearchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (name) => {
    if (sortConfig.key !== name) {
      return '';
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return (
    <div className="container">
      <Head>
        <title>Responsible Bodies</title>        
      </Head>
      <main className="main">
        <h1 className="title">Designated Responsible Bodies</h1>
        <div className="summary">
          {inputValue ? (
            <p>Displaying <strong>{formatNumber(filteredAndSortedBodies.length, 0)}</strong> of <strong>{formatNumber(responsibleBodies.length, 0)}</strong> bodies</p>
          ) : (
            <p style={{ fontStyle: 'normalitalic', fontSize: '1.8rem' }}>
                This list contains <strong>{formatNumber(responsibleBodies.length, 0)}</strong> responsible bodies.
            </p>
        )}
        </div>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, expertise, type, or address..."
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
        <p style={{ fontStyle: 'italic', fontSize: '1.3rem' }}>
          Not all the responsible bodies listed here are included in the BGS Site List or share the exact same name shown there.
        </p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              <th onClick={() => requestSort('designationDate')}>Designation Date{getSortIndicator('designationDate')}</th>
              <th onClick={() => requestSort('expertise')}>Area of Expertise{getSortIndicator('expertise')}</th>
              <th onClick={() => requestSort('organisationType')}>Type of Organisation{getSortIndicator('organisationType')}</th>
              <th onClick={() => requestSort('address')}>Address{getSortIndicator('address')}</th>
              <th>Email</th>
              <th>Telephone</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedBodies.map((body) => (
              <tr key={body.name}>
                <td>{body.name}</td>
                <td>{body.designationDate}</td>
                <td>{body.expertise}</td>
                <td>{body.organisationType}</td>
                <td>{body.address}</td>
                <td>
                  {body.emails.map(email => (
                    <div key={email}><a href={`mailto:${email}`}>{email}</a></div>
                  ))}
                </td>
                <td>{body.telephone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}