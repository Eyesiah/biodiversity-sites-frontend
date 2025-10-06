'use client'

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { formatNumber, slugify, calcMedian, calcMean } from '@/lib/format';
import { useSortableData, getSortClassName } from '@/lib/hooks';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow'
import { XMLBuilder } from 'fast-xml-parser';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, BarChart, Bar, LabelList } from 'recharts';
import styles from '@/styles/SiteDetails.module.css';
import statsStyles from '@/styles/Statistics.module.css';
import ChartModalButton from '@/components/ChartModalButton';
import Tooltip from '@/components/Tooltip';
import { triggerDownload } from '@/lib/utils';

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

const AllocationRow = ({ alloc }) => {
  const imdTransfer = `${typeof alloc.imd === 'number' ? formatNumber(alloc.imd, 0) : alloc.imd} → ${typeof alloc.simd === 'number' ? formatNumber(alloc.simd, 0) : alloc.simd}`;
  return (<DataFetchingCollapsibleRow
    mainRow={(
    <>
      <td><Link href={`/sites/${alloc.srn}`}>{alloc.srn}</Link></td>
      <td>{alloc.pr}</td>
      <td>{alloc.pn}</td>
      <td>{alloc.lpa}</td>
      <td className="centered-data">{imdTransfer}</td>
      <td className="centered-data">
        {typeof alloc.d === 'number' ? formatNumber(alloc.d, 0) : alloc.d}
      </td>
      <td className="numeric-data">{formatNumber(alloc.au || 0)}</td>
      <td className="numeric-data">{formatNumber(alloc.hu || 0)}</td>
      <td className="numeric-data">{formatNumber(alloc.wu || 0)}</td>
    </>
    )}
    dataUrl={`/api/modal/allocations/${alloc.srn}/${slugify(alloc.pr.trim())}`}
    renderDetails={details => <AllocationHabitats habitats={details} />}
    dataExtractor={json => json}
    colSpan={8}
    />
  )
};

const DEBOUNCE_DELAY_MS = 300;

