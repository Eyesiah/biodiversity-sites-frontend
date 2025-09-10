import Head from 'next/head';
import { fetchAllSites } from '../lib/api';
import { AllocationPieChart } from '../components/AllocationPieChart';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();

    const habitatData = {};

    allSites.forEach(site => {
      if (site.habitats?.watercourses) {
        site.habitats.watercourses.forEach(habitat => {
          if (habitat.type) {
            habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'watercourse' };
          }
        });
      }
    });

    const pieChartData = Object.entries(habitatData).map(([name, data]) => ({ name, value: data.value, module: data.module }));

    return {
      props: {
        pieChartData,
      },
      revalidate: 3600,
    };
  } catch (e) {
    console.error(e);
    return { props: { pieChartData: [], error: 'Failed to load chart data.' } };
  }
}

export default function BaselineWatercourseHabitatsChartPage({ pieChartData }) {
  return (
    <div style={{ backgroundColor: '#F9F6EE', padding: '1rem' }}>
      <Head><title>Baseline Watercourse Habitats Chart</title></Head>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => window.close()} className="linkButton" style={{ fontSize: '1rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>Close</button>
      </div>
      <div style={{ height: 'calc(100vh - 6rem)' }}>
        <AllocationPieChart data={pieChartData} disableAggregation={true} title="Baseline Watercourse Habitats - by size" showBreakdown={false} />
      </div>
    </div>
  );
}