import Link from 'next/link';
import { formatNumber, slugify, calcMedian, calcMean } from '@/lib/format';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow'
import styles from '@/styles/SiteDetails.module.css';
import Tooltip from '@/components/Tooltip';
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

export default function AllAllocationsList ({sortedItems, requestSort, sortConfig, summaryData}) {

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
  )
};