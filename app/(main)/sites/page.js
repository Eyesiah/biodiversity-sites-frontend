
import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';
import SiteListPageContent from './SiteListPageContent';
import Footer from '@/components/Footer';
import { Box } from '@chakra-ui/react';

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
  
  return (
    <>
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="flex-start" 
        fontSize="1rem" 
        color="black" 
        bg="bone" 
        textAlign="center" 
        px="2rem"
      >
        <SiteListPageContent sites={processedSites} summary={summary}/>
      </Box>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}