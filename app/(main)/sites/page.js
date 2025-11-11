
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Biodiversity Gain Sites',
  description: 'All sites on the BGS Register are shown on this page. Hover over any entry on the table to highlight the site on the map. Clicking on any row will focus the map on that site. Clicking on the BGS Reference link will open that site.'
};

import {ISR_REVALIDATE_TIME} from '@/config'
export const revalidate = ISR_REVALIDATE_TIME;


export default async function SiteListPage() {
  const allSites = await fetchAllSites(true);
  const { processedSites } = processSiteDataForIndex(allSites);
  const lastUpdated = Date.now();

  return (
    <>
      <SiteListPageContent
        sites={processedSites}
      />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
