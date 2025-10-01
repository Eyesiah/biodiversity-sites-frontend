'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import { CollapsibleRow } from '@/components/CollapsibleRow';
import ExternalLink from '@/components/ExternalLink';
import MapContentLayout from '@/components/MapContentLayout';
import { ARCGIS_LNRS_URL } from '@/config';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import styles from '@/styles/SiteDetails.module.css';

const PolygonMap = dynamic(() => import('components/Maps/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function LNRSContent({ lnrs, sites, error }) {
  const [selectedLnrs, setSelectedLnrs] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  const sitesInSelectedLNRS = useMemo(() => {
    if (!selectedLnrs) return [];
    return (sites || []).filter(site => site.lnrsName === selectedLnrs.name);
  }, [selectedLnrs, sites]);

  const handleMapSelection = (item) => {
    setSelectedLnrs(item);
    setOpenRowId(item.id);
  };

  const handleAdjacentMapSelection = (item) => {
    setSelectedLnrs(item);
  };

  const totalArea = useMemo(() => lnrs.reduce((sum, item) => sum + item.size, 0), [lnrs]);

  if (error) {
    return <p className="error">Error fetching data: {error}</p>;
  }

  return (
    <MapContentLayout
      map={
        <PolygonMap 
          selectedItem={selectedLnrs}
          geoJsonUrl={ARCGIS_LNRS_URL}
          nameProperty="name"
          sites={sitesInSelectedLNRS}
          style={{ color: '#4CAF50', weight: 2, opacity: 0.8, fillOpacity: 0.3 }}
        />
      }
      content={
        <>
          <SearchableTableLayout
            initialItems={lnrs}
            filterPredicate={(item, term) => (item.name?.toLowerCase() || '').includes(term)}
            initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
            placeholder="Search by LNRS name."
            exportConfig={{
                onExportXml: (items) => exportToXml(items, 'localNatureRecoveryStrategies', 'lnrs', 'lnrs-areas.xml'),
                onExportJson: (items) => exportToJson(items, 'lnrs', 'lnrs-areas.json')
            }}
            summary={(filteredCount, totalCount) => (
                <p style={{ fontSize: '1.2rem' }}>
                    Displaying <strong>{formatNumber(filteredCount, 0)}</strong> of <strong>{formatNumber(totalCount, 0)}</strong> LNRS areas, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.
                </p>
            )}
          >
            {({ sortedItems, requestSort, getSortIndicator }) => (
              <table className="site-table">
                <thead>
                  <tr>
                    <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
                    <th onClick={() => requestSort('name')}>LNRS Name{getSortIndicator('name')}</th>
                    <th onClick={() => requestSort('responsibleAuthority')}>Responsible Authority{getSortIndicator('responsibleAuthority')}</th>
                    <th onClick={() => requestSort('publicationStatus')}>Publication Status{getSortIndicator('publicationStatus')}</th>
                    <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
                    <th onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</th>
                    <th onClick={() => requestSort('adjacents.length')}># Adjacent LNRS{getSortIndicator('adjacents.length')}</th>
                    <th>Map</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <CollapsibleRow 
                      key={item.id}
                      isOpen={openRowId === item.id}
                      setIsOpen={(isOpen) => setOpenRowId(isOpen ? item.id : null)}
                      mainRow={(
                        <>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.responsibleAuthority}</td>
                          <td>{item.link ? <ExternalLink href={item.link}>{item.publicationStatus}</ExternalLink> : item.publicationStatus}</td>
                          <td className="numeric-data">{formatNumber(item.size, 0)}</td>
                          <td className="centered-data">{item.siteCount}</td>
                          <td className="centered-data">{item.adjacents?.length || 0}</td>
                          <td>
                            <button onClick={(e) => { e.stopPropagation(); handleMapSelection(item); }} className="linkButton">
                              Display Map
                            </button>
                          </td>
                        </>
                      )}
                      collapsibleContent={(
                        <div style={{ padding: '0.5rem' }}>
                          <h4>Adjacent LNRS Areas</h4>
                          {item.adjacents && item.adjacents.length > 0 ? (
                            <table className={styles.subTable}>
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Name</th>
                                  <th>Area (ha)</th>
                                  <th># BGS Sites</th>
                                  <th>Map</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.adjacents.map(adj => {
                                  const adjacentLnrsObject = lnrs.find(l => l.id === adj.id);
                                  return (
                                    <tr key={adj.id}>
                                      <td>{adj.id}</td>
                                      <td>{adj.name}</td>
                                      <td className="numeric-data">{formatNumber(adj.size, 0)}</td>
                                      <td className="centered-data">{adjacentLnrsObject?.siteCount || 0}</td>
                                      <td><button onClick={(e) => { e.stopPropagation(); handleAdjacentMapSelection(adjacentLnrsObject); }} className="linkButton">Display Map</button></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <p>No adjacency data available.</p>
                          )}
                        </div>
                      )}
                      colSpan={8}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </SearchableTableLayout>
          <p style={{ fontStyle: 'italic' }}>When a site map is selected, adjacent LNRS sites are shown coloured pink.</p>
        </>
      }
    />
  );
}