import Link from 'next/link';
import { formatNumber, slugify } from '@/lib/format';
import { DataFetchingCollapsibleRow } from '@/components/data/DataFetchingCollapsibleRow'
import Tooltip from '@/components/ui/Tooltip';
import { getSortProps } from '@/lib/hooks';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { Text } from '@chakra-ui/react';
import { TableContainer } from '@/components/styles/PrimaryCard';

const AllocationHabitats = ({ habitats }) => {

  if (habitats.length === 0) {
    return <Text>No habitat details for this allocation.</Text>;
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
        <PrimaryTable.CenteredNumericCell>{imdTransfer}</PrimaryTable.CenteredNumericCell>
        <PrimaryTable.CenteredNumericCell>
          {typeof alloc.d === 'number' ? formatNumber(alloc.d, 0) : alloc.d}
        </PrimaryTable.CenteredNumericCell>
        <PrimaryTable.NumericCell>{alloc.au && alloc.au > 0 ? formatNumber(alloc.au) : ''}</PrimaryTable.NumericCell>
        <PrimaryTable.NumericCell>{alloc.hu && alloc.hu > 0 ? formatNumber(alloc.hu) : ''}</PrimaryTable.NumericCell>
        <PrimaryTable.NumericCell>{alloc.wu && alloc.wu > 0 ? formatNumber(alloc.wu) : ''}</PrimaryTable.NumericCell>
      </>
    )}
    dataUrl={`/api/modal/allocations/${alloc.srn}/${slugify(alloc.pr.trim())}`}
    renderDetails={details => <AllocationHabitats habitats={details} />}
    dataExtractor={json => json}
    colSpan={8}
  />
  )
};

export default function AllAllocationsList({ sortedItems, requestSort, sortConfig, summaryData }) {

  return (
    <TableContainer>
      <PrimaryTable.Root>
        <PrimaryTable.Header>
          <PrimaryTable.Row>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('srn')} {...getSortProps('srn', sortConfig)}>BGS ref.</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('pr')} {...getSortProps('pr', sortConfig)}>Planning ref.</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('pn')} {...getSortProps('pn', sortConfig)}>Planning address</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('lpa')} {...getSortProps('lpa', sortConfig)}>LPA</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('nca')} {...getSortProps('nca', sortConfig)}>NCA</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('sr.cat')} {...getSortProps('sr.cat', sortConfig)}>
              <Tooltip text="The Spatial Risk Category - whether the BGS offset site is within, neighbouring or outside the development site LPA or NCA.">
                Spatial Risk
              </Tooltip>
            </PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('imd')} {...getSortProps('imd', sortConfig)}>
              <Tooltip text="The IMD transfer values shows the decile score moving from the development site to the BGS site.">
                IMD transfer
              </Tooltip>
            </PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('d')} {...getSortProps('d', sortConfig)}>
              <Tooltip text="The distance from the development site to the BGS offset site.">
                Distance (km)
              </Tooltip>
            </PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('au')} {...getSortProps('au', sortConfig)}>Area HUs</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('hu')} {...getSortProps('hu', sortConfig)}>Hedgerow HUs</PrimaryTable.ColumnHeader>
            <PrimaryTable.ColumnHeader onClick={() => requestSort('wu')} {...getSortProps('wu', sortConfig)}>Watercourse HUs</PrimaryTable.ColumnHeader>
          </PrimaryTable.Row>
        </PrimaryTable.Header>
        <PrimaryTable.Body>
          <PrimaryTable.Row fontWeight="bold" bg="#ecf0f1">
            <PrimaryTable.Cell colSpan={6} textAlign="center" sx={{ border: '3px solid #ddd' }}>Totals</PrimaryTable.Cell>
            <PrimaryTable.CenteredNumericCell sx={{ border: '3px solid #ddd' }}>
              {summaryData.meanIMD !== null ? `${formatNumber(summaryData.meanIMD, 1)} → ${formatNumber(summaryData.meanSiteIMD, 1)} (mean)` : 'N/A'}
            </PrimaryTable.CenteredNumericCell>
            <PrimaryTable.CenteredNumericCell sx={{ border: '3px solid #ddd' }}>
              {summaryData.medianDistance !== null ? `${formatNumber(summaryData.medianDistance, 2)} (median)` : 'N/A'}
            </PrimaryTable.CenteredNumericCell>
            <PrimaryTable.NumericCell sx={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalArea)}</PrimaryTable.NumericCell>
            <PrimaryTable.NumericCell sx={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalHedgerow)}</PrimaryTable.NumericCell>
            <PrimaryTable.NumericCell sx={{ border: '3px solid #ddd' }}>{formatNumber(summaryData.totalWatercourse)}</PrimaryTable.NumericCell>
          </PrimaryTable.Row>
          {sortedItems.map((alloc) => (
            <AllocationRow key={`${alloc.srn}-${alloc.pr}`} alloc={alloc} />
          ))}
        </PrimaryTable.Body>
      </PrimaryTable.Root>
    </TableContainer>
  )
};
