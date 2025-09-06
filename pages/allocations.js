import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { fetchAllSites } from '../lib/api';
import { getCoordinatesForAddress, getCoordinatesForLPA, getDistanceFromLatLonInKm } from '../lib/geo';
import { formatNumber } from '../lib/format';
import { useSortableData, getSortClassName } from '../lib/hooks';
import { CollapsibleRow } from '../components/CollapsibleRow';
import styles from '../styles/SiteDetails.module.css';
import { processSiteHabitatData } from '../lib/habitat';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();
    
    const allocationPromises = allSites.flatMap(site => {
      if (!site.allocations) return [];
      processSiteHabitatData(site);
      return site.allocations.map(async (alloc) => {
        let allocCoords = null;

        if (alloc.projectName) {
          allocCoords = await getCoordinatesForAddress(alloc.projectName, alloc.localPlanningAuthority);
        }

        if (!allocCoords && alloc.localPlanningAuthority) {
          allocCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
        }

        let distance = 'unknown';
        if (allocCoords && site.latitude && site.longitude) {
          distance = getDistanceFromLatLonInKm(
            site.latitude,
            site.longitude,
            allocCoords.latitude,
            allocCoords.longitude
          );

          // If distance is > 688km, fall back to LPA centroid
          if (distance > 688 && alloc.localPlanningAuthority) {
            const lpaCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
            if (lpaCoords) {
              distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, lpaCoords.latitude, lpaCoords.longitude);
            }
          }
        }

        const mapHabitats = (habitats) => (habitats || []).map(h => ({
          module: h.module,
          type: h.type,
          distinctiveness: h.distinctiveness || '',
          condition: h.condition,
          size: h.size,
        }));

        return {
          planningReference: alloc.planningReference,
          localPlanningAuthority: alloc.localPlanningAuthority,
          projectName: alloc.projectName,
          areaUnits: alloc.areaUnits,
          hedgerowUnits: alloc.hedgerowUnits,
          watercoursesUnits: alloc.watercoursesUnits,
          habitats: { areas: mapHabitats(alloc.habitats?.areas), hedgerows: mapHabitats(alloc.habitats?.hedgerows), watercourses: mapHabitats(alloc.habitats?.watercourses) },
          siteReferenceNumber: site.referenceNumber,
          distance: distance,

        };
      });
    });

    const allAllocations = await Promise.all(allocationPromises);
    return {
      props: {
        allocations: allAllocations,
        lastUpdated: new Date().toISOString(),
        error: null,
      },
      revalidate: 3600, // Re-generate the page at most once per hour
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    throw e;
  }
}

