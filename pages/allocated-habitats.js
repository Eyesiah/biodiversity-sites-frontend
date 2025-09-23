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
      processHabitats(alloc.habitats?.areas, 'area');
    });
  }
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function AllocatedHabitatsChartPage({ pieChartData }) {
  const chartTitle = "Allocated Area Habitats Chart";
  return (
    <ChartPage title={chartTitle}>
      <AllocationPieChart data={pieChartData} title={chartTitle} />
    </ChartPage>
  );
}
