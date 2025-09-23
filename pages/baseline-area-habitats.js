import { getPieChartData } from '@/lib/charts';
import ChartPage from '@/components/ChartPage';
import { AllocationPieChart } from '@/components/AllocationPieChart';

const extractor = (site, habitatData) => {
  if (site.habitats?.areas) {
    site.habitats.areas.forEach(habitat => {
      if (habitat.type) {
        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'area' };
      }
    });
  }
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function BaselineAreaHabitatsChartPage({ pieChartData }) {
  const chartTitle = "Baseline Area Habitats - by size";
  return (
    <ChartPage title="Baseline Area Habitats Chart">
      <AllocationPieChart data={pieChartData} title={chartTitle} otherLabel="Area habitats <1%" />
    </ChartPage>
  );
}
