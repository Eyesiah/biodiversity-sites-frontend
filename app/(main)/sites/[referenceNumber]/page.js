import styles from '@/styles/SiteDetails.module.css';
import { fetchSite, fetchAllSites } from '@/lib/api';
import { collateAllHabitats } from '@/lib/habitat';
import SitePageContent from './SitePageContent'
import Footer from '@/components/Footer';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export async function generateStaticParams() {

  const sites = await fetchAllSites();
  const paths = sites.map(site => {
     return {referenceNumber: site.referenceNumber};
  });

  return paths;
}

export async function generateMetadata({ params }) {

  const { referenceNumber } = await params;
  const site = await fetchSite(referenceNumber);

  return {
    title: `BGS Details: ${site.referenceNumber}`,
    description: `Details for Biodiversity Gain Site ${site.referenceNumber}`,
  };
}

export default async function SitePage({params}) {

  const { referenceNumber } = await params;
  const lastUpdated = Date.now();

  const site = await fetchSite(referenceNumber, true, true)
  if (!site)
  {
    return (
        <div className={styles.container}>
          <p>Site not found</p>
        </div>);
  }

  if (site.latitude && site.longitude) {
    site.position = [site.latitude, site.longitude];
  }

  site.habitats = collateAllHabitats(site.habitats, false);
  site.improvements = collateAllHabitats(site.improvements, true);

  return (
    <>
      <div className={styles.container}>
        <SitePageContent site={site}/>
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
