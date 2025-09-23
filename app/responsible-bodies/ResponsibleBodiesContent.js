'use client';

import Papa from 'papaparse';
import { useState, useMemo, useEffect } from 'react';
import { slugify, formatNumber, normalizeBodyName } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import { useSearchAndSort } from '@/lib/hooks';
import { CollapsibleRow } from '@/components/CollapsibleRow';
import SiteList from '@/components/SiteList';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/MapContentLayout';
import ExternalLink from '@/components/ExternalLink';

const SiteMap = dynamic(() => import('../../components/Maps/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const BodyRow = ({ body, onToggle, isOpen, onSiteHover, onSiteClick }) => {
    const mainRow = (
      <>
        <td>{body.name}</td>
        <td>{body.sites.length}</td>
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
      </>
    )
  
    const collapsibleContent = (
      <SiteList sites={body.sites} onSiteHover={onSiteHover} onSiteClick={onSiteClick} />
    )
  
    return (
      <CollapsibleRow
        mainRow={mainRow}
        collapsibleContent={collapsibleContent}
        colSpan={8}
        onToggle={onToggle}
        isOpen={isOpen}
      />
    );
  }
  
  export default function ResponsibleBodiesContent({ responsibleBodies }) {
    const [mapSites, setMapSites] = useState([]);
    const [hoveredSite, setHoveredSite] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});
  
    const { 
        inputValue, 
        setInputValue, 
        sortedItems: filteredAndSortedBodies, 
        requestSort, 
        getSortIndicator 
    } = useSearchAndSort(
        responsibleBodies,
        (body, term) =>
          (body.name?.toLowerCase() || '').includes(term) ||
          (body.expertise?.toLowerCase() || '').includes(term) ||
          (body.organisationType?.toLowerCase() || '').includes(term) ||
          (body.address?.toLowerCase() || '').includes(term),
        { key: 'sites.length', direction: 'descending' }
    );

    const handleToggle = (bodyName, isOpen) => {
      if (isOpen) {
        setExpandedRows({ [bodyName]: true });
      } else {
        setExpandedRows({});
      }
    };
  
    useEffect(() => {
      const sites = [];
      for (const bodyName in expandedRows) {
        if (expandedRows[bodyName]) {
          const body = responsibleBodies.find(b => b.name === bodyName);
          if (body) {
            sites.push(...body.sites);
          }
        }
      }
      setMapSites(sites);
      setSelectedSite(null);
    }, [expandedRows, responsibleBodies]);
  
    const handleExport = () => {
      const csvData = filteredAndSortedBodies.map(body => ({
        'Name': body.name,
        '# BGS Sites': body.sites.length,
        'Designation Date': body.designationDate,
        'Area of Expertise': body.expertise,
        'Type of Organisation': body.organisationType,
        'Address': body.address,
        'Email': body.emails.join('; '),
        'Telephone': body.telephone,
      }));
  
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, 'responsible-bodies.csv');
    };
  
  
    return (
        <MapContentLayout
          map={
            <SiteMap sites={mapSites} height="85vh" hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={setSelectedSite} />
          }
          content={
            <>
              <h1 className="title">Designated Responsible Bodies</h1>
              <div className="summary" style={{ textAlign: 'center' }}>           
                {inputValue ? (
                  <p>Displaying <strong>{formatNumber(filteredAndSortedBodies.length, 0)}</strong> of <strong>{formatNumber(responsibleBodies.length, 0)}</strong> bodies</p>
                ) : (
                  <p style={{ fontStyle: 'normalitalic', fontSize: '1.2rem' }}>
                      These <strong>{formatNumber(responsibleBodies.length, 0)}</strong> responsible bodies may enter into <ExternalLink href={`https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies`}><strong>conservation covenant agreements</strong></ExternalLink> with landowners in England.
                  </p>
              )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
                <div className="search-container" style={{ margin: 0 }}>
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
                <button onClick={handleExport} className="linkButton" style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
                  Export to CSV
                </button>
              </div>
              <p style={{ fontStyle: 'italic', fontSize: '1.2rem' }}>
                Not all the Responsible Bodies listed here are included in the BGS Site List page or share the same name.
              </p>
              <table className="site-table">
                <thead>
                  <tr>
                    <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
                    <th onClick={() => requestSort('sites.length')}># BGS Sites{getSortIndicator('sites.length')}</th>
                    {<th onClick={() => requestSort('designationDate')}>Designation Date{getSortIndicator('designationDate')}</th>}
                    {<th onClick={() => requestSort('expertise')}>Area of Expertise{getSortIndicator('expertise')}</th>}
                    {<th onClick={() => requestSort('organisationType')}>Type of Organisation{getSortIndicator('organisationType')}</th>}
                    {<th onClick={() => requestSort('address')}>Address{getSortIndicator('address')}</th>}
                    {<th>Email</th>}
                    {<th>Telephone</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedBodies.map((body) => (
                    <BodyRow
                      body={body}
                      key={body.name}
                      isOpen={expandedRows[body.name] || false}
                      onToggle={(isOpen) => handleToggle(body.name, isOpen)}
                      onSiteHover={setHoveredSite}
                      onSiteClick={setSelectedSite}
                    />              
                  ))}
                </tbody>
              </table>
            </>
          }
        />
    );
  }