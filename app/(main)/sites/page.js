
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'BGS Sites',
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