import { fetchAllSites } from '@/lib/api';
import SearchableHabitatLists from './SearchableHabitatLists';
import { HabitatSummaryTable } from '@/components/HabitatSummaryTable';
import { DetailRow } from '@/components/DetailRow';
import { formatNumber } from '@/lib/format';
import styles from '@/styles/SiteDetails.module.css';
import Footer from '@/components/Footer';
import { collateHabitats } from '@/lib/habitat';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

export const metadata = {
  title: 'Habitat Summary',
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
        allHabitats.areas.push(...site.habitats.areas);
      }
      if (site.habitats.hedgerows) {
        allHabitats.hedgerows.push(...site.habitats.hedgerows);
      }
      if (site.habitats.watercourses) {
        allHabitats.watercourses.push(...site.habitats.watercourses);
      }
    }
    if (site.improvements) {
      if (site.improvements.areas) {
        allImprovements.areas.push(...site.improvements.areas);
      }
      if (site.improvements.hedgerows) {
        allImprovements.hedgerows.push(...site.improvements.hedgerows);
      }
      if (site.improvements.watercourses) {
        allImprovements.watercourses.push(...site.improvements.watercourses);
      }
    }
  });

  const collateAllHabitats = (habObj, isImprovement) => {
    return {
      areas: collateHabitats(habObj.areas, isImprovement),
      hedgerows: collateHabitats(habObj.hedgerows, isImprovement),
      watercourses: collateHabitats(habObj.watercourses, isImprovement)
    }
  }

  return (
    <>
      <main className={styles.container}>
        <h1 className="title" style={{ textAlign: 'center', marginBottom: '1rem' }}>Habitats Summary</h1>

        <div className={styles.detailsGrid}>

          <section className={styles.card}>
            <h3>BGS Register Summary</h3>

            <div>
              <DetailRow label="Number of BGS sites" value={allSites.length} />
              <DetailRow label="Total BGS site area (ha)" value={formatNumber(totalSize)} />
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>Habitat Summary</dt>
                <dd className={styles.detailValue}>
                  <HabitatSummaryTable site={{ habitats: allHabitats, improvements: allImprovements, allocations: allSites.flatMap(s => s.allocations || []) }} />
                </dd>
              </div>
            </div>

          </section>
        </div>
        <SearchableHabitatLists habitats={collateAllHabitats(allHabitats, false)} improvements={collateAllHabitats(allImprovements, true)} />
      </main>
      <Footer lastUpdated={lastUpdated} />
    </>
  )
}