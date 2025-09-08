import Head from 'next/head';
import { fetchAllSites } from '../lib/api';
import { AllocationPieChart } from '../components/AllocationPieChart';
import styles from '../styles/SiteDetails.module.css';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();

    const habitatData = {};

    allSites.forEach(site => {
      site.allocations?.forEach(alloc => {
        const processHabitats = (habitats) => {
          habitats?.forEach(habitat => {
            if (habitat.type) {
              habitatData[habitat.type] = (habitatData[habitat.type] || 0) + habitat.size;
            }
          });
        };
        ['areas', 'hedgerows', 'watercourses'].forEach(category => processHabitats(alloc.habitats?.[category]));
      });
    });

    const pieChartData = Object.entries(habitatData).map(([name, value]) => ({ name, value }));

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

export default function AllocatedHabitatsChartPage({ pieChartData }) {
  return (
    <main className={styles.container}>
      <Head><title>Allocated Habitats Chart</title></Head>
      <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
        <h1 className="title" style={{ fontSize: '1.5rem' }}>Allocated habitats by percentage</h1>
      </div>
      <div style={{ width: '100%', height: '80vh' }}>
        <AllocationPieChart data={pieChartData} />
      </div>
    </main>
  );
}