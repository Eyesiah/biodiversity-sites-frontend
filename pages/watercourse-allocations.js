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
      processHabitats(alloc.habitats?.watercourses, 'watercourse');
    });
  }
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function WatercourseAllocationsChartPage({ pieChartData }) {
  const chartTitle = "Watercourse habitats allocated - by size";
  return (
    <ChartPage title={chartTitle}>
      <AllocationPieChart data={pieChartData} disableAggregation={true} title={chartTitle} />
    </ChartPage>
  );
}
