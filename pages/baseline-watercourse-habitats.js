import { getPieChartData } from '@/lib/charts';
import ChartPage from '@/components/ChartPage';
import { AllocationPieChart } from '@/components/AllocationPieChart';

const extractor = (site, habitatData) => {
  if (site.habitats?.watercourses) {
    site.habitats.watercourses.forEach(habitat => {
      if (habitat.type) {
        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'watercourse' };
      }
    });
  }
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function BaselineWatercourseHabitatsChartPage({ pieChartData }) {
  const chartTitle = "Baseline Watercourse Habitats - by size";
  return (
    <ChartPage title="Baseline Watercourse Habitats Chart">
      <AllocationPieChart data={pieChartData} disableAggregation={true} title={chartTitle} showBreakdown={false} />
    </ChartPage>
  );
}