const AllocationHabitats = ({ habitats }) => {
    const flattenedHabitats = [
      ...(habitats.areas || []),
      ...(habitats.hedgerows || []),
      ...(habitats.watercourses || []),
    ];
  
    if (flattenedHabitats.length === 0) {
      return <p>No habitat details for this allocation.</p>;
    }
  
    return (
      <table className={styles.subTable}>
        <thead>
          <tr>
            <th>Module</th>
            <th>Habitat</th>
            <th>Distinctiveness</th>
            <th>Condition</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {flattenedHabitats.map((habitat, index) => (
            <tr key={index}>
              <td>{habitat.module}</td>
              <td>{habitat.type}</td>
              <td>{habitat.distinctiveness}</td>
              <td>{habitat.condition}</td>
              <td className={styles.numericData}>{formatNumber(habitat.size)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

const AllocationRow = ({ alloc }) => {
    const mainRow = (
      <>
        <td><Link href={`/sites/${alloc.siteReferenceNumber}`}>{alloc.siteReferenceNumber}</Link></td>
        <td>{alloc.planningReference}</td>
        <td>{alloc.localPlanningAuthority}</td>
        <td className="centered-data">
          {typeof alloc.distance === 'number' ? formatNumber(alloc.distance, 0) : alloc.distance}
        </td>
        <td className="numeric-data">{formatNumber(alloc.areaUnits || 0)}</td>
        <td className="numeric-data">{formatNumber(alloc.hedgerowUnits || 0)}</td>
        <td className="numeric-data">{formatNumber(alloc.watercoursesUnits || 0)}</td>
      </>
    );
  
    const collapsibleContent = <AllocationHabitats habitats={alloc.habitats} />;
  
    return (
      <CollapsibleRow
        mainRow={mainRow}
        collapsibleContent={collapsibleContent}
        colSpan={7}
      />
    );
  };

const DEBOUNCE_DELAY_MS = 300;

export default function AllocationsPage({ allocations, error }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
      setIsSearching(false);
    }, DEBOUNCE_DELAY_MS);

    return () => {
      clearTimeout(timerId);
      setIsSearching(false);
    }
  }, [inputValue]);

  const filteredAllocations = useMemo(() => {
    if (!debouncedSearchTerm) {
      return allocations;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return allocations.filter(alloc =>
      (alloc.siteReferenceNumber?.toLowerCase() || '').includes(lowercasedTerm) ||
      (alloc.planningReference?.toLowerCase() || '').includes(lowercasedTerm) ||
      (alloc.localPlanningAuthority?.toLowerCase() || '').includes(lowercasedTerm) ||
      (alloc.projectName?.toLowerCase() || '').includes(lowercasedTerm)
    );
  }, [allocations, debouncedSearchTerm]);

  const { items: sortedAllocations, requestSort, sortConfig } = useSortableData(filteredAllocations, { key: 'siteReferenceNumber', direction: 'ascending' });

  const summaryData = useMemo(() => {
    const source = filteredAllocations;

    const totalArea = source.reduce((sum, alloc) => sum + (alloc.areaUnits || 0), 0);
    const totalHedgerow = source.reduce((sum, alloc) => sum + (alloc.hedgerowUnits || 0), 0);
    const totalWatercourse = source.reduce((sum, alloc) => sum + (alloc.watercoursesUnits || 0), 0);

    const distances = source
      .map(alloc => alloc.distance)
      .filter(d => typeof d === 'number')
      .sort((a, b) => a - b);

    let medianDistance = null;
    if (distances.length > 0) {
      const mid = Math.floor(distances.length / 2);
      if (distances.length % 2 === 0) {
        medianDistance = (distances[mid - 1] + distances[mid]) / 2;
      } else {
        medianDistance = distances[mid];
      }
    }

    return {
      totalArea,
      totalHedgerow,
      totalWatercourse,
      medianDistance,
    };
  }, [filteredAllocations]);

  if (error) {
    return (
      <div className="container">
        <main className="main">
          <h1 className="title">All BGS Allocations</h1>
          <p className="error">Error fetching data: {error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Head>
        <title>All BGS Allocations</title>
      </Head>
      <main className="main">
        <h1 className="title">All BGS Allocations</h1>
        <div className="summary" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(sortedAllocations.length, 0)}</strong> of <strong>{formatNumber(allocations.length, 0)}</strong> total allocations.
          </p>
        </div>
        <div className="search-container sticky-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search by BGS Ref, Planning Ref, or LPA."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          {isSearching && <div className="loader" />}
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
        <p style={{ fontStyle: 'italic', fontSize: '1.2rem' }}>
          Totals are recalculated as your search string is entered.
        </p>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('siteReferenceNumber')} className={getSortClassName('siteReferenceNumber', sortConfig)}>BGS Ref.</th>
              <th onClick={() => requestSort('planningReference')} className={getSortClassName('planningReference', sortConfig)}>Planning Ref.</th>
              <th onClick={() => requestSort('localPlanningAuthority')} className={getSortClassName('localPlanningAuthority', sortConfig)}>LPA</th>
              <th onClick={() => requestSort('distance')} className={getSortClassName('distance', sortConfig)}>Distance (km)</th>
              <th onClick={() => requestSort('areaUnits')} className={getSortClassName('areaUnits', sortConfig)}>Area Units</th>
              <th onClick={() => requestSort('hedgerowUnits')} className={getSortClassName('hedgerowUnits', sortConfig)}>Hedgerow Units</th>
              <th onClick={() => requestSort('watercoursesUnits')} className={getSortClassName('watercoursesUnits', sortConfig)}>Watercourse Units</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
              <td colSpan="3" style={{ textAlign: 'center', border: '3px solid #ddd' }}>Totals</td>
              <td className="centered-data" style={{ border: '3px solid #ddd' }}>
                {summaryData.medianDistance !== null ? `${formatNumber(summaryData.medianDistance, 2)} (median)` : 'N/A'}
              </td>
              <td className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalArea)}</td>
              <td className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalHedgerow)}</td>
              <td className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalWatercourse)}</td>
            </tr>
            {sortedAllocations.map((alloc, index) => (
              <AllocationRow key={`${alloc.siteReferenceNumber}-${alloc.planningReference}-${index}`} alloc={alloc} />
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}