'use client'

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { formatNumber } from '@/lib/format';
import styles from '@/styles/SiteDetails.module.css';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow';
import { XMLBuilder } from 'fast-xml-parser';
import { useSortableData } from '@/lib/hooks';
import { ARCGIS_LPA_URL } from '@/config';
import MapContentLayout from '@/components/MapContentLayout';

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

const DEBOUNCE_DELAY_MS = 300;


export default function LPAContent({ lpas, sites }) {
  
    const [inputValue, setInputValue] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedLpa, setSelectedLpa] = useState(null);
    const [openRowId, setOpenRowId] = useState(null);

    const handleAdjacentMapSelection = (item) => {
        setSelectedLpa(item);
    };


    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(inputValue);
        }, DEBOUNCE_DELAY_MS);

        return () => clearTimeout(timerId);
    }, [inputValue]);

    const filteredLPAs = useMemo(() => {
        let filtered = [...lpas];

        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(lpa =>
                (lpa.name?.toLowerCase() || '').includes(lowercasedTerm) ||
                (lpa.id?.toLowerCase() || '').includes(lowercasedTerm)
            );
        }
        return filtered;
    }, [lpas, debouncedSearchTerm]);

    const { items: filteredAndSortedLPAs, requestSort, getSortIndicator } = useSortableData(filteredLPAs, { key: 'siteCount', direction: 'descending' });

    const sitesInSelectedLPA = useMemo(() => {
        if (!selectedLpa) return [];
        return (sites || []).filter(site => site.lpaName === selectedLpa.name);
    }, [selectedLpa, sites]);

    const totalArea = useMemo(() => lpas.reduce((sum, lpa) => sum + lpa.size, 0), [lpas]);

    const summaryData = useMemo(() => {
        const source = filteredAndSortedLPAs;
        return {
            totalSize: source.reduce((sum, lpa) => sum + (lpa.size || 0), 0),
            totalSites: source.reduce((sum, lpa) => sum + (lpa.siteCount || 0), 0),
            totalAllocations: source.reduce((sum, lpa) => sum + (lpa.allocationsCount || 0), 0),
            totalAdjacents: source.reduce((sum, lpa) => sum + (lpa.adjacentsCount || 0), 0),
        };
    }, [filteredAndSortedLPAs]);

    const triggerDownload = (blob, filename) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportXML = () => {
        const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
        const xmlDataStr = builder.build({ localPlanningAuthorities: { lpa: filteredAndSortedLPAs } });
        const blob = new Blob([xmlDataStr], { type: 'application/xml' });
        triggerDownload(blob, 'local-planning-authorities.xml');
    };

    const handleExportJSON = () => {
        const jsonDataStr = JSON.stringify({ lpas: filteredAndSortedLPAs }, null, 2);
        const blob = new Blob([jsonDataStr], { type: 'application/json' });
        triggerDownload(blob, 'local-planning-authorities.json');
    };

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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
                                <div className="search-container" style={{ margin: 0 }}>
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder="Search by LPA name or ID."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        autoFocus
                                    />
                                    {inputValue && (
                                        <button onClick={() => setInputValue('')} className="clear-search-button" aria-label="Clear search">&times;</button>
                                    )}
                                </div>
                                <div className={styles.buttonGroup}>
                                    <button onClick={handleExportXML} className={styles.exportButton}>Export to XML</button>
                                    <button onClick={handleExportJSON} className={styles.exportButton}>Export to JSON</button>
                                </div>
                            </div>
                            <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(filteredAndSortedLPAs.length, 0)}</strong> of <strong>{formatNumber(lpas.length, 0)}</strong> LPAs.</p>
                            <p style={{ fontStyle: 'italic' }}>When a site map is selected, adjacent LPAs are shown coloured pink.</p>
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
                                    {filteredAndSortedLPAs.map((lpa) => (
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
                        </>
                    }
                />
      </>
    )
}