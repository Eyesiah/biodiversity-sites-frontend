import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import fs from 'fs';
import path from 'path';
import { fetchAllSites } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { CollapsibleRow } from '@/components/CollapsibleRow';
import { useSortableData } from '@/lib/hooks';
import styles from '@/styles/SiteDetails.module.css';
import { XMLBuilder } from 'fast-xml-parser';
import { processSitesForListView} from '@/lib/sites';
import { ARCGIS_LNRS_URL } from '@/config';
import ExternalLink from '@/components/ExternalLink';
import MapContentLayout from '@/components/MapContentLayout';

const PolygonMap = dynamic(() => import('components/Maps/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export async function getStaticProps() {  
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'LNRSs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawLnrs = JSON.parse(jsonData);
    const allSites = await fetchAllSites(true);

    const lnrsArcGISRes = await fetch(`${ARCGIS_LNRS_URL}?where=1%3D1&outFields=*&returnGeometry=false&f=json`, {next: { revalidate: 3600 } });
    const lnrsArcGISData = await lnrsArcGISRes.json();

    const siteCountsByLnrs = allSites.reduce((acc, site) => {
      if (site.lnrsName) {
        acc[site.lnrsName] = (acc[site.lnrsName] || 0) + 1;
      }
      return acc;
    }, {});

    rawLnrs.forEach(lnrs => {
      // Convert size from square meters to hectares
      lnrs.size = lnrs.size / 10000;
      lnrs.siteCount = siteCountsByLnrs[lnrs.name] || 0;
      // Ensure adjacents exist before processing
      (lnrs.adjacents || []).forEach(adj => adj.size = adj.size / 10000);
      // add link to published from argisData

      const arcGISLNRS = lnrsArcGISData.features.find(f => f.attributes.Name == lnrs.name);
      if (arcGISLNRS) {
        lnrs.publicationStatus = arcGISLNRS.attributes.Status || 'N/A';
        if (arcGISLNRS.attributes.Link_to_published) {
          lnrs.link = arcGISLNRS.attributes.Link_to_published;
        }
      }
    });

    // Sort by name by default
    const lnrs = rawLnrs.sort((a, b) => a.name.localeCompare(b.name));

    return {
      props: {
        lnrs,
        sites: processSitesForListView(allSites),
        lastUpdated: new Date().toISOString(),
        error: null,
      },
      revalidate: 3600, // In seconds
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    throw e;
  }
}

const DEBOUNCE_DELAY_MS = 300;

export default function LNRSAreasPage({ lnrs, sites, error }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedLnrs, setSelectedLnrs] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filteredLNRS = useMemo(() => {
    let filtered = [...lnrs];

    if (debouncedSearchTerm) {
      const lowercasedTerm = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name?.toLowerCase() || '').includes(lowercasedTerm)
      );
    }
    return filtered;
  }, [lnrs, debouncedSearchTerm]);

  const { items: filteredAndSortedLNRS, requestSort, getSortIndicator } = useSortableData(filteredLNRS, { key: 'siteCount', direction: 'descending' });

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
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const xmlDataStr = builder.build({ localNatureRecoveryStrategies: { lnrs: filteredAndSortedLNRS } });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'lnrs-areas.xml');
  };

  const handleExportJSON = () => {
    const jsonDataStr = JSON.stringify({ lnrs: filteredAndSortedLNRS }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'lnrs-areas.json');
  };

  if (error) {
    return <div className="container"><p className="error">Error fetching data: {error}</p></div>;
  }

  return (
    <div className="container">
      <Head>
        <title>Local Nature Recovery Strategy Sites</title>
      </Head>
      <main className="main">
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
              <h1 className="title">Local Nature Recovery Strategy Sites</h1>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
                <div className="search-container" style={{ margin: 0 }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by LNRS name."
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
              <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(filteredAndSortedLNRS.length, 0)}</strong> of <strong>{formatNumber(lnrs.length, 0)}</strong> LNRS areas, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.</p>
              <p style={{ fontStyle: 'italic' }}>When a site map is selected, adjacent LNRS sites are shown coloured pink.</p>
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
                  {filteredAndSortedLNRS.map((item) => (
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
                                  // Find the full LNRS object for the adjacent area to pass to the map
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
            </>
          }
        />
      </main>
    </div>
  );
}