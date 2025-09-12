
import Head from 'next/head';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchAllSites } from '../lib/api';
import styles from '../styles/SiteDetails.module.css';
import { HabitatsCard } from '../components/HabitatsCard';
import { HabitatSummaryTable } from '../components/HabitatSummaryTable';
import { DetailRow } from '../components/DetailRow'
import { XMLBuilder } from 'fast-xml-parser';
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

  const triggerDownload = (blob, filename) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXML = () => {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const dataToExport = {
      habitatSummary: {
        baseline: { habitat: Object.values(filteredBaselineHabitats).flat() },
        improvement: { habitat: Object.values(filteredImprovementHabitats).flat() }
      }
    };
    const xmlDataStr = builder.build(dataToExport);
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'bgs-habitat-summary.xml');
  };

  const handleExportJSON = () => {
    const dataToExport = {
      habitatSummary: {
        baseline: Object.values(filteredBaselineHabitats).flat(),
        improvement: Object.values(filteredImprovementHabitats).flat()
      }
    };
    const jsonDataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'bgs-habitat-summary.json');
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
            <div className={styles.buttonGroup}>
              <button onClick={handleExportXML} className={styles.exportButton}>Export to XML</button>
              <button onClick={handleExportJSON} className={styles.exportButton}>Export to JSON</button>
            </div>
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
