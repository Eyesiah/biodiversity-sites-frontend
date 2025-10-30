
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Biodiversity Gain Sites',
  description: 'All sites on the BGS Register are shown on this page. Hover over any entry on the table to highlight the site on the map. Clicking on any row will focus the map on that site. Clicking on the BGS Reference link will open that site.'
};

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export default async function SiteListPage() {
  const allSites = await fetchAllSites(true);
  const { processedSites, summary } = processSiteDataForIndex(allSites);
  const lastUpdated = Date.now();

  const decileCounts = allSites.reduce((acc, site) => {
    const decile = site.lsoa?.IMDDecile ?? 'N/A';
    acc[decile] = (acc[decile] || 0) + 1;
    return acc;
  }, {});
  const imdChartData = Object.entries(decileCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (a.name === 'N/A') return 1;
      if (b.name === 'N/A') return -1;
      return Number(a.name) - Number(b.name);
    });

  return (
    <>
      <SiteListPageContent sites={processedSites} summary={summary} imdChart={imdChartData} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}