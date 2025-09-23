import { getPieChartData } from '@/lib/charts';
import ChartPage from '@/components/ChartPage';
import { AllocationPieChart } from '@/components/AllocationPieChart';

const extractor = (site, habitatData) => {
  if (site.allocations) {
    site.allocations.forEach(alloc => {
      const processHabitats = (habitats, module) => {
        if (habitats) {
          habitats.forEach(habitat => {
            if (habitat.type) {
              habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module };
            }
          });
        }
      };
      processHabitats(alloc.habitats?.hedgerows, 'hedgerow');
    });
  }
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function HedgerowAllocationsChartPage({ pieChartData }) {
  const chartTitle = "Hedgerow habitats allocated - by size";
  return (
    <ChartPage title="Hedgerow Habitats Allocated Chart">
      <AllocationPieChart data={pieChartData} disableAggregation={true} title={chartTitle} />
    </ChartPage>
  );
}
