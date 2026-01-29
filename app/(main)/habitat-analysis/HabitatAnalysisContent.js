'use client'

import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { getSortProps } from '@/lib/hooks';
import Papa from 'papaparse';
import { triggerDownload } from '@/lib/utils';
import { DataTable } from '@/components/styles/DataTable';
import { TableContainer } from '@/components/styles/PrimaryCard';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { FilteredBaselinePieChart } from '@/components/charts/FilteredHabitatPieChart'
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import Tooltip from '@/components/ui/Tooltip';

const calculateTotals = (data, module) => {
  // Calculate totals for the specified module
  let totalBaseline = 0;
  let totalImprovement = 0;
  let totalAllocation = 0;
  let totalBaselineParcels = 0;
  let totalImprovementParcels = 0;
  let totalAllocationParcels = 0;
  let totalImprovementSites = 0;

  const moduleData = module != null ? data.filter(h => h.module == module) : data;

  moduleData.forEach(h => {
    totalBaseline += h.baseline;
    totalImprovement += h.improvement;
    totalAllocation += h.allocation;
    totalBaselineParcels += h.baselineParcels;
    totalImprovementParcels += h.improvementParcels;
    totalAllocationParcels += h.allocationParcels;
    totalImprovementSites += h.improvementSites;
  });

  const totalImprovementAllocation = totalImprovement > 0 ? (totalAllocation / totalImprovement) * 100 : 0;

  return {
    totals: {
      totalBaseline,
      totalImprovement,
      totalAllocation,
      totalBaselineParcels,
      totalImprovementParcels,
      totalAllocationParcels,
      totalImprovementSites,
      totalImprovementAllocation
    }
  };
}

const AnalysisTable = ({ data, module, requestSort, sortConfig }) => {

  // Determine unit based on module type
  const unit = (module === 'areas' || module === 'trees') ? 'ha' : 'km';

  // Memoize all calculations to prevent unnecessary re-computation
  const { processedData, totals } = useMemo(() => {
    const { totals } = calculateTotals(data, module);
    const processedData = module != null ? data.filter(h => h.module == module) : data;
    return { processedData, totals };
  }, [data, module]);

  return (
    <TableContainer>
      <DataTable.Root>
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader colSpan="2" color="black" backgroundColor='bg' borderRight="4px solid tableSectionBorder">Intervention Groups</DataTable.ColumnHeader>
            <DataTable.ColumnHeader colSpan="3" color="black" backgroundColor='tableSection.baselineBg' borderRight="4px solid tableSectionBorder">Baseline</DataTable.ColumnHeader>
            <DataTable.ColumnHeader colSpan="4" color="black" backgroundColor='tableSection.improvementsBg' borderRight="4px solid tableSectionBorder">Improvements</DataTable.ColumnHeader>
            <DataTable.ColumnHeader colSpan="4" color="black" backgroundColor='tableSection.allocationsBg' borderRight="4px solid tableSectionBorder">Allocations</DataTable.ColumnHeader>
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.ColumnHeader onClick={() => requestSort('habitat')} {...getSortProps('habitat', sortConfig)}><GlossaryTooltip term='Habitat'>Habitat</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('distinctiveness')} {...getSortProps('distinctiveness', sortConfig)} textAlign="center" borderRight="4px solid tableSectionBorder"><GlossaryTooltip term='Distinctiveness'>Distinctiveness</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('baselineParcels')} {...getSortProps('baselineParcels', sortConfig)} textAlign="center"><GlossaryTooltip term='Parcel'># Parcels</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('baseline')} {...getSortProps('baseline', sortConfig)}><GlossaryTooltip term='Baseline size'>Baseline size</GlossaryTooltip> ({unit})</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('baselineShare')} {...getSortProps('baselineShare', sortConfig)} borderRight="4px solid tableSectionBorder"><Tooltip text="The percentage share of the total baseline habitats.">% Baseline</Tooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementSites')} {...getSortProps('improvementSites', sortConfig)} textAlign="center"><GlossaryTooltip term='Improvement Sites'># Improvement Sites</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementParcels')} {...getSortProps('improvementParcels', sortConfig)} textAlign="center"><GlossaryTooltip term='Parcel'># Parcels</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvement')} {...getSortProps('improvement', sortConfig)}><GlossaryTooltip term='Improvement size'>Improvement size ({unit})</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementShare')} {...getSortProps('improvementShare', sortConfig)} borderRight="4px solid tableSectionBorder"><Tooltip text="The percentage share of the total improved habitats.">% Improved</Tooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('allocationParcels')} {...getSortProps('allocationParcels', sortConfig)} textAlign="center"><GlossaryTooltip term='Parcel'># Parcels</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('allocation')} {...getSortProps('allocation', sortConfig)}><GlossaryTooltip term='Allocation'>Allocation ({unit})</GlossaryTooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('allocationShare')} {...getSortProps('allocationShare', sortConfig)}><Tooltip text="The percentage share of the total allocated habitat parcels.">% allocated</Tooltip></DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementAllocation')} {...getSortProps('improvementAllocation', sortConfig)}><Tooltip text="The percentage share allocated of this improved habitat.">% Improvement allocated</Tooltip></DataTable.ColumnHeader>
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          <DataTable.Row fontWeight='bold' backgroundColor='tableTotalsBg'>
            <DataTable.Cell colSpan="2" textAlign="right" borderRight="4px solid tableSectionBorder">Totals:</DataTable.Cell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalBaselineParcels, 0)}</DataTable.CenteredNumericCell>
            <DataTable.NumericCell>{formatNumber(totals.totalBaseline)}</DataTable.NumericCell>
            <DataTable.Cell borderRight="4px solid tableSectionBorder"></DataTable.Cell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalImprovementSites, 0)}</DataTable.CenteredNumericCell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalImprovementParcels, 0)}</DataTable.CenteredNumericCell>
            <DataTable.NumericCell>{formatNumber(totals.totalImprovement)}</DataTable.NumericCell>
            <DataTable.Cell borderRight="4px solid tableSectionBorder"></DataTable.Cell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalAllocationParcels, 0)}</DataTable.CenteredNumericCell>
            <DataTable.NumericCell>{formatNumber(totals.totalAllocation)}</DataTable.NumericCell>
            <DataTable.Cell></DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(totals.totalImprovementAllocation, 2)}%</DataTable.NumericCell>
          </DataTable.Row>
          {processedData.map(row => (
            <DataTable.Row key={row.habitat}>
              <DataTable.Cell>{row.habitat}</DataTable.Cell>
              <DataTable.Cell textAlign='center' borderRight="4px solid tableSectionBorder">{row.distinctiveness}</DataTable.Cell>
              <DataTable.CenteredNumericCell>{formatNumber(row.baselineParcels, 0)}</DataTable.CenteredNumericCell>
              <DataTable.NumericCell>{formatNumber(row.baseline)}</DataTable.NumericCell>
              <DataTable.NumericCell borderRight="4px solid tableSectionBorder">{formatNumber(row.baselineShare, 2)}%</DataTable.NumericCell>
              <DataTable.Cell textAlign='center'>{row.improvementSites || 0}</DataTable.Cell>
              <DataTable.CenteredNumericCell>{formatNumber(row.improvementParcels, 0)}</DataTable.CenteredNumericCell>
              <DataTable.NumericCell>{formatNumber(row.improvement)}</DataTable.NumericCell>
              <DataTable.NumericCell borderRight="4px solid tableSectionBorder">{formatNumber(row.improvementShare, 2)}%</DataTable.NumericCell>
              <DataTable.CenteredNumericCell>{formatNumber(row.allocationParcels, 0)}</DataTable.CenteredNumericCell>
              <DataTable.NumericCell>{formatNumber(row.allocation)}</DataTable.NumericCell>
              <DataTable.NumericCell>{formatNumber(row.allocationShare, 2)}%</DataTable.NumericCell>
              <DataTable.NumericCell>{formatNumber(row.improvementAllocation, 2)}%</DataTable.NumericCell>
            </DataTable.Row>
          ))}
        </DataTable.Body>
      </DataTable.Root>
    </TableContainer>
  );
}

