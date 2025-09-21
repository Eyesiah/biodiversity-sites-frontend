import Head from 'next/head';
import styles from '@/styles/SiteDetails.module.css';
import { fetchSite, fetchAllSites } from '@/lib/api';
import { getDistanceFromLatLonInKm, getCoordinatesForAddress, getCoordinatesForLPA } from '@/lib/geo';
import { collateAllHabitats } from '@/lib/habitat';
import SitePageContent from './SitePageContent'

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export async function generateStaticParams() {

  const sites = await fetchAllSites();
  const paths = sites.map(site => {
     return {referenceNumber: site.referenceNumber};
  });

  return paths;
}

export default async function SitePage({params}) {

  const { referenceNumber } = await params;

  const site = await fetchSite(referenceNumber, true)
  if (!site)
  {
    return (
        <main className={styles.container}>
          <p>Site not found</p>
        </main>);
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
      <Head>
        <title>{`BGS Details: ${site.referenceNumber}`}</title>
        <meta name="description" content={`Details for Biodiversity Gain Site ${site.referenceNumber}`}/>
      </Head>

      <main className={styles.container}>
        <SitePageContent site={site}/>
      </main>
    </>
  );
}
