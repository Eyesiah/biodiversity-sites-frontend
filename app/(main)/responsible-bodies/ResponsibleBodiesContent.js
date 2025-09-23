'use client';

import Papa from 'papaparse';
import { useState, useMemo, useEffect } from 'react';
import { formatNumber } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import { CollapsibleRow } from '@/components/CollapsibleRow';
import SiteList from '@/components/SiteList';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/MapContentLayout';
import ExternalLink from '@/components/ExternalLink';
import SearchableTableLayout from '@/components/SearchableTableLayout';

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
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
  
    const handleExport = (itemsToExport) => {
      const csvData = itemsToExport.map(body => ({
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
              <SearchableTableLayout
                initialItems={responsibleBodies}
                filterPredicate={(body, term) =>
                    (body.name?.toLowerCase() || '').includes(term) ||
                    (body.expertise?.toLowerCase() || '').includes(term) ||
                    (body.organisationType?.toLowerCase() || '').includes(term) ||
                    (body.address?.toLowerCase() || '').includes(term)}
                initialSortConfig={{ key: 'sites.length', direction: 'descending' }}
                placeholder="Search by name, expertise, type, or address."
                exportConfig={{ onExportCsv: handleExport }}
                summary={(filteredCount, totalCount, inputValue) => (
                    <div className="summary" style={{ textAlign: 'center' }}>           
                        {inputValue ? (
                        <p>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> of <strong>{formatNumber(totalCount, 0)}</strong> bodies</p>
                        ) : (
                        <p style={{ fontStyle: 'normalitalic', fontSize: '1.2rem' }}>
                            These <strong>{formatNumber(totalCount, 0)}</strong> responsible bodies may enter into <ExternalLink href={`https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies`}><strong>conservation covenant agreements</strong></ExternalLink> with landowners in England.
                        </p>
                    )}
                    </div>
                )}
              >
                {({ sortedItems, requestSort, getSortIndicator }) => (
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
                        {sortedItems.map((body) => (
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
                )}
              </SearchableTableLayout>
              <p style={{ fontStyle: 'italic', fontSize: '1.2rem' }}>
                Not all the Responsible Bodies listed here are included in the BGS Site List page or share the same name.
              </p>
            </>
          }
        />
    );
  }
