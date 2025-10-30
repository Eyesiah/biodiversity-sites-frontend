'use client';

import Papa from 'papaparse';
import { useState, useMemo, useEffect } from 'react';
import { formatNumber } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import { CollapsibleRow } from '@/components/data/CollapsibleRow';
import SiteList from '@/components/data/SiteList';
import dynamic from 'next/dynamic';
import MapContentLayout from '@/components/ui/MapContentLayout';
import ExternalLink from '@/components/ui/ExternalLink';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { PrimaryTable } from '@/components/styles/PrimaryTable';

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const BodyRow = ({ body, onToggle, isOpen, onSiteHover, onSiteClick }) => {
    const mainRow = (
      <>
        <PrimaryTable.Cell>{body.name}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{body.sites.length}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{body.designationDate}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{body.expertise}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{body.organisationType}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{body.address}</PrimaryTable.Cell>
        <PrimaryTable.Cell>
          {body.emails.map(email => (
            <div key={email}><a href={`mailto:${email}`}>{email}</a></div>
          ))}
        </PrimaryTable.Cell>
        <PrimaryTable.Cell>{body.telephone}</PrimaryTable.Cell>
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

    const unknownRB = responsibleBodies.find(rb => rb.name == '<Unknown>');
    const numDesignated = unknownRB ? responsibleBodies.length - 1 : responsibleBodies.length;
    
    return (
        <MapContentLayout
          map={
            <SiteMap sites={mapSites} height="85vh" hoveredSite={hoveredSite} selectedSite={selectedSite} onSiteSelect={setSelectedSite} />
          }
          content={
            <>
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
                summary={(filteredCount, totalCount) => (
                    <div className="summary" style={{ textAlign: 'center' }}>           
                        {filteredCount != totalCount ? (
                        <p>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> of <strong>{formatNumber(totalCount, 0)}</strong> bodies</p>
                        ) : (
                        <p style={{ fontStyle: 'normalitalic', fontSize: '1.2rem' }}>
                          These <strong>{numDesignated}</strong> responsible bodies may enter into <ExternalLink href={`https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies`}><strong>conservation covenant agreements</strong></ExternalLink> with landowners in England.
                          {unknownRB && <><br />There are <strong>{unknownRB.sites.length}</strong> BGS sites that do not list a designated responsible body, only LPAs.</>}
                        </p>
                    )}
                    </div>
                )}
              >
                {({ sortedItems, requestSort, getSortIndicator }) => (
                    <PrimaryTable.Root>
                        <PrimaryTable.Header>
                        <PrimaryTable.Row>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('sites.length')}># BGS Sites{getSortIndicator('sites.length')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('designationDate')}>Designation Date{getSortIndicator('designationDate')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('expertise')}>Area of Expertise{getSortIndicator('expertise')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('organisationType')}>Type of Organisation{getSortIndicator('organisationType')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader onClick={() => requestSort('address')}>Address{getSortIndicator('address')}</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader>Email</PrimaryTable.ColumnHeader>
                            <PrimaryTable.ColumnHeader>Telephone</PrimaryTable.ColumnHeader>
                        </PrimaryTable.Row>
                        </PrimaryTable.Header>
                        <PrimaryTable.Body>
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
                        </PrimaryTable.Body>
                    </PrimaryTable.Root>
                )}
              </SearchableTableLayout>
            </>
          }
        />
    );
  }
