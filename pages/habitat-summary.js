
import Head from 'next/head';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchAllSites } from '../lib/api';
import styles from '../styles/SiteDetails.module.css';
import { HabitatsCard } from '../components/HabitatsCard';
import { HabitatSummaryTable } from '../components/HabitatSummaryTable';
import { DetailRow } from '../components/DetailRow';
import Papa from 'papaparse';
import { formatNumber } from '../lib/format';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();

    const allHabitats = {
      areas: [],
      hedgerows: [],
      watercourses: []
    }
    const allImprovements = {
      areas: [],
      hedgerows: [],
      watercourses: []
    }

    let totalSize = 0

    allSites.forEach(site => {

      totalSize += site.siteSize;

      if (site.habitats) {
        if (site.habitats.areas)
        {
          allHabitats.areas.push(...site.habitats.areas);
        }
        if (site.habitats.hedgerows)
        {
          allHabitats.hedgerows.push(...site.habitats.hedgerows);
        }
        if (site.habitats.watercourses)
        {
          allHabitats.watercourses.push(...site.habitats.watercourses);
        }
      }
      if (site.improvements) {
        if (site.improvements.areas)
        {
          allImprovements.areas.push(...site.improvements.areas);
        }
        if (site.improvements.hedgerows)
        {
          allImprovements.hedgerows.push(...site.improvements.hedgerows);
        }
        if (site.improvements.watercourses)
        {
          allImprovements.watercourses.push(...site.improvements.watercourses);
        }
      }
    });


    return {
      props: {
        totalSize: totalSize,
        numSites: allSites.length,
        habitats: allHabitats,
        improvements: allImprovements,
        allocations: allSites.flatMap(s => s.allocations || []),
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    throw e;
  }
}

const DEBOUNCE_DELAY_MS = 300;

export default function HabitatSummary({ totalSize, numSites, habitats, improvements, allocations }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filterHabitats = useCallback((habitatData) => {
    if (!debouncedSearchTerm) {
      return habitatData;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    const filteredData = {};
    for (const category in habitatData) {
      if (Array.isArray(habitatData[category])) {
        filteredData[category] = habitatData[category].filter(h =>
          h.type.toLowerCase().includes(lowercasedTerm)
        );
      }
    }
    return filteredData;
  }, [debouncedSearchTerm]);

  const filteredBaselineHabitats = useMemo(() => filterHabitats(habitats), [habitats, filterHabitats]);
  const filteredImprovementHabitats = useMemo(() => filterHabitats(improvements), [improvements, filterHabitats]);

  const handleExport = () => {
    const baselineData = Object.values(filteredBaselineHabitats).flat();
    const improvementData = Object.values(filteredImprovementHabitats).flat();

    const allData = [
      ...baselineData.map(row => ({ Category: 'Baseline', ...row })),
      ...improvementData.map(row => ({ Category: 'Improvement', ...row })),
    ];

    const csvData = allData.map(row => ({
      'Category': row.Category,
      'Habitat': row.type,
      'Distinctiveness': row.distinctiveness,
      '# Parcels': row.parcels,
      'Size': formatNumber(row.area),
      'HUs': formatNumber(row.HUs || 0),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bgs-habitat-summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Habitat Summary</title>
      </Head>

      <main className={styles.container}>        
        <h1 className="title" style={{ textAlign: 'center', marginBottom: '1rem' }}>Habitats Summary</h1>

        <div className={styles.detailsGrid}>

          <section className={styles.card}>
            <h3>BGS Register Summary</h3>
                
            <div>
              <DetailRow label="Number of BGS sites" value={numSites} />
              <DetailRow label="Total BGS site area (ha)" value={formatNumber(totalSize)} />
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>Habitat Summary</dt>
                <dd className={styles.detailValue}>
                  <HabitatSummaryTable site={{habitats: habitats, improvements: improvements, allocations: allocations}} />
                </dd>
              </div>
            </div>
              
          </section>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
            <div className="search-container" style={{ margin: 0 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by habitat name..."
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
            </div>
            <button onClick={handleExport} className="linkButton" style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
              Export to CSV
            </button>
          </div>

          <HabitatsCard
            title="Baseline Habitats (click any habitat cell for condition detail)"
            habitats = {filteredBaselineHabitats}
            isImprovement={false}
          />

          <HabitatsCard
            title="Improvement Habitats (click any habitat cell condition detail)"
            habitats = {filteredImprovementHabitats}
            isImprovement={true}
          />
        </div>

      </main>
    </>
  );
}
