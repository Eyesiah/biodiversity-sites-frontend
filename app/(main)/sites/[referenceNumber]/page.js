import { fetchSite } from '@/lib/api';
import SitePageContent from './SitePageContent'
import Footer from '@/components/core/Footer';

// Force dynamic rendering to ensure site names are available at runtime
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { referenceNumber } = await params;
  const site = await fetchSite(referenceNumber, false, false, true);

  return {
    title: site?.name ? `${site.name} | ${site.referenceNumber}` : `Site Details: ${site.referenceNumber}`,
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