export default function AllAllocationsList({ allocations }) {
  
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleExportXML = () => {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const xmlDataStr = builder.build({ allocations: { allocation: sortedAllocations } });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'bgs-allocations.xml');
  };

  const handleExportJSON = () => {
    const jsonDataStr = JSON.stringify({ allocations: sortedAllocations }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'bgs-allocations.json');
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

    const uniquePlanningRefs = new Set(source.map(alloc => alloc.pr)).size;
    const totalUniquePlanningRefs = new Set(allocations.map(alloc => alloc.pr)).size;

    let medianDistance = calcMedian(source, 'd');
    let meanIMD = calcMean(source, 'imd');
    let meanSiteIMD = calcMean(source, 'simd');
    
    return {
      totalArea,
      totalHedgerow,
      totalWatercourse,
      medianDistance,
      meanIMD,
      meanSiteIMD,
      uniquePlanningRefs,
      totalUniquePlanningRefs,
    };
  }, [filteredAllocations, allocations]);

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

 const habitatUnitDistributionData = useMemo(() => {
    const allUnits = filteredAllocations.flatMap(alloc => [alloc.au, alloc.hu, alloc.wu]).filter(u => typeof u === 'number' && u > 0);
    if (allUnits.length === 0) return [];
    const totalCount = allUnits.length;

    const bins = {
      '0-1 HUs': 0,
      '1-2 HUs': 0,
      '2-3 HUs': 0,
      '3-4 HUs': 0,
      '4-5 HUs': 0,
      '>5 HUs': 0,
    };

    for (const unit of allUnits) {
      if (unit <= 1) bins['0-1 HUs']++;
      else if (unit <= 2) bins['1-2 HUs']++;
      else if (unit <= 3) bins['2-3 HUs']++;
      else if (unit <= 4) bins['3-4 HUs']++;
      else if (unit <= 5) bins['4-5 HUs']++;
      else bins['>5 HUs']++;
    }

    return Object.entries(bins).map(([name, count]) => ({ name, count, percentage: (count / totalCount) * 100 }));
  }, [filteredAllocations]);

  const imdDistributionData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      decile: `${i + 1}`,
      developmentSites: 0,
      bgsSites: 0,
    }));

    filteredAllocations.forEach(alloc => {
      if (typeof alloc.imd === 'number' && alloc.imd >= 1 && alloc.imd <= 10) {
        bins[alloc.imd - 1].developmentSites++;
      }
      if (typeof alloc.simd === 'number' && alloc.simd >= 1 && alloc.simd <= 10) {
        bins[alloc.simd - 1].bgsSites++;
      }
    });

    return bins;
  }, [filteredAllocations]);


  return (
    <>      
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Allocation charts:</span>
          <ChartModalButton
            url="/charts/allocated-habitats"
            title="Area habitats"
            buttonText="Area habitats"
            className="linkButton"
            style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
          />
          <ChartModalButton
            url="/charts/hedgerow-allocations"
            title="Hedgerow habitats"
            buttonText="Hedgerow habitats"
            className="linkButton"
            style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
          />
          <ChartModalButton
            url="/charts/watercourse-allocations"
            title="Watercourse habitats"
            buttonText="Watercourse habitats"
            className="linkButton"
            style={{ fontSize: '1.2rem', padding: '0.5rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}
          />
        </div>
        
        <div className={statsStyles.chartRow}>
          <div className={statsStyles.chartItem}>
            <h4 style={{ textAlign: 'center' }}>Cumulative distance distribution (km) - The distance between the development site and the BGS offset site.</h4>
              <ResponsiveContainer width="100%" height={200}>
              <LineChart data={distanceDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="distance" name="CDistance (km)" unit="km" domain={['dataMin', 'dataMax']} tickFormatter={(value) => formatNumber(value, 0)} />
                <YAxis dataKey="percentage" name="Cumulative Percentage" unit="%" domain={[0, 100]} />
                <RechartsTooltip formatter={(value, name, props) => (name === 'Cumulative Percentage' ? `${formatNumber(value, 2)}%` : `${formatNumber(props.payload.distance, 2)} km`)} labelFormatter={(label) => `Distance: ${formatNumber(label, 2)} km`} />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Cumulative Percentage" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={statsStyles.chartItem}>
            <h4 style={{ textAlign: 'center' }}>Habitat Unit (HU) Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={habitatUnitDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" name="HUs" />
                <YAxis name="Count" />
                <RechartsTooltip formatter={(value, name, props) => [`${value} (${formatNumber(props.payload.percentage, 1)}%)`, name]} />
                <Legend />
                <Bar dataKey="count" fill="#6ac98fff" name="Number of Allocations"><LabelList dataKey="count" position="top" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={statsStyles.chartItem}>
            <h4 style={{ textAlign: 'center' }}>Allocations by IMD Decile (1 = most deprived. 10 = least deprived)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={imdDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="decile" name="IMD Decile" />
                <YAxis name="Number of Sites" allowDecimals={false} />
                <RechartsTooltip formatter={(value) => [value, 'Sites']} />
                <Legend />
                <Bar dataKey="developmentSites" fill="#e2742fff" name="Development Sites"/>
                <Bar dataKey="bgsSites" fill="#6ac98fff" name="BGS Offset Sites"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="summary" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Displaying <strong>{formatNumber(sortedAllocations.length, 0)}</strong> out of <strong>{formatNumber(allocations.length, 0)}</strong> allocations arising from <strong>{summaryData.uniquePlanningRefs}</strong> out of <strong>{summaryData.totalUniquePlanningRefs}</strong> planning applications.</p>          
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }} className="sticky-search">
          <div className="search-container" style={{ margin: 0 }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search by BGS or Planning Ref, Address, or LPA."
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
          <div className={styles.buttonGroup}>
            <button onClick={handleExportXML} className={styles.exportButton} disabled={sortedAllocations.length === 0}>Export to XML</button>
            <button onClick={handleExportJSON} className={styles.exportButton} disabled={sortedAllocations.length === 0}>Export to JSON</button>
          </div>
        </div>
        <div className="table-container">
          <table className="site-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('srn')} className={getSortClassName('srn', sortConfig)}>BGS ref.</th>
                <th onClick={() => requestSort('pr')} className={getSortClassName('pr', sortConfig)}>Planning ref.</th>
                <th onClick={() => requestSort('pn')} className={getSortClassName('pn', sortConfig)}>Planning address</th>
                <th onClick={() => requestSort('lpa')} className={getSortClassName('lpa', sortConfig)}>LPA</th>
                <th onClick={() => requestSort('imd')} className={getSortClassName('imd', sortConfig)}>
                  <Tooltip text="The IMD transfer values shows the decile score moving from the development site to the BGS site.">
                    IMD transfer
                  </Tooltip>
                </th>
                <th onClick={() => requestSort('d')} className={getSortClassName('d', sortConfig)}>
                  <Tooltip text="The distance from the development site to the BGS offset site.">
                    Distance (km)
                  </Tooltip>
                </th>
                <th onClick={() => requestSort('au')} className={getSortClassName('au', sortConfig)}>Area HUs</th>
                <th onClick={() => requestSort('hu')} className={getSortClassName('hu', sortConfig)}>Hedgerow HUs</th>
                <th onClick={() => requestSort('wu')} className={getSortClassName('wu', sortConfig)}>Watercourse HUs</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
                <td colSpan="4" style={{ textAlign: 'center', border: '3px solid #ddd' }}>Totals</td>
                <td className="centered-data" style={{ border: '3px solid #ddd' }}>
                  {summaryData.meanIMD !== null ? `${formatNumber(summaryData.meanIMD, 1)} → ${formatNumber(summaryData.meanSiteIMD, 1)} (mean)` : 'N/A'}
                </td>
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
        </div>
    </>
  );
}