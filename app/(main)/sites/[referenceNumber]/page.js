import styles from '@/styles/SiteDetails.module.css';
import { fetchSite, fetchAllSites } from '@/lib/api';
import { getDistanceFromLatLonInKm, getCoordinatesForAddress, getCoordinatesForLPA } from '@/lib/geo';
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

  const site = await fetchSite(referenceNumber, true)
  if (!site)
  {
    return (
        <div className={styles.container}>
          <p>Site not found</p>
        </div>);
  }

  // process allocation location data
  if (site.allocations) {
    await Promise.all(site.allocations.map(async (alloc) => {

      // 1. Always try to geocode the address, using the LPA for context.
      if (alloc.projectName) {
        alloc.coords = await getCoordinatesForAddress(alloc.projectName, alloc.localPlanningAuthority);
      }

      // 2. If geocoding the full address fails, fall back to just the LPA.
      if (!alloc.coords && alloc.localPlanningAuthority) {
        alloc.coords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
      }

      // 3. If we have coordinates for the allocation, calculate the distance.
      if (alloc.coords && site.latitude && site.longitude) {
        alloc.distance = getDistanceFromLatLonInKm(
          site.latitude,
          site.longitude,
          alloc.coords.latitude,
          alloc.coords.longitude
        );
      } else {
        alloc.distance = 'unknown';
      }

      // If distance is > 688km, fall back to LPA centroid
      if (alloc.distance > 688 && alloc.localPlanningAuthority) {
        const lpaCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
        if (lpaCoords) {
          alloc.distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, lpaCoords.latitude, lpaCoords.longitude);
        }
      }
    }));
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
