import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { formatNumber } from '../lib/format';
import { useSortableData, getSortClassName } from '../lib/hooks';
import { CollapsibleRow } from '../components/CollapsibleRow';
import styles from '../styles/SiteDetails.module.css';

export async function getStaticProps() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'allocations.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const allAllocations = JSON.parse(jsonData);

    return {
      props: {
        allocations: allAllocations,
        error: null,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: {
        allocations: [],
        error: e.message,
      },
    };
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
        <td className={styles.numericData}>
          {typeof alloc.distance === 'number' ? formatNumber(alloc.distance, 0) : alloc.distance}
        </td>
        <td className={styles.numericData}>{formatNumber(alloc.areaUnits || 0)}</td>
        <td className={styles.numericData}>{formatNumber(alloc.hedgerowUnits || 0)}</td>
        <td className={styles.numericData}>{formatNumber(alloc.watercoursesUnits || 0)}</td>
      </>
    );
  
    const collapsibleContent = <AllocationHabitats habitats={alloc.habitats} />;
  
    return (
      <CollapsibleRow
        mainRow={mainRow}
        collapsibleContent={collapsibleContent} 
        colSpan={6}
      />
    );
  };

const DEBOUNCE_DELAY_MS = 300;

export default function AllocationsPage({ allocations, error }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
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
          <p>
            Displaying <strong>{formatNumber(sortedAllocations.length, 0)}</strong> of <strong>{formatNumber(allocations.length, 0)}</strong> total allocations.
          </p>
        </div>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by BGS Ref, Planning Ref, or LPA."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        </div>
        <table className="site-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('siteReferenceNumber')} className={getSortClassName('siteReferenceNumber', sortConfig)}>BGS Ref</th>
              <th onClick={() => requestSort('planningReference')} className={getSortClassName('planningReference', sortConfig)}>Planning Ref</th>
              <th onClick={() => requestSort('distance')} className={getSortClassName('distance', sortConfig)}>Distance (km)</th>
              <th onClick={() => requestSort('areaUnits')} className={getSortClassName('areaUnits', sortConfig)}>Area Units</th>
              <th onClick={() => requestSort('hedgerowUnits')} className={getSortClassName('hedgerowUnits', sortConfig)}>Hedgerow Units</th>
              <th onClick={() => requestSort('watercoursesUnits')} className={getSortClassName('watercoursesUnits', sortConfig)}>Watercourse Units</th>
            </tr>
          </thead>
          <tbody>
            {sortedAllocations.map((alloc, index) => (
              <AllocationRow key={`${alloc.siteReferenceNumber}-${alloc.planningReference}-${index}`} alloc={alloc} />
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}