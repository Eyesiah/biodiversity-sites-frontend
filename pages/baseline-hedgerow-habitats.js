import { getPieChartData } from '@/lib/charts';
import ChartPage from '@/components/ChartPage';
import { AllocationPieChart } from '@/components/AllocationPieChart';

const extractor = (site, habitatData) => {
  if (site.habitats?.hedgerows) {
    site.habitats.hedgerows.forEach(habitat => {
      if (habitat.type) {
        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'hedgerow' };
      }
    });
  }
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function BaselineHedgerowHabitatsChartPage({ pieChartData }) {
  const chartTitle = "Baseline Hedgerow Habitats - by size";
  return (
    <ChartPage title="Baseline Hedgerow Habitats Chart">
      <AllocationPieChart data={pieChartData} disableAggregation={true} title={chartTitle} showBreakdown={false} />
    </ChartPage>
  );
}
