import { fetchSite, fetchAllRefNos } from '@/lib/api';
import { getHabitatSankeyGraph } from '@/lib/sites'
import SitePageContent from './SitePageContent'
import Footer from '@/components/core/Footer';

export const revalidate = 43200; // 12 hours


export async function generateStaticParams() {

  const sites = await fetchAllRefNos();
  const paths = sites.map(referenceNumber => {
    return { referenceNumber: referenceNumber };
  });

  return paths;
}

export async function generateMetadata({ params }) {

  const { referenceNumber } = await params;
  const site = await fetchSite(referenceNumber, false, false, true);

  return {
    title: site.name ? `${site.name} | ${site.referenceNumber}` : `Site Details: ${site.referenceNumber}`,
    description: `Details for Biodiversity Gain Site ${site.referenceNumber} - NOTE: site names are best guesses as the register does not contain names for sites.`,
  };
}

export default async function SitePage({ params }) {

  const { referenceNumber } = await params;
  const lastUpdated = Date.now();

  const site = await fetchSite(referenceNumber, true, true, true)
  if (!site) {
    return <p>Site not found</p>
  }

  if (site.latitude && site.longitude) {
    site.position = [site.latitude, site.longitude];
  }

  const sankeyData = getHabitatSankeyGraph(site);

  return (
    <>
      <SitePageContent site={site} sankeyData={sankeyData} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
