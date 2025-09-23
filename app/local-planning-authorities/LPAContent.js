'use client'

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import styles from '@/styles/SiteDetails.module.css';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow';
import { ARCGIS_LPA_URL } from '@/config';
import MapContentLayout from '@/components/MapContentLayout';
import SearchableTableLayout from '@/components/SearchableTableLayout';

const PolygonMap = dynamic(() => import('@/components/Maps/PolygonMap'), {
    ssr: false,
    loading: () => <p>Loading map...</p>
});

function LpaDetails({ lpa, onAdjacentClick, lpas, onRowClick }) {
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
              <th># BGS Sites</th>
              <th>Map</th>
            </tr>
          </thead>
          <tbody>
            {lpa.adjacents.map(adj => {
              const adjacentLpaObject = lpas?.find(l => l.id === adj.id);
              return (
                <tr key={adj.id}>
                  <td>{adj.id}</td>
                  <td>{adj.name}</td>
                  <td className="numeric-data">{formatNumber(adj.size, 0)}</td>
                  <td className="centered-data">{adjacentLpaObject?.siteCount || 0}</td>
                  <td><button onClick={(e) => { e.stopPropagation(); onAdjacentClick(adjacentLpaObject); }} className="linkButton">Display Map</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>No adjacency data available.</p>
      )}
    </div>
  );
}

const LpaDataRow = ({ lpa, onRowClick, lpas, isOpen, setIsOpen, handleAdjacentMapSelection }) => (
  <DataFetchingCollapsibleRow
    className={styles.clickableRow}
    mainRow={(
      <>
        <td>{lpa.id}</td>
        <td>{lpa.name}</td>
        <td className="numeric-data">{formatNumber(lpa.size, 0)}</td>
        <td className="centered-data">{lpa.siteCount}</td>
        <td className="centered-data">{lpa.allocationsCount}</td>
        <td className="centered-data">{lpa.adjacentsCount}</td>
        <td>
            <button onClick={(e) => { e.stopPropagation(); onRowClick(lpa); }} className="linkButton">
                Display Map
            </button>
        </td>
      </>
    )}
    dataUrl={`/api/modal/lpa/${lpa.id}`}
    renderDetails={details => <LpaDetails lpa={details} onAdjacentClick={handleAdjacentMapSelection} lpas={lpas} />}
    dataExtractor={json => json.lpa}
    colSpan={7}
    isOpen={isOpen}
    setIsOpen={setIsOpen}
  />
);

export default function LPAContent({ lpas, sites }) {
  
    const [selectedLpa, setSelectedLpa] = useState(null);
    const [openRowId, setOpenRowId] = useState(null);

    const handleAdjacentMapSelection = (item) => {
        setSelectedLpa(item);
    };

    const sitesInSelectedLPA = useMemo(() => {
        if (!selectedLpa) return [];
        return (sites || []).filter(site => site.lpaName === selectedLpa.name);
    }, [selectedLpa, sites]);

    return (
      <>
        <MapContentLayout
            map={
                <PolygonMap
                    selectedItem={selectedLpa}
                    geoJsonUrl={ARCGIS_LPA_URL}
                    nameProperty="name"
                    sites={sitesInSelectedLPA}
                    style={{ color: '#3498db', weight: 2, opacity: 0.8, fillOpacity: 0.2 }}
                />
            }
            content={
                <>
                    <h1 className="title">Local Planning Authorities</h1>
                    <SearchableTableLayout
                        initialItems={lpas}
                        filterPredicate={(lpa, term) => 
                            (lpa.name?.toLowerCase() || '').includes(term) ||
                            (lpa.id?.toLowerCase() || '').includes(term)}
                        initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
                        placeholder="Search by LPA name or ID."
                        exportConfig={{
                            onExportXml: (items) => exportToXml(items, 'localPlanningAuthorities', 'lpa', 'local-planning-authorities.xml'),
                            onExportJson: (items) => exportToJson(items, 'lpas', 'local-planning-authorities.json')
                        }}
                        summary={(filteredCount, totalCount) => (
                            <p style={{ fontSize: '1.2rem' }}>
                                Displaying <strong>{formatNumber(filteredCount, 0)}</strong> of <strong>{formatNumber(totalCount, 0)}</strong> LPAs.
                            </p>
                        )}
                    >
                        {({ sortedItems, requestSort, getSortIndicator }) => {
                            const summaryData = {
                                totalSites: sortedItems.reduce((sum, lpa) => sum + (lpa.siteCount || 0), 0),
                                totalAllocations: sortedItems.reduce((sum, lpa) => sum + (lpa.allocationsCount || 0), 0),
                                totalAdjacents: sortedItems.reduce((sum, lpa) => sum + (lpa.adjacentsCount || 0), 0),
                            };
                            return (
                                <table className="site-table">
                                    <thead>
                                        <tr>
                                            <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
                                            <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
                                            <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
                                            <th onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</th>
                                            <th onClick={() => requestSort('allocationsCount')}># Allocations{getSortIndicator('allocationsCount')}</th>
                                            <th onClick={() => requestSort('adjacentsCount')}># Adjacent LPAs{getSortIndicator('adjacentsCount')}</th>
                                            <th>Map</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
                                            <td colSpan="2" style={{ textAlign: 'center' }}>Totals</td>
                                            <td></td>
                                            <td className="centered-data">{formatNumber(summaryData.totalSites, 0)}</td>
                                            <td className="centered-data">{formatNumber(summaryData.totalAllocations, 0)}</td>
                                            <td className="centered-data">{formatNumber(summaryData.totalAdjacents, 0)}</td>
                                            <td></td>
                                        </tr>
                                        {sortedItems.map((lpa) => (
                                            <LpaDataRow 
                                                key={lpa.id} 
                                                lpa={lpa} 
                                                onRowClick={(item) => { setSelectedLpa(item); setOpenRowId(item.id === openRowId ? null : item.id); }}
                                                lpas={lpas} 
                                                handleAdjacentMapSelection={handleAdjacentMapSelection}
                                                isOpen={openRowId === lpa.id}
                                                setIsOpen={(isOpen) => setOpenRowId(isOpen ? lpa.id : null)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            )
                        }}
                    </SearchableTableLayout>
                    <p style={{ fontStyle: 'italic' }}>When a site map is selected, adjacent LPAs are shown coloured pink.</p>
                </>
            }
        />
      </>
    )
}