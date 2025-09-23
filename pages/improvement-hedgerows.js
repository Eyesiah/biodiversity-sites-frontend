import { getPieChartData } from '@/lib/charts';
import ChartPage from '@/components/ChartPage';
import { ImprovementPieChart } from '@/components/ImprovementPieChart';

const extractor = (site, habitatData) => {
  const processHabitats = (habitats, module) => {
    habitats?.forEach(habitat => {
      if (habitat.type) {
        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module };
      }
    });
  };
  processHabitats(site.improvements?.hedgerows, 'hedgerow');
};

export async function getStaticProps() {
  return getPieChartData(extractor);
}

export default function ImprovementHedgerowsChartPage({ pieChartData }) {
  const chartTitle = "Hedgerow Habitats Improved - by size";
  return (
    <ChartPage title="Improvement Hedgerow Habitats Chart">
      <ImprovementPieChart data={pieChartData} title={chartTitle} showBreakdown={false} disableAggregation={true} />
    </ChartPage>
  );
}
