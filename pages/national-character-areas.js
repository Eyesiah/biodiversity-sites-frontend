import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import fs from 'fs';
import ExternalLink from '../components/ExternalLink';
import path from 'path';
import { fetchAllSites } from '../lib/api';
import { formatNumber, slugify } from '../lib/format';
import styles from '../styles/SiteDetails.module.css';
import { CollapsibleRow } from '../components/CollapsibleRow';
import { useSortableData } from '../lib/hooks';
import { XMLBuilder } from 'fast-xml-parser';

const PolygonMap = dynamic(() => import('../components/MapsPolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export async function getStaticProps() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'NCAs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawNcas = JSON.parse(jsonData);
    const allSites = await fetchAllSites(0, true);

    const siteCountsByNCA = allSites.reduce((acc, site) => {
      if (site.nationalCharacterArea?.name) {
        acc[site.nationalCharacterArea.name] = (acc[site.nationalCharacterArea.name] || 0) + 1;
      }
      return acc;
    }, {});

    // Convert size from square meters to hectares
    rawNcas.forEach(nca => {
      nca.size = nca.size / 10000;
      nca.siteCount = siteCountsByNCA[nca.name] || 0;
      if (nca.adjacents) {
        nca.adjacents.forEach(adj => adj.size = adj.size / 10000);
      }
    });
    const ncas = rawNcas.sort((a, b) => a.name.localeCompare(b.name));
    
    return {
      props: {
        ncas,
        sites: allSites.map(s => ({ referenceNumber: s.referenceNumber, ncaName: s.nationalCharacterArea?.name || null, position: [s.latitude, s.longitude], responsibleBodies: s.responsibleBodies || [], lpaName: s.lpaArea?.name || null, siteSize: s.siteSize || 0, lnrsName: s.lnrsName || null })),
        lastUpdated: new Date().toISOString(),
        error: null,
      },
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    throw e;
  }
}

const DEBOUNCE_DELAY_MS = 300;

export default function NationalCharacterAreasPage({ ncas, sites, error }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedNca, setSelectedNca] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filteredNCAs = useMemo(() => {
    let filtered = [...ncas];
    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name?.toLowerCase() || '').includes(lowercasedTerm)
      );
    }
    return filtered;
  }, [ncas, debouncedSearchTerm]);

  const { items: filteredAndSortedNCAs, requestSort, getSortIndicator } = useSortableData(filteredNCAs, { key: 'name', direction: 'ascending' });

  const sitesInSelectedNCA = useMemo(() => {
    if (!selectedNca) return [];
    return (sites || []).filter(site => site.ncaName === selectedNca.name);
  }, [selectedNca, sites]);

  const handleMapSelection = (item) => {
    setSelectedNca(item);
    setOpenRowId(item.id);
  };

  const handleAdjacentMapSelection = (item) => {
    setSelectedNca(item);
  };

  const totalArea = useMemo(() => ncas.reduce((sum, nca) => sum + nca.size, 0), [ncas]);

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
    const xmlDataStr = builder.build({ nationalCharacterAreas: { nca: filteredAndSortedNCAs } });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'national-character-areas.xml');
  };

  const handleExportJSON = () => {
    const jsonDataStr = JSON.stringify({ ncas: filteredAndSortedNCAs }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'national-character-areas.json');
  };

  if (error) {
    return <div className="container"><p className="error">Error fetching data: {error}</p></div>;
  }

  return (
    <div className="container">
      <Head>
        <title>National Character Areas</title>
      </Head>
      <main className="main">
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <div style={{ flex: '1 1 50%', marginRight: '1rem', position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>
            <PolygonMap
              selectedItem={selectedNca}
              geoJsonUrl="https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query"
              nameProperty="name"
              sites={sitesInSelectedNCA}
              style={{ color: '#8e44ad', weight: 2, opacity: 0.8, fillOpacity: 0.2 }}
            />
          </div>
          <div style={{ flex: '1 1 50%' }}>
            <h1 className="title">National Character Areas</h1>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
              <div className="search-container" style={{ margin: 0 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by NCA name."
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
            <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(filteredAndSortedNCAs.length, 0)}</strong> of <strong>{formatNumber(ncas.length, 0)}</strong> NCAs, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.</p>
            <p style={{ fontStyle: 'italic' }}>When a site map is selected, adjacent NCAs are shown coloured pink.</p>
            <table className="site-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
                  <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
                  <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
                  <th>Map</th>
                  <th onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</th>
                  <th onClick={() => requestSort('adjacents.length')}># Adjacent NCAs{getSortIndicator('adjacents.length')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedNCAs.map((nca) => (
                  <CollapsibleRow
                    key={nca.id}
                    isOpen={openRowId === nca.id}
                    setIsOpen={(isOpen) => setOpenRowId(isOpen ? nca.id : null)}
                    mainRow={(
                      <>
                        <td>
                          <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(nca.name)}/`}>{nca.id}</ExternalLink>
                        </td>
                        <td>{nca.name}</td>
                        <td className="numeric-data">{formatNumber(nca.size, 0)}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleMapSelection(nca); }} className="linkButton">
                            Show map
                          </button>
                        </td>
                        <td className="centered-data">{nca.siteCount}</td>
                        <td className="centered-data">{nca.adjacents?.length || 0}</td>
                      </>
                    )}
                    collapsibleContent={(
                      <div style={{ padding: '0.5rem' }}>
                        <h4>Adjacent NCAs</h4>
                        {nca.adjacents && nca.adjacents.length > 0 ? (
                          <table className={styles.subTable}>
                            <thead><tr><th>ID</th><th>Name</th><th>Area (ha)</th><th>Map</th></tr></thead>
                            <tbody>
                              {nca.adjacents.map(adj => {
                                const adjacentNcaObject = ncas.find(n => n.id === adj.id);
                                return (
                                  <tr key={adj.id}><td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 0)}</td>
                                  <td><button onClick={(e) => { e.stopPropagation(); handleAdjacentMapSelection(adjacentNcaObject); }} className="linkButton">Show map</button></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (<p>No adjacency data available.</p>)}
                      </div>
                    )}
                    colSpan={6}
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