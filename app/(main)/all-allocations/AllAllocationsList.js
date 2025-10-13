'use client'

import Link from 'next/link';
import { useMemo, useState, useCallback } from 'react';
import { formatNumber, slugify, calcMedian, calcMean } from '@/lib/format';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow'
import { XMLBuilder } from 'fast-xml-parser';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, BarChart, Bar, LabelList } from 'recharts';
import styles from '@/styles/SiteDetails.module.css';
import statsStyles from '@/styles/Statistics.module.css';
import ChartModalButton from '@/components/ChartModalButton';
import Tooltip from '@/components/Tooltip';
import { triggerDownload } from '@/lib/utils';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import { getSortClassName } from '@/lib/hooks';

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
        <td>{alloc.nca}</td>
        <td>{`${alloc.sr.cat}${alloc.sr.cat != 'Outside' ? ` (${alloc.sr.from})` : ''}`}</td>
        <td className="centered-data">{imdTransfer}</td>
        <td className="centered-data">
          {typeof alloc.d === 'number' ? formatNumber(alloc.d, 0) : alloc.d}
        </td>
        <td className="numeric-data">{alloc.au && alloc.au > 0 ? formatNumber(alloc.au) : ''}</td>
        <td className="numeric-data">{alloc.hu && alloc.hu > 0 ? formatNumber(alloc.hu) : ''}</td>
        <td className="numeric-data">{alloc.wu && alloc.wu > 0 ? formatNumber(alloc.wu) : ''}</td>
      </>
    )}
    dataUrl={`/api/modal/allocations/${alloc.srn}/${slugify(alloc.pr.trim())}`}
    renderDetails={details => <AllocationHabitats habitats={details} />}
    dataExtractor={json => json}
    colSpan={8}
  />
  )
};

const filterPredicate = (alloc, searchTerm) => {
  const lowercasedTerm = searchTerm.toLowerCase();
  const spatialRiskString = alloc.sr ? `${alloc.sr.cat}${alloc.sr.cat !== 'Outside' ? ` (${alloc.sr.from})` : ''}`.toLowerCase() : '';
  return (
    (alloc.srn?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.pr?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.lpa?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.nca?.toLowerCase() || '').includes(lowercasedTerm) ||
    (alloc.pn?.toLowerCase() || '').includes(lowercasedTerm) ||
    spatialRiskString.includes(lowercasedTerm)
  );
}

