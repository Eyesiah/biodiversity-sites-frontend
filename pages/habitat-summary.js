
import Head from 'next/head';
import { fetchAllSites } from '../lib/api';
import styles from '../styles/SiteDetails.module.css';
import { HabitatsCard } from '../components/HabitatsCard';
import { HabitatSummaryTable } from '../components/HabitatSummaryTable';
import { processSiteHabitatData } from "../lib/habitat"
import { DetailRow } from '../components/DetailRow';

export async function getStaticProps() {
  
  const allSites = await fetchAllSites();

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

  allSites.forEach(site => {
    processSiteHabitatData(site)
    if (site.habitats) {
      if (site.habitats.areas)
      {
        allHabitats.areas.push(...site.habitats.areas);
      }
      if (site.habitats.hedgerows)
      {
        allHabitats.hedgerows.push(...site.habitats.hedgerows);
      }
      if (site.habitats.watercourses)
      {
        allHabitats.watercourses.push(...site.habitats.watercourses);
      }
    }
    if (site.improvements) {
      if (site.improvements.areas)
      {
        allImprovements.areas.push(...site.improvements.areas);
      }
      if (site.improvements.hedgerows)
      {
        allImprovements.hedgerows.push(...site.improvements.hedgerows);
      }
      if (site.improvements.watercourses)
      {
        allImprovements.watercourses.push(...site.improvements.watercourses);
      }
    }
  });


  return {
    props: {
      numSites: allSites.length,
      habitats: allHabitats,
      improvements: allImprovements,
      summary: {}
    }
  };
}

export default function HabitatSummary({numSites, habitats, improvements}) {
  return (
    <>
      <Head>
        <title>Habitat Summary</title>
      </Head>

      <main className={styles.container}>        
        <div className={styles.header}>
          <h1>Habitat Summary</h1>
        </div>

        <div className={styles.detailsGrid}>

          <section className={styles.card}>
            <h3>BGS Register Summary</h3>
                
            <div>
              <DetailRow label="Number of sites" value={numSites} />
              <div className={styles.detailRow}>
                <dt className={styles.detailLabel}>Habitat Summary</dt>
                <dd className={styles.detailValue}>
                  <HabitatSummaryTable site={{habitats: habitats, improvements: improvements}} />
                </dd>
              </div>
            </div>
              
          </section>

          <HabitatsCard
            title="Baseline Habitats (click any habitat cell for more detail)"
            habitats = {habitats}
            isImprovement={false}
          />

          <HabitatsCard
            title="Improvement Habitats (click any habitat cell for more detail)"
            habitats = {improvements}
            isImprovement={true}
          />
        </div>

      </main>
    </>
  );
}
