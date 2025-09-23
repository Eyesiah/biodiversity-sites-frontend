import { fetchAllSites } from '@/lib/api';

export async function getPieChartData(extractor) {
  try {
    const allSites = await fetchAllSites();
    const habitatData = {};

    allSites.forEach(site => {
      extractor(site, habitatData);
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
