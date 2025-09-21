
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/Footer';

export default async function SiteListPage() {
  const allSites = await fetchAllSites(true);
  const { processedSites, summary } = processSiteDataForIndex(allSites);
  const lastUpdated = Date.now();
  
  return (
    <div className="container">
      <main className="main">
        <SiteListPageContent sites={processedSites} summary={summary}/>
      </main>
      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}