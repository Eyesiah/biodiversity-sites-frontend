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

  // Check which columns have data to decide whether to render them
  const hasDesignationDate = useMemo(() => responsibleBodies.some(body => body.designationDate), [responsibleBodies]);
  const hasExpertise = useMemo(() => responsibleBodies.some(body => body.expertise), [responsibleBodies]);
  const hasOrganisationType = useMemo(() => responsibleBodies.some(body => body.organisationType), [responsibleBodies]);
  const hasAddress = useMemo(() => responsibleBodies.some(body => body.address), [responsibleBodies]);
  const hasEmail = useMemo(() => responsibleBodies.some(body => body.emails.length > 0), [responsibleBodies]);
  const hasTelephone = useMemo(() => responsibleBodies.some(body => body.telephone), [responsibleBodies]);

  return (
    <div className="container">
      <Head>
        <title>Responsible Bodies</title>        
      </Head>
        <main className="main">
        <h1 className="title">Designated Responsible Bodies</h1>
        <div className="summary" style={{ textAlign: 'center' }}>           
          {inputValue ? (
            <p>Displaying <strong>{formatNumber(filteredAndSortedBodies.length, 0)}</strong> of <strong>{formatNumber(responsibleBodies.length, 0)}</strong> bodies</p>
          ) : (
            <p style={{ fontStyle: 'normalitalic', fontSize: '1.2rem' }}>
                These <strong>{formatNumber(responsibleBodies.length, 0)}</strong> responsible bodies may enter into conservation covenant agreements with landowners in England.
            </p>
        )}
        </div>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, expertise, type, or address."
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
        <p style={{ fontStyle: 'italic', fontSize: '1.2rem' }}>
          Not all the Responsible Bodies listed here are included in the BGS Site List page or share the same name.
        </p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
              {hasDesignationDate && <th onClick={() => requestSort('designationDate')}>Designation Date{getSortIndicator('designationDate')}</th>}
              {hasExpertise && <th onClick={() => requestSort('expertise')}>Area of Expertise{getSortIndicator('expertise')}</th>}
              {hasOrganisationType && <th onClick={() => requestSort('organisationType')}>Type of Organisation{getSortIndicator('organisationType')}</th>}
              {hasAddress && <th onClick={() => requestSort('address')}>Address{getSortIndicator('address')}</th>}
              {hasEmail && <th>Email</th>}
              {hasTelephone && <th>Telephone</th>}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedBodies.map((body) => (
              <tr key={body.name}>
                <td>{body.name}</td>
                {hasDesignationDate && <td>{body.designationDate}</td>}
                {hasExpertise && <td>{body.expertise}</td>}
                {hasOrganisationType && <td>{body.organisationType}</td>}
                {hasAddress && <td>{body.address}</td>}
                {hasEmail && <td>
                  {body.emails.map(email => (
                    <div key={email}><a href={`mailto:${email}`}>{email}</a></div>
                  ))}
                </td>}
                {hasTelephone && <td>{body.telephone}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}