export default function AllAllocationsList({ allocations }) {

  const handleExportXML = (items) => {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const xmlDataStr = builder.build({ allocations: { allocation: items } });
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'bgs-allocations.xml');
  };

  const handleExportJSON = (items) => {
    const jsonDataStr = JSON.stringify({ allocations: items }, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'bgs-allocations.json');
  };

  const calcSummaryData = useCallback((filteredAllocations) => {

    const totalArea = filteredAllocations.reduce((sum, alloc) => sum + (alloc.au || 0), 0);
    const totalHedgerow = filteredAllocations.reduce((sum, alloc) => sum + (alloc.hu || 0), 0);
    const totalWatercourse = filteredAllocations.reduce((sum, alloc) => sum + (alloc.wu || 0), 0);

    const uniquePlanningRefs = new Set(filteredAllocations.map(alloc => alloc.pr)).size;
    const totalUniquePlanningRefs = new Set(allocations.map(alloc => alloc.pr)).size;

    let medianDistance = calcMedian(filteredAllocations, 'd');
    let meanIMD = calcMean(filteredAllocations, 'imd');
    let meanSiteIMD = calcMean(filteredAllocations, 'simd');

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
  }, [allocations]);

  const [summaryData, setSummaryData] = useState(calcSummaryData(allocations));

  const handleSortedItemsChange = useCallback((sortedItems) => {
    setSummaryData(calcSummaryData(sortedItems));
  }, []);

  const distanceDistributionData = useMemo(() => {
    const distances = allocations.map(alloc => alloc.d).filter(d => typeof d === 'number').sort((a, b) => a - b);
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
  }, [allocations]);

  const habitatUnitDistributionData = useMemo(() => {
    const allUnits = allocations.flatMap(alloc => [alloc.au, alloc.hu, alloc.wu]).filter(u => typeof u === 'number' && u > 0);
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
  }, [allocations]);

  const imdDistributionData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      decile: `${i + 1}`,
      developmentSites: 0,
      bgsSites: 0,
    }));

    allocations.forEach(alloc => {
      if (typeof alloc.imd === 'number' && alloc.imd >= 1 && alloc.imd <= 10) {
        bins[alloc.imd - 1].developmentSites++;
      }
      if (typeof alloc.simd === 'number' && alloc.simd >= 1 && alloc.simd <= 10) {
        bins[alloc.simd - 1].bgsSites++;
      }
    });

    return bins;
  }, [allocations]);

  const srDistributionData = useMemo(() => {
    const totalAllocations = allocations.length > 0 ? allocations.length : 1;

    const bins = {
      'Within': { category: 'Within', lpa: 0, nca: 0, outside: 0 },
      'Neighbouring': { category: 'Neighbouring', lpa: 0, nca: 0, outside: 0 },
      'Outside': { category: 'Outside', lpa: 0, nca: 0, outside: 0 },
    };

    allocations.forEach(alloc => {
      if (alloc.sr?.cat) {
        const category = alloc.sr.cat;
        if (bins[category]) {
          if (category === 'Outside') {
            bins[category].outside++;
          } else {
            const from = alloc.sr.from || 'LPA';
            if (from === 'LPA') bins[category].lpa++;
            if (from === 'NCA') bins[category].nca++;
          }
        }
      }
    });

    return Object.values(bins).map(bin => ({
      ...bin,
      lpaPercentage: (bin.lpa / totalAllocations) * 100,
      ncaPercentage: (bin.nca / totalAllocations) * 100,
      outsidePercentage: (bin.outside / totalAllocations) * 100,
    }));
  }, [allocations]);

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
            <BarChart data={habitatUnitDistributionData} barCategoryGap="10%">
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
            <BarChart data={imdDistributionData} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="decile" name="IMD Decile" />
              <YAxis name="Number of Sites" allowDecimals={false} />
              <RechartsTooltip formatter={(value) => [value, 'Sites']} />
              <Legend />
              <Bar dataKey="developmentSites" fill="#e2742fff" name="Development Sites" />
              <Bar dataKey="bgsSites" fill="#6ac98fff" name="BGS Offset Sites" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={statsStyles.chartItem}>
          <h4 style={{ textAlign: 'center' }}>Allocations by Spatial Risk Category</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={srDistributionData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ textAnchor: 'middle' }} />
              <YAxis allowDecimals={false} />
              <RechartsTooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="recharts-default-tooltip" style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: '10px' }}>
                      <p className="recharts-tooltip-label" style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                      <ul className="recharts-tooltip-item-list" style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                        {payload.filter(p => p.value > 0).map((p, index) => {
                          let percentage = 0;
                          if (p.name === 'LPA') percentage = p.payload.lpaPercentage;
                          if (p.name === 'NCA') percentage = p.payload.ncaPercentage;
                          if (p.name === 'Outside') percentage = p.payload.outsidePercentage;
                          return (
                            <li key={index} className="recharts-tooltip-item" style={{ color: p.color }}>
                              {`${p.name}: ${p.value} (${formatNumber(percentage, 1)}%)`}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="lpa" fill="#e2742fff" name="LPA">
                <LabelList dataKey="lpa" position="top" formatter={(v) => v > 0 ? v : ''} />
              </Bar>
              <Bar dataKey="nca" fill="#6ac98fff" name="NCA">
                <LabelList dataKey="nca" position="top" formatter={(v) => v > 0 ? v : ''} />
              </Bar>
              <Bar dataKey="outside" fill="#8884d8" name="Outside">
                <LabelList dataKey="outside" position="top" formatter={(v) => v > 0 ? v : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ height: '12px', width: '12px', backgroundColor: '#e2742fff', marginRight: '5px', border: '1px solid #ccc' }}></span>
              <span>LPA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ height: '12px', width: '12px', backgroundColor: '#6ac98fff', marginRight: '5px', border: '1px solid #ccc' }}></span>
              <span>NCA</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ height: '12px', width: '12px', backgroundColor: '#8884d8', marginRight: '5px', border: '1px solid #ccc' }}></span>
              <span>Outside</span>
            </div>
          </div>
        </div>
      </div>

      <SearchableTableLayout
        initialItems={allocations}
        filterPredicate={filterPredicate}
        initialSortConfig={{ key: 'srn', direction: 'ascending' }}
        placeholder="Search by BGS/Planning/Address/LPA/NCA/Spatial Risk."
        exportConfig={{ onExportXml: handleExportXML, onExportJson: handleExportJSON }}
        summary={(filteredCount, totalCount) => (
          <div className="summary" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.2rem', margin: 0 }}>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> out of <strong>{formatNumber(totalCount, 0)}</strong> allocations arising from <strong>{summaryData.uniquePlanningRefs}</strong> out of <strong>{summaryData.totalUniquePlanningRefs}</strong> planning applications.</p>
          </div>
        )}
        onSortedItemsChange={handleSortedItemsChange}
      >
        {({ sortedItems, requestSort, sortConfig }) => {
                
          return (
            <table className="site-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('srn')} className={getSortClassName('srn', sortConfig)}>BGS ref.</th>
                  <th onClick={() => requestSort('pr')} className={getSortClassName('pr', sortConfig)}>Planning ref.</th>
                  <th onClick={() => requestSort('pn')} className={getSortClassName('pn', sortConfig)}>Planning address</th>
                  <th onClick={() => requestSort('lpa')} className={getSortClassName('lpa', sortConfig)}>LPA</th>
                  <th onClick={() => requestSort('nca')} className={getSortClassName('nca', sortConfig)}>NCA</th>
                  <th onClick={() => requestSort('sr.cat')} className={getSortClassName('sr.cat', sortConfig)}>
                    <Tooltip text="The Spatial Risk Category - whether the BGS offset site is within, neighbouring or outside the development site LPA or NCA.">
                      Spatial Risk
                    </Tooltip>
                  </th>
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
                  <td colSpan="6" style={{ textAlign: 'center', border: '3px solid #ddd' }}>Totals</td>
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
                {sortedItems.map((alloc) => (
                  <AllocationRow key={`${alloc.srn}-${alloc.pr}`} alloc={alloc} />
                ))}
              </tbody>
            </table>
          )}
        }
      </SearchableTableLayout>
    </>
  );
}