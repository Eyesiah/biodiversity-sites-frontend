import { fetchSite, fetchAllRefNos } from '@/lib/api';
import { collateAllHabitats } from '@/lib/habitat';
import { getHabitatSankeyGraph, isIndividualTree } from '@/lib/sites'
import SitePageContent from './SitePageContent'
import Footer from '@/components/core/Footer';

export const revalidate = 21600; // 6 hours


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

  site.habitats = collateAllHabitats(site.habitats, false);
  site.improvements = collateAllHabitats(site.improvements, true);

  site.habitats.trees = site.habitats.areas.filter(h => isIndividualTree(h));
  site.improvements.trees = site.improvements.areas.filter(h => isIndividualTree(h));
  site.habitats.areas = site.habitats.areas.filter(h => !isIndividualTree(h));
  site.improvements.areas = site.improvements.areas.filter(h => !isIndividualTree(h));

  const sankeyData = getHabitatSankeyGraph(site);

  return (
    <>
      <SitePageContent site={site} sankeyData={sankeyData} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
