import Head from 'next/head';
import { fetchAllSites } from '../lib/api';
import { AllocationPieChart } from '../components/AllocationPieChart';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();

    const habitatData = {};

    allSites.forEach(site => {
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

export default function WatercourseAllocationsChartPage({ pieChartData }) {
  return (
    <div style={{ backgroundColor: '#F9F6EE', padding: '1rem' }}>
      <Head><title>Watercourse Habitats Allocated Chart</title></Head>
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => window.close()}
          className="linkButton"
          style={{ fontSize: '1.5rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Close
        </button>
      </div>
      <div style={{ height: 'calc(100vh - 7rem)' }}>
        <AllocationPieChart data={pieChartData} disableAggregation={true} title="Watercourse habitats allocated - by size" />
      </div>
    </div>
  );
}