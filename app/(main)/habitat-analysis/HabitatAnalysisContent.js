'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import styles from '@/styles/SiteDetails.module.css';
import { formatNumber } from '@/lib/format';
import { useSortableData, getSortClassName } from '@/lib/hooks';
import Papa from 'papaparse';
import ChartModalButton from '@/components/ChartModalButton';
import { triggerDownload } from '@/lib/utils';

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
                <th onClick={() => requestSort('baseline')} className={getSortClassName('baseline', sortConfig)}>Baseline size ({unit})</th>
                <th onClick={() => requestSort('baselineShare')} className={getSortClassName('baselineShare', sortConfig)}>% Share</th>
                <th onClick={() => requestSort('improvementSites')} className={getSortClassName('improvementSites', sortConfig)} style={{ textAlign: 'center' }}>Improvement # Sites</th>
                <th onClick={() => requestSort('improvementParcels')} className={getSortClassName('improvementParcels', sortConfig)} style={{ textAlign: 'center' }}># Parcels</th>
                <th onClick={() => requestSort('improvement')} className={getSortClassName('improvement', sortConfig)}>Improvement size ({unit})</th>
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

export default function SearchableHabitatLists({ areaAnalysis, hedgerowAnalysis, watercourseAnalysis }) {

  
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

  const handleExport = () => {
    const allData = [
      ...filteredAreaAnalysis.rows.map(row => ({ Module: 'Area', ...row })),
      ...filteredHedgerowAnalysis.rows.map(row => ({ Module: 'Hedgerow', ...row })),
      ...filteredWatercourseAnalysis.rows.map(row => ({ Module: 'Watercourse', ...row })),
    ];

    const csvData = allData.map(row => ({
      'Module': row.Module,
      'Habitat': row.habitat,
      'Distinctiveness': row.distinctiveness,
      'Baseline Parcels': row.baselineParcels,
      'Baseline Size': row.baseline,
      'Baseline % Share': row.baselineShare,
      'Improvement Sites': row.improvementSites,
      'Improvement Parcels': row.improvementParcels,
      'Improvement Size': row.improvement,
      'Improvement % Share': row.improvementShare,
      'Allocation Parcels': row.allocationParcels,
      'Allocation Size': row.allocation,
      'Allocation % Share': row.allocationShare,
      '% of Improvements Allocated': row.improvementAllocation,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'bgs-habitat-analysis.csv');
  };

  return (
    <>
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
        <button onClick={handleExport} className="linkButton" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
          Export to CSV
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginRight: '3.7rem' }}>Baseline charts:</span>
        <ChartModalButton
          url="/charts/baseline-area-habitats"
          title="Baseline area habitats"
          buttonText="Area habitats"
          className="linkButton"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
        />
        <ChartModalButton
          url="/charts/baseline-hedgerow-habitats"
          title="Baseline hedgerow habitats"
          buttonText="Hedgerow habitats"
          className="linkButton"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
        />
        <ChartModalButton
          url="/charts/baseline-watercourse-habitats"
          title="Baseline watercourse habitats"
          buttonText="Watercourse habitats"
          className="linkButton"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginRight: '1rem' }}>Improvement charts:</span>
        <ChartModalButton
          url="/charts/improvement-habitats"
          title="Improvement area habitats"
          buttonText="Area habitats"
          className="linkButton"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
        />
        <ChartModalButton
          url="/charts/improvement-hedgerows"
          title="Improvement hedgerow habitats"
          buttonText="Hedgerow habitats"
          className="linkButton"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
        />
        <ChartModalButton
          url="/charts/improvement-watercourses"
          title="Improvement watercourse habitats"
          buttonText="Watercourse habitats"
          className="linkButton"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
        />
      </div>
      <div className={styles.detailsGrid}>
        <AnalysisTable title="Area habitats" data={filteredAreaAnalysis} unit="ha" />
        <AnalysisTable title="Hedgerow habitats" data={filteredHedgerowAnalysis} unit="km" />
        <AnalysisTable title="Watercourses habitats" data={filteredWatercourseAnalysis} unit="km" />
      </div>
    </>
  )

}