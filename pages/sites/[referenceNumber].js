import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/SiteDetails.module.css';

// This function tells Next.js which paths to pre-render at build time.
export async function getStaticPaths() {
  const res = await fetch(
    'https://wa-trees-api-f9evhdfhaufacsdq.ukwest-01.azurewebsites.net/BiodiversityGainSites',
    { next: { revalidate: 3600 } } // Cache paths for an hour
  );
  const data = await res.json();

  const paths = data.sites.map(site => ({
    params: { referenceNumber: site.referenceNumber },
  }));

  // fallback: 'blocking' means that if a path is not found,
  // Next.js will server-render it on the first request and then cache it.
  return { paths, fallback: 'blocking' };
}

// This function fetches the data for a single site based on its reference number.
export async function getStaticProps({ params }) {
  try {
    // Fetch the entire list of sites. Next.js will automatically dedupe this
    // request with the one made in getStaticPaths during a build.
    const res = await fetch('https://wa-trees-api-f9evhdfhaufacsdq.ukwest-01.azurewebsites.net/BiodiversityGainSites');

    if (!res.ok) {
      throw new Error(`Failed to fetch site data, status: ${res.status}`);
    }

    const data = await res.json();

    // Find the specific site from the list.
    const site = data.sites.find(s => s.referenceNumber === params.referenceNumber);

    if (!site) {
      // If the site is not found, return a 404 page.
      return { notFound: true };
    }

    return {
      props: {
        site,
        error: null,
      },
      revalidate: 60, // Re-generate the page at most once every 60 seconds
    };
  } catch (e) {
    console.error(e);
    return {
      props: {
        site: null,
        error: e.message,
      },
    };
  }
}

// Helper component for a detail row to keep the JSX clean.
const DetailRow = ({ label, value }) => (
  <div className={styles.detailRow}>
    <dt className={styles.detailLabel}>{label}</dt>
    <dd className={styles.detailValue}>{value}</dd>
  </div>
);

export default function SitePage({ site, error }) {
  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>Error: {error}</p>
        <Link href="/">Back to list</Link>
      </div>
    );
  }

  if (!site) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`BGS Details: ${site.referenceNumber}`}</title>
        <meta name="description" content={`Details for Biodiversity Gain Site ${site.referenceNumber}`}/>
      </Head>

      <main className={styles.container}>
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>&larr; Back to Site List</Link>
          <h1>Biodiversity Gain Site</h1>
          <h2>{site.referenceNumber}</h2>
        </div>

        <div className={styles.detailsGrid}>
          <section className={styles.card}>
            <h3>Site Details</h3>
            <dl>
              <DetailRow label="Site Name" value={site.siteName || 'N/A'} />
              <DetailRow label="LPA" value={site.lpaArea?.name || 'N/A'} />
              <DetailRow label="NCA" value={site.nationalCharacterArea?.name || 'N/A'} />
              <DetailRow label="Area (ha)" value={site.siteSize?.toFixed(4) || 'N/A'} />
              <DetailRow label="Site Condition" value={site.siteCondition || 'N/A'} />
            </dl>
          </section>

          <section className={styles.card}>
            <h3>Allocations</h3>
            {site.allocations && site.allocations.length > 0 ? (
              site.allocations.map((alloc, index) => (
                <div key={index} className={styles.allocationItem}>
                  <dl>
                    <DetailRow label="Reference" value={alloc.planningReference} />
                    <DetailRow label="LPA" value={alloc.localPlanningAuthority} />
                    <DetailRow label="Distance (km)" value={"WIP"} />
                    <DetailRow label="Address" value={alloc.projectName} />
                    <DetailRow label="Area units" value={alloc.areaUnits} />
                    <DetailRow label="Hedgerow units" value={alloc.hedgerowUnits} />
                    <DetailRow label="Watercourse units" value={alloc.watercoursesUnits} />
                  </dl>
                </div>
              ))
            ) : <p>No allocation information available.</p>}
          </section>
        </div>
      </main>
    </>
  );
}