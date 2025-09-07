import Head from 'next/head';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchAllSites } from '../lib/api';
import { getHabitatDistinctiveness, processSiteHabitatData } from '../lib/habitat';
import styles from '../styles/SiteDetails.module.css';
import { formatNumber } from '../lib/format';
import { useSortableData, getSortClassName } from '../lib/hooks';

// This function runs at build time to fetch and process data.
export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();

    const analysis = {
      areas: {},
      hedgerows: {},
      watercourses: {},
    };

    // Helper to initialize a habitat entry
    const initHabitat = (habitatName) => ({
      habitat: habitatName,
      distinctiveness: getHabitatDistinctiveness(habitatName),
      baseline: 0,
      baselineParcels: 0,
      improvementSites: new Set(),
      improvement: 0,
      improvementParcels: 0,
      allocation: 0,
      allocationParcels: 0,
    });

    // Process each site
    allSites.forEach(site => {

      processSiteHabitatData(site);

      const processCategory = (category) => {
        // Baseline
        if (site.habitats && site.habitats[category]) {
          site.habitats[category].forEach(h => {
            const habitatName = h.type;
            if (!analysis[category][habitatName]) {
              analysis[category][habitatName] = initHabitat(habitatName);
            }
            analysis[category][habitatName].baseline += h.size;
            analysis[category][habitatName].baselineParcels += 1;
          });
        }

        // Improvements
        if (site.improvements && site.improvements[category]) {
          site.improvements[category].forEach(h => {
            const habitatName = h.type;
            if (!analysis[category][habitatName]) {
              analysis[category][habitatName] = initHabitat(habitatName);
            }
            analysis[category][habitatName].improvement += h.size;
            analysis[category][habitatName].improvementParcels += 1;
            analysis[category][habitatName].improvementSites.add(site.referenceNumber);
          });
        }

        // Allocations
        if (site.allocations) {
          site.allocations.forEach(alloc => {
            if (alloc.habitats && alloc.habitats[category]) {
              alloc.habitats[category].forEach(h => {
                const habitatName = h.type;
                if (!analysis[category][habitatName]) {
                  analysis[category][habitatName] = initHabitat(habitatName);
                }
                analysis[category][habitatName].allocation += h.size;
                analysis[category][habitatName].allocationParcels += 1;
              });
            }
          });
        }
      };

      processCategory('areas');
      processCategory('hedgerows');
      processCategory('watercourses');
    });

    // Convert sets to counts and calculate totals
    const finalizeData = (category) => {
      let totalBaseline = 0;
      let totalImprovement = 0;
      let totalAllocation = 0;
      let totalBaselineParcels = 0;
      let totalImprovementParcels = 0;
      let totalAllocationParcels = 0;

      const processedData = Object.values(analysis[category]).map(h => {
        totalBaseline += h.baseline;
        totalImprovement += h.improvement;
        totalAllocation += h.allocation;
        totalBaselineParcels += h.baselineParcels;
        totalImprovementParcels += h.improvementParcels;
        totalAllocationParcels += h.allocationParcels;
        return {
          ...h,
          improvementSites: h.improvementSites.size,
        };
      });

      // Calculate percentages
      const totalImprovementSites = processedData.reduce((acc, h) => acc + h.improvementSites, 0);

      processedData.forEach(h => {
        h.baselineShare = totalBaseline > 0 ? (h.baseline / totalBaseline) * 100 : 0;
        h.improvementShare = totalImprovement > 0 ? (h.improvement / totalImprovement) * 100 : 0;
        h.allocationShare = totalAllocation > 0 ? (h.allocation / totalAllocation) * 100 : 0;
        h.improvementAllocation = h.improvement > 0 ? (h.allocation / h.improvement) * 100 : 0;
      });

      return {
        rows: processedData.sort((a, b) => a.habitat.localeCompare(b.habitat)),
        totals: {
          baseline: totalBaseline,
          improvement: totalImprovement,
          allocation: totalAllocation,
          improvementParcels: totalImprovementParcels,
          baselineParcels: totalBaselineParcels,
          allocationParcels: totalAllocationParcels,
          improvementSites: totalImprovementSites,
          improvementAllocation: totalImprovement > 0 ? (totalAllocation / totalImprovement) * 100 : 0,
        },
      };
    };

    return {
      props: {
        areaAnalysis: finalizeData('areas'),
        hedgerowAnalysis: finalizeData('hedgerows'),
        watercourseAnalysis: finalizeData('watercourses'),
        lastUpdated: new Date().toISOString(),
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

// Reusable component to render an analysis table
const AnalysisTable = ({ title, data, unit }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { items: sortedRows, requestSort, sortConfig } = useSortableData(data.rows);

  return (
    <section className={styles.card}>
      <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {title} {isOpen ? '▼' : '▶'}
      </h3>
      {isOpen && (
        <div className={styles.tableContainer}>
          <table className={`${styles.table} ${styles.subTable}`}>
            <thead>
              <tr>
                <th colSpan="2" style={{ border: 0 }}>Intervention Groups</th>
                <th colSpan="3" style={{ textAlign: 'center', backgroundColor: '#e0e8f0' }}>Baseline</th>
                <th colSpan="4" style={{ textAlign: 'center', backgroundColor: '#dcf0e7' }}>Improvements</th>
                <th colSpan="4" style={{ textAlign: 'center', backgroundColor: '#f0e0e0' }}>Allocations</th>
              </tr>
              <tr>
                <th onClick={() => requestSort('habitat')} className={getSortClassName('habitat', sortConfig)}>Habitat</th>
                <th onClick={() => requestSort('distinctiveness')} className={getSortClassName('distinctiveness', sortConfig)} style={{ textAlign: 'center' }}>Distinctiveness</th>
                <th onClick={() => requestSort('baselineParcels')} className={getSortClassName('baselineParcels', sortConfig)} style={{ textAlign: 'center' }}># Parcels</th>
                <th onClick={() => requestSort('baseline')} className={getSortClassName('baseline', sortConfig)}>Baseline ({unit})</th>
                <th onClick={() => requestSort('baselineShare')} className={getSortClassName('baselineShare', sortConfig)}>% Share</th>
                <th onClick={() => requestSort('improvementSites')} className={getSortClassName('improvementSites', sortConfig)} style={{ textAlign: 'center' }}>Improvement # Sites</th>
                <th onClick={() => requestSort('improvementParcels')} className={getSortClassName('improvementParcels', sortConfig)} style={{ textAlign: 'center' }}># Parcels</th>
                <th onClick={() => requestSort('improvement')} className={getSortClassName('improvement', sortConfig)}>Area ({unit})</th>
                <th onClick={() => requestSort('improvementShare')} className={getSortClassName('improvementShare', sortConfig)}>% Share</th>
                <th onClick={() => requestSort('allocationParcels')} className={getSortClassName('allocationParcels', sortConfig)} style={{ textAlign: 'center' }}># Parcels</th>
                <th onClick={() => requestSort('allocation')} className={getSortClassName('allocation', sortConfig)}>Allocation ({unit})</th>
                <th onClick={() => requestSort('allocationShare')} className={getSortClassName('allocationShare', sortConfig)}>% Share</th>                
                <th onClick={() => requestSort('improvementAllocation')} className={getSortClassName('improvementAllocation', sortConfig)}>% of Improvements</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
                <td colSpan="2" style={{ textAlign: 'center' }}>Totals</td>
                <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(data.totals.baselineParcels, 0)}</td>
                <td className={styles.numericData}>{formatNumber(data.totals.baseline)}</td>
                <td></td>
                <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(data.totals.improvementSites, 0)}</td>
                <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(data.totals.improvementParcels, 0)}</td>
                <td className={styles.numericData}>{formatNumber(data.totals.improvement)}</td>
                <td></td>
                <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(data.totals.allocationParcels, 0)}</td>
                <td className={styles.numericData}>{formatNumber(data.totals.allocation)}</td>
                <td></td>
                <td className={styles.numericData}>{formatNumber(data.totals.improvementAllocation, 2)}%</td>
              </tr>
              {sortedRows.map(row => (
                <tr key={row.habitat}>
                  <td>{row.habitat}</td>
                  <td style={{ textAlign: 'center' }}>{row.distinctiveness}</td>
                  <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(row.baselineParcels, 0)}</td>
                  <td className={styles.numericData}>{formatNumber(row.baseline)}</td>
                  <td className={styles.numericData}>{formatNumber(row.baselineShare, 2)}%</td>
                  <td style={{ textAlign: 'center' }}>{row.improvementSites || 0}</td>
                  <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(row.improvementParcels, 0)}</td>
                  <td className={styles.numericData}>{formatNumber(row.improvement)}</td>
                  <td className={styles.numericData}>{formatNumber(row.improvementShare, 2)}%</td>
                  <td className={styles.numericData} style={{ textAlign: 'center' }}>{formatNumber(row.allocationParcels, 0)}</td>
                  <td className={styles.numericData}>{formatNumber(row.allocation)}</td>
                  <td className={styles.numericData}>{formatNumber(row.allocationShare, 2)}%</td>
                  <td className={styles.numericData}>{formatNumber(row.improvementAllocation, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const DEBOUNCE_DELAY_MS = 300;

export default function HabitatAnalysis({ areaAnalysis, hedgerowAnalysis, watercourseAnalysis }) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(inputValue);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const filterAnalysisData = useCallback((analysisData) => {
    if (!debouncedSearchTerm) {
      return analysisData;
    }
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    const filteredRows = analysisData.rows.filter(row =>
      row.habitat.toLowerCase().includes(lowercasedTerm)
    );
    return { ...analysisData, rows: filteredRows };
  }, [debouncedSearchTerm]);

  const filteredAreaAnalysis = useMemo(() => filterAnalysisData(areaAnalysis), [areaAnalysis, filterAnalysisData]);
  const filteredHedgerowAnalysis = useMemo(() => filterAnalysisData(hedgerowAnalysis), [hedgerowAnalysis, filterAnalysisData]);
  const filteredWatercourseAnalysis = useMemo(() => filterAnalysisData(watercourseAnalysis), [watercourseAnalysis, filterAnalysisData]);

  return (
    <>
      <Head>
        <title>Habitat Analysis</title>
      </Head>

      <main className={styles.container}>
        <h1 className="title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>BGS Habitat Analysis</h1>
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
        <div className={styles.detailsGrid}>
          <AnalysisTable title="Area Habitats" data={filteredAreaAnalysis} unit="ha" />
          <AnalysisTable title="Hedgerow Habitats" data={filteredHedgerowAnalysis} unit="km" />
          <AnalysisTable title="Watercourses Habitats" data={filteredWatercourseAnalysis} unit="km" />
        </div>
      </main>
    </>
  );
}