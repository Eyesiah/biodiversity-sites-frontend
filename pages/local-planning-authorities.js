import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import fs from 'fs';
import path from 'path';
import { formatNumber } from '@/lib/format';
import styles from '@/styles/SiteDetails.module.css';
import { fetchAllSites } from '@/lib/api';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow';
import { XMLBuilder } from 'fast-xml-parser';
import { useSortableData } from '@/lib/hooks';

const PolygonMap = dynamic(() => import('../components/Maps/PolygonMap'), {
    ssr: false,
    loading: () => <p>Loading map...</p>
});

export async function getStaticProps() {
    try {
        const jsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
        const jsonData = fs.readFileSync(jsonPath, 'utf-8');
        const rawLpas = JSON.parse(jsonData);

        const allSites = await fetchAllSites(0, true);
        const allocationCounts = {};
        const siteCounts = {};

        allSites.forEach(site => {
            if (site.allocations) {
                site.allocations.forEach(alloc => {
                    const lpaName = alloc.localPlanningAuthority;
                    allocationCounts[lpaName] = (allocationCounts[lpaName] || 0) + 1;
                });
            }
            if (site.lpaArea?.name) {
                const lpaName = site.lpaArea.name;
                siteCounts[lpaName] = (siteCounts[lpaName] || 0) + 1;
            }
        });

        const lpas = rawLpas
            // Only include English LPAs
            .filter((lpa) => lpa.id && lpa.id.startsWith('E'))
            .map((lpa) => ({
                id: lpa.id,
                name: lpa.name,
                adjacents: lpa.adjacents || [],
                size: lpa.size / 10000,
                adjacentsCount: lpa.adjacents ? lpa.adjacents.length : 0,
                siteCount: siteCounts[lpa.name] || 0,
                allocationsCount: allocationCounts[lpa.name] || 0,
            })).sort((a, b) => a.name.localeCompare(b.name));

        return {
            props: {
                lpas,
                sites: allSites.map(s => ({ referenceNumber: s.referenceNumber, lpaName: s.lpaArea?.name || null, position: [s.latitude, s.longitude], responsibleBodies: s.responsibleBodies || [], ncaName: s.nationalCharacterArea?.name || null, siteSize: s.siteSize || 0, lnrsName: s.lnrsName || null })),
                lastUpdated: new Date().toISOString(),
                error: null
            }
        };
    } catch (e) {
        throw e;
    }
}

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
              <th>Map</th>
            </tr>
          </thead>
          <tbody>
            {lpa.adjacents.map(adj => {
              const adjacentLpaObject = lpas?.find(l => l.id === adj.id);
              return (
                <tr key={adj.id}>
                  <td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 0)}</td>
                  <td><button onClick={(e) => { e.stopPropagation(); onAdjacentClick(adjacentLpaObject); }} className="linkButton">Show map</button></td>
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
        <td>
            <button onClick={(e) => { e.stopPropagation(); onRowClick(lpa); }} className="linkButton">
                Show map
            </button>
        </td>
        <td className="centered-data">{lpa.siteCount}</td>
        <td className="centered-data">{lpa.allocationsCount}</td>
        <td className="centered-data">{lpa.adjacentsCount}</td>
      </>
    )}
    dataUrl={`/modals/lpas/${lpa.id}.json`}
    renderDetails={details => <LpaDetails lpa={details} onAdjacentClick={handleAdjacentMapSelection} lpas={lpas} />}
    dataExtractor={json => json.pageProps.lpa}
    colSpan={7}
    isOpen={isOpen}
    setIsOpen={setIsOpen}
  />
);

const DEBOUNCE_DELAY_MS = 300;

export default function LocalPlanningAuthoritiesPage({ lpas, sites, error }) {
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

    const { items: filteredAndSortedLPAs, requestSort, getSortIndicator } = useSortableData(filteredLPAs, { key: 'name', direction: 'ascending' });

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

    if (error) {
        return <div className="container"><p className="error">Error fetching data: {error}</p></div>;
    }

    return (
        <div className="container">
            <Head>
                <title>Local Planning Authorities</title>
            </Head>
            <main className="main">
                <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                    <div style={{ flex: '1 1 50%', marginRight: '1rem', position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>
                        <PolygonMap
                            selectedItem={selectedLpa}
                            geoJsonUrl="https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LPA_APR_2023_UK_BUC_V2/FeatureServer/0/query"
                            nameProperty="name"
                            sites={sitesInSelectedLPA}
                            style={{ color: '#3498db', weight: 2, opacity: 0.8, fillOpacity: 0.2 }}
                        />
                    </div>
                    <div style={{ flex: '1 1 50%' }}>
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
                                    <th>Map</th>
                                    <th onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</th>
                                    <th onClick={() => requestSort('allocationsCount')}># Allocations{getSortIndicator('allocationsCount')}</th>
                                    <th onClick={() => requestSort('adjacentsCount')}># Adjacent LPAs{getSortIndicator('adjacentsCount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
                                    <td colSpan="2" style={{ textAlign: 'center' }}>Totals</td>
                                    <td></td>
                                    <td></td>
                                    <td className="centered-data">{formatNumber(summaryData.totalSites, 0)}</td>
                                    <td className="centered-data">{formatNumber(summaryData.totalAllocations, 0)}</td>
                                    <td className="centered-data">{formatNumber(summaryData.totalAdjacents, 0)}</td>
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
                    </div>
                </div>
            </main>
        </div>
    );
}