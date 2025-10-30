
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import { groupDifferences, scatter_sums, correlation, scatter_diffs } from '@/lib/Stats';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Biodiversity Gain Sites',
  description: 'All sites on the BGS Register are shown on this page. Hover over any entry on the table to highlight the site on the map. Clicking on any row will focus the map on that site. Clicking on the BGS Reference link will open that site.'
};

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export default async function SiteListPage() {
  const allSites = await fetchAllSites(true, true);
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

  // Flatten allocations and prepare IMD difference data
  const allocationsForDiff = allSites.flatMap(site => {
    if (!site.allocations) return [];
    return site.allocations.map(alloc => ({
      imd: typeof alloc.lsoa?.IMDDecile === 'number' ? alloc.lsoa.IMDDecile : null,
      simd: typeof site.lsoa?.IMDDecile === 'number' ? site.lsoa.IMDDecile : null
    }));
  }).filter(alloc => alloc.imd !== null && alloc.simd !== null);

  // Calculate statistics
  let imdStats = {};
  if (allocationsForDiff.length > 0) {
    // Separate arrays for correlation
    const x = allocationsForDiff.map(a => a.simd); // site IMD
    const y = allocationsForDiff.map(a => a.imd);  // alloc IMD
    
    const sums = scatter_sums(x, y);
    const corr = correlation(sums);
    
    // Calculate mean and std dev of differences
    const diffs = allocationsForDiff.map(a => a.simd - a.imd);
    const meanDiff = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + (d - meanDiff) ** 2, 0) / (diffs.length - 1); // sample variance
    const stdDev = Math.sqrt(variance);
    
    imdStats = {
      count: allocationsForDiff.length,
      correlation: corr,
      meanDifference: meanDiff,
      stdDevDifference: stdDev
    };
    
    // Log the statistics
    console.log('IMD Statistics:', imdStats);
  }

  const imdDiffGrouped = groupDifferences(allocationsForDiff, 1);
  const imdDiffChart = Object.entries(imdDiffGrouped)
    .map(([diff, count]) => ({ name: diff, count }))
    .sort((a, b) => Number(a.name) - Number(b.name));

  return (
    <>
      <SiteListPageContent sites={processedSites} summary={summary} imdChart={imdChartData} imdDiffChart={imdDiffChart} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
