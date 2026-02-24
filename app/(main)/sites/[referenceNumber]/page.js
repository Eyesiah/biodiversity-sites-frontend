import { fetchSite, fetchAllRefNos } from '@/lib/api';
import SitePageContent from './SitePageContent'
import Footer from '@/components/core/Footer';

export const revalidate = 86400; // 24 hours

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
    title: site?.name ? `${site.name} | ${site.referenceNumber}` : `Site Details: ${site.referenceNumber}`,
    description: `Details for Biodiversity Gain Site ${site.referenceNumber} - NOTE: site names are best guesses as the register does not contain names for sites.`,
    keywords: ['BGS site', 'biodiversity gain site', 'BNG site', `site ${site.referenceNumber}`, 'habitat units', 'biodiversity site England'],
  };
}

export default async function SitePage({ params }) {

  const { referenceNumber } = await params;
  const lastUpdated = Date.now();

  const site = await fetchSite(referenceNumber, true, true, true, true)
  if (!site) {
    return <p>Site not found</p>
  }

  // Ensure essential site data is available to prevent hydration issues
  if (!site.referenceNumber || !site.habitats || !site.improvements) {
    return <p>Loading site details...</p>
  }

  if (site.latitude && site.longitude) {
    site.position = [site.latitude, site.longitude];
  }

  return (
    <>
      <SitePageContent site={site} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
