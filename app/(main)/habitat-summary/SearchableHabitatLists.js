'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import styles from '@/styles/SiteDetails.module.css';
import { HabitatsCard } from '@/components/HabitatsCard';
import { XMLBuilder } from 'fast-xml-parser';

const DEBOUNCE_DELAY_MS = 300;

export default function SearchableHabitatLists({ habitats, improvements }) {
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
          title="Baseline Habitats (click any row for more information)"
          habitats = {filteredBaselineHabitats}
          isImprovement={false}
        />

        <HabitatsCard
          title="Improvement Habitats (click any row for more information)"
          habitats = {filteredImprovementHabitats}
          isImprovement={true}
        />
    </>
  );
}
