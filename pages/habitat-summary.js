
import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';
import { fetchAllSites } from '../lib/api';
import styles from '../styles/SiteDetails.module.css';
import { HabitatsCard } from '../components/HabitatsCard';
import { HabitatSummaryTable } from '../components/HabitatSummaryTable';
import { processSiteHabitatData } from "../lib/habitat"
import { DetailRow } from '../components/DetailRow';
import { formatNumber } from '../lib/format';

export async function getStaticProps() {
  
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
    processSiteHabitatData(site)
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
      allocations: allSites.flatMap(s => s.allocations || [])
    }
  };
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

  const filterHabitats = (habitatData) => {
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
  };

  const filteredBaselineHabitats = useMemo(() => filterHabitats(habitats), [habitats, debouncedSearchTerm, filterHabitats]);
  const filteredImprovementHabitats = useMemo(() => filterHabitats(improvements), [improvements, debouncedSearchTerm, filterHabitats]);

  return (
    <>
      <Head>
        <title>Habitat Summary</title>
      </Head>

      <main className={styles.container}>        
        <h1 className="title">Habitats Summary</h1>

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

          <div className="search-container sticky-search">
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
