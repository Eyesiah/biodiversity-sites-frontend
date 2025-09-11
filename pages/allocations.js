import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { fetchAllSites } from '../lib/api';
import { getCoordinatesForAddress, getCoordinatesForLPA, getDistanceFromLatLonInKm } from '../lib/geo';
import { formatNumber, slugify } from '../lib/format';
import { useSortableData, getSortClassName } from '../lib/hooks';
import { DataFetchingCollapsibleRow } from '../components/DataFetchingCollapsibleRow';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import styles from '../styles/SiteDetails.module.css';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();
    
    const allocationPromises = allSites.flatMap(site => {
      if (!site.allocations) return [];
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

          if (distance > 688 && alloc.localPlanningAuthority) {
            const lpaCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
            if (lpaCoords) {
              distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, lpaCoords.latitude, lpaCoords.longitude);
            }
          }
        }

        return {
          pr: alloc.planningReference,
          lpa: alloc.localPlanningAuthority,
          pn: alloc.projectName,
          au: alloc.areaUnits,
          hu: alloc.hedgerowUnits,
          wu: alloc.watercoursesUnits,
          srn: site.referenceNumber,
          d: distance,
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
      revalidate: 3600,
    };
  } catch (e) {
    throw e;
  }
}

const AllocationHabitats = ({ habitats }) => {

  if (habitats.length === 0) {
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
        {habitats.map((habitat, index) => (
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

const AllocationRow = ({ alloc }) => (
  <DataFetchingCollapsibleRow
    mainRow={(
    <>
      <td><Link href={`/sites/${alloc.srn}`}>{alloc.srn}</Link></td>
      <td>{alloc.pr}</td>
      <td>{alloc.pn}</td>
      <td>{alloc.lpa}</td>
      <td className="centered-data">
        {typeof alloc.d === 'number' ? formatNumber(alloc.d, 0) : alloc.d}
      </td>
      <td className="numeric-data">{formatNumber(alloc.au || 0)}</td>
      <td className="numeric-data">{formatNumber(alloc.hu || 0)}</td>
      <td className="numeric-data">{formatNumber(alloc.wu || 0)}</td>
    </>
    )}
    dataUrl={`/modals/allocations/${alloc.srn}/${slugify(alloc.pr.trim())}.json`}
    renderDetails={details => <AllocationHabitats habitats={details} />}
    dataExtractor={json => json.pageProps.habitats}
      colSpan={8}
    />
  );

const DEBOUNCE_DELAY_MS = 300;

export default function AllocationsPage({ allocations, error }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleExport = () => {
    const csvData = sortedAllocations.map(alloc => ({
      'BGS Ref.': alloc.srn,
      'Planning Ref.': alloc.pr,
      'Planning address': alloc.pn,
      'LPA': alloc.lpa,
      'Distance (km)': typeof alloc.d === 'number' ? formatNumber(alloc.d, 0) : alloc.d,
      'Area Units': formatNumber(alloc.au || 0),
      'Hedgerow Units': formatNumber(alloc.hu || 0),
      'Watercourse Units': formatNumber(alloc.wu || 0),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bgs-allocations.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const openChartWindow = (url) => {
    const width = window.screen.width * 0.6;
    const height = window.screen.height * 1;
    window.open(url, 'chartWindow', `width=${width},height=${height}`);
  };

  const filteredAllocations = useMemo(() => {
    if (!debouncedSearchTerm) {
      return allocations;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return allocations.filter(alloc =>
      (alloc.srn?.toLowerCase() || '').includes(lowercasedTerm) ||
      (alloc.pr?.toLowerCase() || '').includes(lowercasedTerm) ||
      (alloc.lpa?.toLowerCase() || '').includes(lowercasedTerm) ||
      (alloc.pn?.toLowerCase() || '').includes(lowercasedTerm)
    );
  }, [allocations, debouncedSearchTerm]);

  const { items: sortedAllocations, requestSort, sortConfig } = useSortableData(filteredAllocations, { key: 'siteReferenceNumber', direction: 'ascending' });

  const summaryData = useMemo(() => {
    const source = filteredAllocations;

    const totalArea = source.reduce((sum, alloc) => sum + (alloc.au || 0), 0);
    const totalHedgerow = source.reduce((sum, alloc) => sum + (alloc.hu || 0), 0);
    const totalWatercourse = source.reduce((sum, alloc) => sum + (alloc.wu || 0), 0);

    const distances = source
      .map(alloc => alloc.d)
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

    const uniquePlanningRefs = new Set(source.map(alloc => alloc.pr)).size;
    const totalUniquePlanningRefs = new Set(allocations.map(alloc => alloc.pr)).size;

    return {
      totalArea,
      totalHedgerow,
      totalWatercourse,
      medianDistance,
    };
  }, [filteredAllocations]);
    const uniquePlanningRefs = new Set(filteredAllocations.map(alloc => alloc.pr)).size;
    const totalUniquePlanningRefs = new Set(allocations.map(alloc => alloc.pr)).size;

  const distanceDistributionData = useMemo(() => {
    const distances = filteredAllocations.map(alloc => alloc.d).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) {
      return [];
    }

    const cumulativeData = [];
    const total = distances.length;

    distances.forEach((distance, index) => {
      const cumulativeCount = index + 1;
      cumulativeData.push({
        distance: distance,
        cumulativeCount: cumulativeCount,
        percentage: (cumulativeCount / total) * 100,
      });
    });

    return cumulativeData;
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
          <p style={{ fontSize: '1.2rem' }}>Displaying <strong>{formatNumber(sortedAllocations.length, 0)}</strong> out of <strong>{formatNumber(allocations.length, 0)}</strong> allocations arising from <strong>{uniquePlanningRefs}</strong> out of <strong>{totalUniquePlanningRefs}</strong> planning applications.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
          <div className="search-container" style={{ margin: 0 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by BGS Ref, Planning Ref, Address, or LPA."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
            {inputValue && (
              <button
                onClick={() => setInputValue('')}
                className="clear-search-button"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
            {isSearching && <div className="loader" />}
          </div>
          <button 
            onClick={handleExport} 
            className="linkButton" 
            style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
            disabled={sortedAllocations.length === 0}
          >
            Export to CSV
          </button>
        </div>
        <div style={{ fontStyle: 'italic', fontSize: '1.2rem', marginTop: '0rem' }}>
          Totals are recalculated as your search string is entered.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', margin: '1rem 0 6rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Allocation Charts:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button 
                onClick={() => openChartWindow('/allocated-habitats')}
                className="linkButton"
                style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
              >
                Area Habitats
              </button>
              <button 
                onClick={() => openChartWindow('/hedgerow-allocations')}
                className="linkButton"
                style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
              >
                Hedgerow Habitats
              </button>
              <button 
                onClick={() => openChartWindow('/watercourse-allocations')}
                className="linkButton"
                style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
              >
                Watercourse Habitats
              </button>
            </div>
          </div>
          <div style={{ width: '550px', height: '300px' }}>
            <h4 style={{ textAlign: 'center' }}>Cumulative distance distribution (km) - The distance between the development site and the offsite BGS offset site.</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={distanceDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="distance" name="CDistance (km)" unit="km" domain={['dataMin', 'dataMax']} tickFormatter={(value) => formatNumber(value, 0)} />
                <YAxis dataKey="percentage" name="Cumulative Percentage" unit="%" domain={[0, 100]} />
                <Tooltip formatter={(value, name, props) => (name === 'Cumulative Percentage' ? `${formatNumber(value, 2)}%` : `${formatNumber(props.payload.distance, 2)} km`)} labelFormatter={(label) => `Distance: ${formatNumber(label, 2)} km`} />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Cumulative Percentage" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('srn')} className={getSortClassName('srn', sortConfig)}>BGS Ref.</th>
              <th onClick={() => requestSort('pr')} className={getSortClassName('pr', sortConfig)}>Planning Ref.</th>
              <th onClick={() => requestSort('pn')} className={getSortClassName('pn', sortConfig)}>Planning address</th>
              <th onClick={() => requestSort('lpa')} className={getSortClassName('lpa', sortConfig)}>LPA</th>
              <th onClick={() => requestSort('d')} className={getSortClassName('d', sortConfig)}>Distance (km)</th>
              <th onClick={() => requestSort('au')} className={getSortClassName('au', sortConfig)}>Area Units</th>
              <th onClick={() => requestSort('hu')} className={getSortClassName('hu', sortConfig)}>Hedgerow Units</th>
              <th onClick={() => requestSort('wu')} className={getSortClassName('wu', sortConfig)}>Watercourse Units</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
              <td colSpan="4" style={{ textAlign: 'center', border: '3px solid #ddd' }}>Totals</td>
              <td className="centered-data" style={{ border: '3px solid #ddd' }}>
                {summaryData.medianDistance !== null ? `${formatNumber(summaryData.medianDistance, 2)} (median)` : 'N/A'}
              </td>
              <td className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalArea)}</td>
              <td className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalHedgerow)}</td>
              <td className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalWatercourse)}</td>
            </tr>
            {sortedAllocations.map((alloc) => (
              <AllocationRow key={`${alloc.srn}-${alloc.pr}`} alloc={alloc} />
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
