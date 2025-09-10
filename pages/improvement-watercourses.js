import Head from 'next/head';
import { fetchAllSites } from '../lib/api';
import { ImprovementPieChart } from '../components/ImprovementPieChart';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();

    const habitatData = {};

    allSites.forEach(site => {
      const processHabitats = (habitats, module) => {
        habitats?.forEach(habitat => {
          if (habitat.type) {
            const current = habitatData[habitat.type] || { value: 0, module };
            habitatData[habitat.type] = { value: current.value + habitat.size, module };
          }
        });
      };
      processHabitats(site.improvements?.watercourses, 'watercourse');      
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

export default function ImprovementWatercoursesChartPage({ pieChartData }) {
  return (
    <div style={{ backgroundColor: '#F9F6EE', padding: '1rem' }}>
      <Head><title>Improvement Watercourse Habitats Chart</title></Head>
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => window.close()} className="linkButton" style={{ fontSize: '1rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>
          Close
        </button>
      </div>
      <div style={{ height: 'calc(100vh - 7rem)' }}>
        <ImprovementPieChart data={pieChartData} title="Watercourse Habitats Improved - by size" disableAggregation={true} showBreakdown={false} />
      </div>
    </div>
  );
}