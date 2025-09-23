import { fetchAllSites } from '@/lib/api';

async function fetchAndProcessPieData(extractor) {
  try {
    const allSites = await fetchAllSites();
    const habitatData = {};

    allSites.forEach(site => {
      extractor(site, habitatData);
    });

    const pieChartData = Object.entries(habitatData).map(([name, data]) => ({ name, value: data.value, module: data.module }));
    return { data: pieChartData, error: null };
  } catch (e) {
    console.error(e);
    return { data: [], error: 'Failed to load chart data.' };
  }
}

// Keep this function for the pages router for now
export async function getPieChartData(extractor) {
  const { data, error } = await fetchAndProcessPieData(extractor);
  return {
    props: {
      pieChartData: data,
      error,
    },
    revalidate: 3600,
  };
}

// New function for the app router
export async function getChartData(extractor) {
  return await fetchAndProcessPieData(extractor);
}