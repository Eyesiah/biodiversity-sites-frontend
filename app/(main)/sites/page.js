
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Biodiversity Gain Sites',
  description: 'All sites on the BGS register are shown here. Hover over any entry to highlight the site on the map. Select the reference number for the full site details.'
};

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export default async function SiteListPage() {
  const allSites = await fetchAllSites(true);
  const { processedSites, summary } = processSiteDataForIndex(allSites);
  const lastUpdated = Date.now();
  
  return (
    <>
      <div className="container">
        <SiteListPageContent sites={processedSites} summary={summary}/>
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}