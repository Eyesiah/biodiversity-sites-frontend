import Link from 'next/link';
import { formatNumber, slugify } from '@/lib/format';
import { DataFetchingCollapsibleRow } from '@/components/DataFetchingCollapsibleRow'
import Tooltip from '@/components/Tooltip';
import { getSortClassName } from '@/lib/hooks';
import { PrimaryTable } from '@/components/ui/PrimaryTable';

const AllocationHabitats = ({ habitats }) => {

  if (habitats.length === 0) {
    return <p>No habitat details for this allocation.</p>;
  }

  return (
    <PrimaryTable.Root>
      <PrimaryTable.Header>
        <PrimaryTable.Row>
          <PrimaryTable.ColumnHeader>Module</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader>Habitat</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader>Distinctiveness</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader>Condition</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader>Size</PrimaryTable.ColumnHeader>
        </PrimaryTable.Row>
      </PrimaryTable.Header>
      <PrimaryTable.Body>
        {habitats.map((habitat, index) => (
          <PrimaryTable.Row key={index}>
            <PrimaryTable.Cell>{habitat.module}</PrimaryTable.Cell>
            <PrimaryTable.Cell>{habitat.type}</PrimaryTable.Cell>
            <PrimaryTable.Cell>{habitat.distinctiveness}</PrimaryTable.Cell>
            <PrimaryTable.Cell>{habitat.condition}</PrimaryTable.Cell>
            <PrimaryTable.NumericCell>{formatNumber(habitat.size)}</PrimaryTable.NumericCell>
          </PrimaryTable.Row>
        ))}
      </PrimaryTable.Body>
    </PrimaryTable.Root>
  );
};

const AllocationRow = ({ alloc }) => {
  const imdTransfer = `${typeof alloc.imd === 'number' ? formatNumber(alloc.imd, 0) : alloc.imd} → ${typeof alloc.simd === 'number' ? formatNumber(alloc.simd, 0) : alloc.simd}`;
  return (<DataFetchingCollapsibleRow
    mainRow={(
      <>
        <PrimaryTable.Cell><Link href={`/sites/${alloc.srn}`}>{alloc.srn}</Link></PrimaryTable.Cell>
        <PrimaryTable.Cell>{alloc.pr}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{alloc.pn}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{alloc.lpa}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{alloc.nca}</PrimaryTable.Cell>
        <PrimaryTable.Cell>{`${alloc.sr.cat}${alloc.sr.cat != 'Outside' ? ` (${alloc.sr.from})` : ''}`}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="centered-data">{imdTransfer}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="centered-data">
          {typeof alloc.d === 'number' ? formatNumber(alloc.d, 0) : alloc.d}
        </PrimaryTable.Cell>
        <PrimaryTable.Cell className="numeric-data">{alloc.au && alloc.au > 0 ? formatNumber(alloc.au) : ''}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="numeric-data">{alloc.hu && alloc.hu > 0 ? formatNumber(alloc.hu) : ''}</PrimaryTable.Cell>
        <PrimaryTable.Cell className="numeric-data">{alloc.wu && alloc.wu > 0 ? formatNumber(alloc.wu) : ''}</PrimaryTable.Cell>
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
    <PrimaryTable.Root>
      <PrimaryTable.Header>
        <PrimaryTable.Row>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('srn')} className={getSortClassName('srn', sortConfig)}>BGS ref.</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('pr')} className={getSortClassName('pr', sortConfig)}>Planning ref.</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('pn')} className={getSortClassName('pn', sortConfig)}>Planning address</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('lpa')} className={getSortClassName('lpa', sortConfig)}>LPA</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('nca')} className={getSortClassName('nca', sortConfig)}>NCA</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('sr.cat')} className={getSortClassName('sr.cat', sortConfig)}>
            <Tooltip text="The Spatial Risk Category - whether the BGS offset site is within, neighbouring or outside the development site LPA or NCA.">
              Spatial Risk
            </Tooltip>
          </PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('imd')} className={getSortClassName('imd', sortConfig)}>
            <Tooltip text="The IMD transfer values shows the decile score moving from the development site to the BGS site.">
              IMD transfer
            </Tooltip>
          </PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('d')} className={getSortClassName('d', sortConfig)}>
            <Tooltip text="The distance from the development site to the BGS offset site.">
              Distance (km)
            </Tooltip>
          </PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('au')} className={getSortClassName('au', sortConfig)}>Area HUs</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('hu')} className={getSortClassName('hu', sortConfig)}>Hedgerow HUs</PrimaryTable.ColumnHeader>
          <PrimaryTable.ColumnHeader onClick={() => requestSort('wu')} className={getSortClassName('wu', sortConfig)}>Watercourse HUs</PrimaryTable.ColumnHeader>
        </PrimaryTable.Row>
      </PrimaryTable.Header>
      <PrimaryTable.Body>
        <PrimaryTable.Row style={{ fontWeight: 'bold', backgroundColor: '#ecf0f1' }}>
          <PrimaryTable.Cell colSpan="6" style={{ textAlign: 'center', border: '3px solid #ddd' }}>Totals</PrimaryTable.Cell>
          <PrimaryTable.Cell className="centered-data" style={{ border: '3px solid #ddd' }}>
            {summaryData.meanIMD !== null ? `${formatNumber(summaryData.meanIMD, 1)} → ${formatNumber(summaryData.meanSiteIMD, 1)} (mean)` : 'N/A'}
          </PrimaryTable.Cell>
          <PrimaryTable.Cell className="centered-data" style={{ border: '3px solid #ddd' }}>
            {summaryData.medianDistance !== null ? `${formatNumber(summaryData.medianDistance, 2)} (median)` : 'N/A'}
          </PrimaryTable.Cell>
          <PrimaryTable.Cell className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalArea)}</PrimaryTable.Cell>
          <PrimaryTable.Cell className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalHedgerow)}</PrimaryTable.Cell>
          <PrimaryTable.Cell className="numeric-data" style={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalWatercourse)}</PrimaryTable.Cell>
        </PrimaryTable.Row>
        {sortedItems.map((alloc) => (
          <AllocationRow key={`${alloc.srn}-${alloc.pr}`} alloc={alloc} />
        ))}
      </PrimaryTable.Body>
    </PrimaryTable.Root>
  )
};