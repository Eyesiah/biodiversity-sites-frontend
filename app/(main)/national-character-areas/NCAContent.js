'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ExternalLink from '@/components/ExternalLink';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import { exportToXml, exportToJson } from '@/lib/utils';
import { CollapsibleRow } from '@/components/CollapsibleRow';
import MapContentLayout from '@/components/MapContentLayout';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import styles from '@/styles/SiteDetails.module.css';

const PolygonMap = dynamic(() => import('components/Maps/PolygonMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

export default function NCAContent({ ncas, sites, error }) {
  const [selectedNca, setSelectedNca] = useState(null);
  const [openRowId, setOpenRowId] = useState(null);

  const sitesInSelectedNCA = useMemo(() => {
    if (!selectedNca) return [];
    return (sites || []).filter(site => slugify(normalizeBodyName(site.ncaName)) === slugify(normalizeBodyName(selectedNca.name)));
  }, [selectedNca, sites]);

  const handleMapSelection = (item) => {
    setSelectedNca(item);
    setOpenRowId(item.id);
  };

  const handleAdjacentMapSelection = (item) => {
    setSelectedNca(item);
  };

  const totalArea = useMemo(() => ncas.reduce((sum, nca) => sum + nca.size, 0), [ncas]);

  if (error) {
    return <p className="error">Error fetching data: {error}</p>;
  }

  return (
    <MapContentLayout
        map={
        <PolygonMap
            selectedItem={selectedNca}
            geoJsonUrl="https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query"
            nameProperty="name"
            sites={sitesInSelectedNCA}
            style={{ color: '#8e44ad', weight: 2, opacity: 0.8, fillOpacity: 0.2 }}
        />
        }
        content={
        <>
            <SearchableTableLayout
                initialItems={ncas}
                filterPredicate={(item, term) => (item.name?.toLowerCase() || '').includes(term)}
                initialSortConfig={{ key: 'siteCount', direction: 'descending' }}
                placeholder="Search by NCA name."
                exportConfig={{
                    onExportXml: (items) => exportToXml(items, 'nationalCharacterAreas', 'nca', 'national-character-areas.xml'),
                    onExportJson: (items) => exportToJson(items, 'ncas', 'national-character-areas.json')
                }}
                summary={(filteredCount, totalCount) => (
                    <p style={{ fontSize: '1.2rem' }}>
                        Displaying <strong>{formatNumber(filteredCount, 0)}</strong> of <strong>{formatNumber(totalCount, 0)}</strong> NCAs, covering a total of <strong>{formatNumber(totalArea, 0)}</strong> hectares.
                    </p>
                )}
            >
                {({ sortedItems, requestSort, getSortIndicator }) => (
                    <table className="site-table">
                        <thead>
                            <tr>
                            <th onClick={() => requestSort('id')}>ID{getSortIndicator('id')}</th>
                            <th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
                            <th onClick={() => requestSort('size')}>Size (ha){getSortIndicator('size')}</th>
                            <th onClick={() => requestSort('siteCount')}># BGS Sites{getSortIndicator('siteCount')}</th>
                            <th onClick={() => requestSort('adjacents.length')}># Adjacent NCAs{getSortIndicator('adjacents.length')}</th>
                            <th>Map</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedItems.map((nca) => (
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
                                    <td className="centered-data">{nca.siteCount}</td>
                                    <td className="centered-data">{nca.adjacents?.length || 0}</td>
                                    <td>
                                    <button onClick={(e) => { e.stopPropagation(); handleMapSelection(nca); }} className="linkButton">
                                        Display Map
                                    </button>
                                    </td>
                                </>
                                )}
                                collapsibleContent={(
                                <div style={{ padding: '0.5rem' }}>
                                    <h4>Adjacent NCAs</h4>
                                    {nca.adjacents && nca.adjacents.length > 0 ? (
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
                                        {nca.adjacents.map(adj => {
                                            const adjacentNcaObject = ncas.find(n => n.id === adj.id);
                                            return (
                                            <tr key={adj.id}><td>{adj.id}</td><td>{adj.name}</td><td className="numeric-data">{formatNumber(adj.size, 0)}</td><td className="centered-data">{adjacentNcaObject?.siteCount || 0}</td>
                                            <td><button onClick={(e) => { e.stopPropagation(); handleAdjacentMapSelection(adjacentNcaObject); }} className="linkButton">Display Map</button></td>
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
                )}
            </SearchableTableLayout>
            <p style={{ fontStyle: 'italic' }}>When a site map is selected, adjacent NCAs are shown coloured pink.</p>
        </>
        }
    />
  );
}