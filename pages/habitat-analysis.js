import Head from 'next/head';
import { useState } from 'react';
import { fetchAllSites } from '../lib/api';
import { getHabitatDistinctiveness, processSiteHabitatData } from '../lib/habitat';
import styles from '../styles/SiteDetails.module.css';
import { formatNumber } from '../lib/format';
import { useSortableData, getSortClassName } from '../lib/hooks';

// This function runs at build time to fetch and process data.
export async function getStaticProps() {
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
    improvementSites: new Set(),
    improvement: 0,
    allocation: 0,
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

    const processedData = Object.values(analysis[category]).map(h => {
      totalBaseline += h.baseline;
      totalImprovement += h.improvement;
      totalAllocation += h.allocation;
      return {
        ...h,
        improvementSites: h.improvementSites.size,
      };
    });

    // Calculate percentages
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
        improvementAllocation: totalImprovement > 0 ? (totalAllocation / totalImprovement) * 100 : 0,
      },
    };
  };

  return {
    props: {
      areaAnalysis: finalizeData('areas'),
      hedgerowAnalysis: finalizeData('hedgerows'),
      watercourseAnalysis: finalizeData('watercourses'),
    },
    revalidate: 3600, // Re-generate the page at most once per hour
  };
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
                <th onClick={() => requestSort('habitat')} className={getSortClassName('habitat', sortConfig)}>Habitat</th>
                <th onClick={() => requestSort('distinctiveness')} className={getSortClassName('distinctiveness', sortConfig)}>Distinctiveness</th>
                <th onClick={() => requestSort('baseline')} className={getSortClassName('baseline', sortConfig)}>Baseline ({unit})</th>
                <th onClick={() => requestSort('baselineShare')} className={getSortClassName('baselineShare', sortConfig)}>% Share</th>
                <th onClick={() => requestSort('improvementSites')} className={getSortClassName('improvementSites', sortConfig)}>Improvement # Sites</th>
                <th onClick={() => requestSort('improvement')} className={getSortClassName('improvement', sortConfig)}>Area ({unit})</th>
                <th onClick={() => requestSort('improvementShare')} className={getSortClassName('improvementShare', sortConfig)}>% Share</th>
                <th onClick={() => requestSort('allocation')} className={getSortClassName('allocation', sortConfig)}>Allocation ({unit})</th>
                <th onClick={() => requestSort('allocationShare')} className={getSortClassName('allocationShare', sortConfig)}>% Share</th>
                <th onClick={() => requestSort('improvementAllocation')} className={getSortClassName('improvementAllocation', sortConfig)}>% of Improvement</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.habitat}>
                  <td>{row.habitat}</td>
                  <td>{row.distinctiveness}</td>
                  <td className={styles.numericData}>{formatNumber(row.baseline)}</td>
                  <td className={styles.numericData}>{formatNumber(row.baselineShare, 1)}%</td>
                  <td className={styles.numericData}>{row.improvementSites > 0 ? row.improvementSites : ''}</td>
                  <td className={styles.numericData}>{formatNumber(row.improvement)}</td>
                  <td className={styles.numericData}>{formatNumber(row.improvementShare, 1)}%</td>
                  <td className={styles.numericData}>{formatNumber(row.allocation)}</td>
                  <td className={styles.numericData}>{formatNumber(row.allocationShare, 1)}%</td>
                  <td className={styles.numericData}>{formatNumber(row.improvementAllocation, 1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan="2">Totals</th>
                <td className={styles.numericData}>{formatNumber(data.totals.baseline)}</td>
                <td></td>
                <td></td>
                <td className={styles.numericData}>{formatNumber(data.totals.improvement)}</td>
                <td></td>
                <td className={styles.numericData}>{formatNumber(data.totals.allocation)}</td>
                <td></td>
                <td className={styles.numericData}>{formatNumber(data.totals.improvementAllocation, 1)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

export default function HabitatAnalysis({ areaAnalysis, hedgerowAnalysis, watercourseAnalysis }) {
  return (
    <>
      <Head>
        <title>Habitat Analysis</title>
      </Head>

      <main className={styles.container}>
        <div className={styles.header}>
          <h1>BGS Habitat Analysis</h1>
        </div>

        <div className={styles.detailsGrid}>
          <AnalysisTable title="Area Habitats" data={areaAnalysis} unit="ha" />
          <AnalysisTable title="Hedgerow Habitats" data={hedgerowAnalysis} unit="km" />
          <AnalysisTable title="Watercourses Habitats" data={watercourseAnalysis} unit="km" />
        </div>
      </main>
    </>
  );
}