export default function HabitatAnalysisContent({ habitats }) {

  const handleExport = (allData) => {

    // Data already has calculated percentages
    const csvData = allData.map(row => ({
      'Module': row.module,
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


  const tabs = [
    {
      title: 'Area<br>Habitats List',
      content: ({ sortedItems, requestSort, sortConfig }) => (
        <AnalysisTable data={sortedItems} module="areas" requestSort={requestSort} sortConfig={sortConfig} />
      )
    },
    {
      title: 'Tree<br>Habitats List',
      content: ({ sortedItems, requestSort, sortConfig }) => (
        <AnalysisTable data={sortedItems} module="trees" requestSort={requestSort} sortConfig={sortConfig} />
      )
    },
    {
      title: 'Hedgerow<br>Habitats List',
      content: ({ sortedItems, requestSort, sortConfig }) => (
        <AnalysisTable data={sortedItems} module="hedgerows" requestSort={requestSort} sortConfig={sortConfig} />
      )
    },
    {
      title: 'Watercourse<br>Habitats List',
      content: ({ sortedItems, requestSort, sortConfig }) => (
        <AnalysisTable data={sortedItems} module="watercourses" requestSort={requestSort} sortConfig={sortConfig} />
      )
    },
    {
      title: 'Baseline Area<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='areas' name='Baseline Area' sizeParam='baseline' />
    },
    {
      title: 'Baseline Tree<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='trees' name='Baseline Trees' sizeParam='baseline' />
    },
    {
      title: 'Baseline Hedgerow<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='hedgerows' name='Baseline Hedgerow' sizeParam='baseline' />
    },
    {
      title: 'Baseline Watercourse<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='watercourses' name='Baseline Watercourse' sizeParam='baseline' />
    },
    {
      title: 'Improvement Area<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='areas' name='Area Improvement' sizeParam='improvement' />
    },
    {
      title: 'Improvement Tree<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='trees' name='Tree Improvement' sizeParam='improvement' />
    },
    {
      title: 'Improvement Hedgerow<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='hedgerows' name='Hedgerow Improvement' sizeParam='improvement' />
    },
    {
      title: 'Improvement Watercourse<br>Habitats Chart',
      content: ({ sortedItems }) => <FilteredBaselinePieChart allHabitats={sortedItems} module='watercourses' name='Watercourse Improvement' sizeParam='improvement' />
    }
  ];

  return (
    <SearchableTableLayout
      initialItems={habitats}
      initialSortConfig={{ key: 'habitat', direction: 'ascending' }}
      placeholder="Search by habitat name..."
      exportConfig={{ onExportCsv: handleExport }}
      tabs={tabs}
      filterPredicate={(item, term) => item.habitat.toLowerCase().includes(term.toLowerCase())}
    />
  )

}
