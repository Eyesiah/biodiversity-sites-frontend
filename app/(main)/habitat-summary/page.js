import { fetchAllSites } from '@/lib/api';
import SearchableHabitatLists from './SearchableHabitatLists';
import styles from '@/styles/SiteDetails.module.css';
import Footer from '@/components/Footer';
import { collateAllHabitats } from '@/lib/habitat';
import { HabitatSummaryTable } from '@/components/HabitatSummaryTable';
import { DetailRow } from '@/components/DetailRow';
import { formatNumber } from '@/lib/format';
import { processSitesForListView} from '@/lib/sites';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export const metadata = {
  title: 'BGS habitat summary',
};


export default async function HabitatSummaryPage() {
  const lastUpdated = Date.now();
  const allSites = await fetchAllSites({ next: { revalidate: 3600 } });

  const allHabitats = {
    areas: [],
    hedgerows: [],
    watercourses: []
  }
  const allImprovements = {
    areas: [],
    hedgerows: [],
    watercourses: []
  }

  let totalSize = 0
  allSites.forEach(site => {

    totalSize += site.siteSize;

    if (site.habitats) {
      if (site.habitats.areas) {
        site.habitats.areas.forEach(h => h.site = site.referenceNumber);
        allHabitats.areas.push(...site.habitats.areas);
      }
      if (site.habitats.hedgerows) {
        site.habitats.hedgerows.forEach(h => h.site = site.referenceNumber);
        allHabitats.hedgerows.push(...site.habitats.hedgerows);
      }
      if (site.habitats.watercourses) {
        site.habitats.watercourses.forEach(h => h.site = site.referenceNumber);
        allHabitats.watercourses.push(...site.habitats.watercourses);
      }
    }
    if (site.improvements) {
      if (site.improvements.areas) {
        site.improvements.areas.forEach(h => h.site = site.referenceNumber);
        allImprovements.areas.push(...site.improvements.areas);
      }
      if (site.improvements.hedgerows) {
        site.improvements.hedgerows.forEach(h => h.site = site.referenceNumber);
        allImprovements.hedgerows.push(...site.improvements.hedgerows);
      }
      if (site.improvements.watercourses) {
        site.improvements.watercourses.forEach(h => h.site = site.referenceNumber);
        allImprovements.watercourses.push(...site.improvements.watercourses);
      }
    }
  });

  const collatedHabitats = collateAllHabitats(allHabitats, false);
  const collatedImprovements = collateAllHabitats(allImprovements, true);

  const HabitatSummarySection = (allSites) => {
    
    return (    
      <div className={styles.detailsGrid}>

        <section className={styles.card}>
          <h3>BGS Register Summary</h3>

          <div>
            <DetailRow label="Number of BGS sites" value={allSites.length} />
            <DetailRow label="Total BGS site area (ha)" value={formatNumber(totalSize)} />
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Habitat Summary</dt>
              <dd className={styles.detailValue}>
                <HabitatSummaryTable site={{ habitats: collatedHabitats, improvements: collatedImprovements, allocations: allSites.flatMap(s => s.allocations || []) }} />
              </dd>
            </div>
          </div>

        </section>
      </div>
    )
  }

  const processedSites = processSitesForListView(allSites);
  const sitesMap = processedSites.reduce((acc, site) => {
    acc[site.referenceNumber] = site;
    return acc;
  }, {});

  return (
    <>
      <div className={styles.container}>
        <SearchableHabitatLists summary={HabitatSummarySection(allSites)} habitats={collatedHabitats} improvements={collatedImprovements} sites={sitesMap} />
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  )
}