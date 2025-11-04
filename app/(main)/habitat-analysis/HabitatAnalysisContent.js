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
import SiteHabitatSankeyChart from "@/components/charts/SiteHabitatSankeyChart";

const processDataWithProportions = (data, module) => {
  // Calculate totals
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

  // Process data with calculated percentages (create new objects to avoid mutation)
  const processedData = moduleData.map(h => ({
    ...h,
    baselineShare: totalBaseline > 0 ? (h.baseline / totalBaseline) * 100 : 0,
    improvementShare: totalImprovement > 0 ? (h.improvement / totalImprovement) * 100 : 0,
    allocationShare: totalAllocation > 0 ? (h.allocation / totalAllocation) * 100 : 0,
    improvementAllocation: h.improvement > 0 ? (h.allocation / h.improvement) * 100 : 0,
  }));

  const totalImprovementAllocation = totalImprovement > 0 ? (totalAllocation / totalImprovement) * 100 : 0;

  return {
    processedData,
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
  const unit = module === 'areas' ? 'ha' : 'km';

  // Memoize all calculations to prevent unnecessary re-computation
  const { processedData, totals } = useMemo(() => {
    return processDataWithProportions(data, module);
  }, [data, module]);

  return (
    <TableContainer>
      <DataTable.Root>
        <DataTable.Header>
          <DataTable.Row>
            <DataTable.ColumnHeader colSpan="2" color="fg" backgroundColor='bg'>Intervention Groups</DataTable.ColumnHeader>
            <DataTable.ColumnHeader colSpan="3" color="black" backgroundColor='#e0e8f0'>Baseline</DataTable.ColumnHeader>
            <DataTable.ColumnHeader colSpan="4" color="black" backgroundColor='#dcf0e7'>Improvements</DataTable.ColumnHeader>
            <DataTable.ColumnHeader colSpan="4" color="black" backgroundColor='#f0e0e0'>Allocations</DataTable.ColumnHeader>
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.ColumnHeader onClick={() => requestSort('habitat')} {...getSortProps('habitat', sortConfig)}>Habitat</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('distinctiveness')} {...getSortProps('distinctiveness', sortConfig)} textAlign="center">Distinctiveness</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('baselineParcels')} {...getSortProps('baselineParcels', sortConfig)} textAlign="center"># Parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('baseline')} {...getSortProps('baseline', sortConfig)}>Baseline size ({unit})</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('baselineShare')} {...getSortProps('baselineShare', sortConfig)}>% Share</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementSites')} {...getSortProps('improvementSites', sortConfig)} textAlign="center">Improvement # Sites</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementParcels')} {...getSortProps('improvementParcels', sortConfig)} textAlign="center"># Parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvement')} {...getSortProps('improvement', sortConfig)}>Improvement size ({unit})</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementShare')} {...getSortProps('improvementShare', sortConfig)}>% Share</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('allocationParcels')} {...getSortProps('allocationParcels', sortConfig)} textAlign="center"># Parcels</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('allocation')} {...getSortProps('allocation', sortConfig)}>Allocation ({unit})</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('allocationShare')} {...getSortProps('allocationShare', sortConfig)}>% Share</DataTable.ColumnHeader>
            <DataTable.ColumnHeader onClick={() => requestSort('improvementAllocation')} {...getSortProps('improvementAllocation', sortConfig)}>% of Improvements</DataTable.ColumnHeader>
          </DataTable.Row>
        </DataTable.Header>
        <DataTable.Body>
          <DataTable.Row fontWeight='bold' backgroundColor='tableTotalsBg'>
            <DataTable.Cell colSpan="2" textAlign="right">Totals:</DataTable.Cell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalBaselineParcels, 0)}</DataTable.CenteredNumericCell>
            <DataTable.NumericCell>{formatNumber(totals.totalBaseline)}</DataTable.NumericCell>
            <DataTable.Cell></DataTable.Cell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalImprovementSites, 0)}</DataTable.CenteredNumericCell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalImprovementParcels, 0)}</DataTable.CenteredNumericCell>
            <DataTable.NumericCell>{formatNumber(totals.totalImprovement)}</DataTable.NumericCell>
            <DataTable.Cell></DataTable.Cell>
            <DataTable.CenteredNumericCell>{formatNumber(totals.totalAllocationParcels, 0)}</DataTable.CenteredNumericCell>
            <DataTable.NumericCell>{formatNumber(totals.totalAllocation)}</DataTable.NumericCell>
            <DataTable.Cell></DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(totals.totalImprovementAllocation, 2)}%</DataTable.NumericCell>
          </DataTable.Row>
          {processedData.map(row => (
            <DataTable.Row key={row.habitat}>
              <DataTable.Cell>{row.habitat}</DataTable.Cell>
              <DataTable.Cell textAlign='center'>{row.distinctiveness}</DataTable.Cell>
              <DataTable.CenteredNumericCell>{formatNumber(row.baselineParcels, 0)}</DataTable.CenteredNumericCell>
              <DataTable.NumericCell>{formatNumber(row.baseline)}</DataTable.NumericCell>
              <DataTable.NumericCell>{formatNumber(row.baselineShare, 2)}%</DataTable.NumericCell>
              <DataTable.Cell textAlign='center'>{row.improvementSites || 0}</DataTable.Cell>
              <DataTable.CenteredNumericCell>{formatNumber(row.improvementParcels, 0)}</DataTable.CenteredNumericCell>
              <DataTable.NumericCell>{formatNumber(row.improvement)}</DataTable.NumericCell>
              <DataTable.NumericCell>{formatNumber(row.improvementShare, 2)}%</DataTable.NumericCell>
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

    // Process data with calculated percentages (create new objects to avoid mutation)
    const savedData = processDataWithProportions(allData).processedData;

    const csvData = savedData.map(row => ({
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
