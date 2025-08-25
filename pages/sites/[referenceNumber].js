import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo } from 'react';
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
    // Fetch the data for the specific site.
    const res = await fetch(`https://wa-trees-api-f9evhdfhaufacsdq.ukwest-01.azurewebsites.net/BiodiversityGainSites/${params.referenceNumber}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch site data, status: ${res.status}`);
    }

    const site = await res.json();

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

const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

// Helper function to collate habitat data
const collateHabitats = (habitats, isImprovement) => {
  if (!habitats) return [];

  const collated = habitats.reduce((acc, habitat) => {
    const key = habitat.type;
    if (!acc[key]) {
      acc[key] = {
        type: habitat.type,
        parcels: 0,
        area: 0,
        subRows: {},
      };
    }
    acc[key].parcels += 1;
    acc[key].area += habitat.size;

    const subKey = isImprovement ? `${habitat.interventionType}-${habitat.condition}` : habitat.condition;
    if (!acc[key].subRows[subKey]) {
      acc[key].subRows[subKey] = {
        condition: habitat.condition,
        interventionType: habitat.interventionType,
        parcels: 0,
        area: 0,
      };
    }
    acc[key].subRows[subKey].parcels += 1;
    acc[key].subRows[subKey].area += habitat.size;

    return acc;
  }, {});

  return Object.values(collated).map(habitat => ({
    ...habitat,
    subRows: Object.values(habitat.subRows),
  }));
};

// Helper component for a detail row to keep the JSX clean.
const DetailRow = ({ label, value }) => (
  <div className={styles.detailRow}>
    <dt className={styles.detailLabel}>{label}</dt>
    <dd className={styles.detailValue}>{value}</dd>
  </div>
);

const HabitatRow = ({ habitat, isImprovement }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <tr onClick={() => setIsOpen(!isOpen)} className={styles.clickableRow}>
        <td>{habitat.type}</td>
        <td>{habitat.parcels}</td>
        <td>{habitat.area.toFixed(4)}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={3}>
            <table className={styles.subTable}>
              <thead>
                <tr>
                  {isImprovement && <th>Intervention</th>}
                  <th>Condition</th>
                  <th># parcels</th>
                  <th>Area (ha)</th>
                </tr>
              </thead>
              <tbody>
                {habitat.subRows.map((subRow, index) => (
                  <tr key={index}>
                    {isImprovement && <td>{subRow.interventionType}</td>}
                    <td>{subRow.condition}</td>
                    <td>{subRow.parcels}</td>
                    <td>{subRow.area.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
};

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

  const collatedBaseline = collateHabitats(site.habitats?.areas, false);
  const collatedImprovements = collateHabitats(site.improvements?.areas, true);

  const { items: sortedBaseline, requestSort: requestSortBaseline, sortConfig: sortConfigBaseline } = useSortableData(collatedBaseline, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovements, requestSort: requestSortImprovements, sortConfig: sortConfigImprovements } = useSortableData(collatedImprovements, { key: 'type', direction: 'ascending' });
  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(site.allocations || [], { key: 'planningReference', direction: 'ascending' });

  const getSortClassName = (name, sortConfig) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === name ? styles[sortConfig.direction] : undefined;
  };

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
            <h3>Baseline Habitats</h3>
            {sortedBaseline.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => requestSortBaseline('type')} className={getSortClassName('type', sortConfigBaseline)}>Habitat</th>
                    <th onClick={() => requestSortBaseline('parcels')} className={getSortClassName('parcels', sortConfigBaseline)}># parcels</th>
                    <th onClick={() => requestSortBaseline('area')} className={getSortClassName('area', sortConfigBaseline)}>Area (ha)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBaseline.map((habitat, index) => (
                    <HabitatRow key={index} habitat={habitat} />
                  ))}
                </tbody>
              </table>
            ) : <p>No baseline habitat information available.</p>}
          </section>

          <section className={styles.card}>
            <h3>Habitat Improvements</h3>
            {sortedImprovements.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => requestSortImprovements('type')} className={getSortClassName('type', sortConfigImprovements)}>Habitat</th>
                    <th onClick={() => requestSortImprovements('parcels')} className={getSortClassName('parcels', sortConfigImprovements)}># parcels</th>
                    <th onClick={() => requestSortImprovements('area')} className={getSortClassName('area', sortConfigImprovements)}>Area (ha)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedImprovements.map((habitat, index) => (
                    <HabitatRow key={index} habitat={habitat} isImprovement />
                  ))}
                </tbody>
              </table>
            ) : <p>No habitat improvement information available.</p>}
          </section>

          <section className={styles.card}>
            <h3>Allocations</h3>
            {sortedAllocations.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => requestSortAllocations('planningReference')} className={getSortClassName('planningReference', sortConfigAllocations)}>Reference</th>
                    <th onClick={() => requestSortAllocations('localPlanningAuthority')} className={getSortClassName('localPlanningAuthority', sortConfigAllocations)}>LPA</th>
                    <th onClick={() => requestSortAllocations('distance')} className={getSortClassName('distance', sortConfigAllocations)}>Distance (km)</th>
                    <th onClick={() => requestSortAllocations('projectName')} className={getSortClassName('projectName', sortConfigAllocations)}>Address</th>
                    <th onClick={() => requestSortAllocations('areaUnits')} className={getSortClassName('areaUnits', sortConfigAllocations)}>Area units</th>
                    <th onClick={() => requestSortAllocations('hedgerowUnits')} className={getSortClassName('hedgerowUnits', sortConfigAllocations)}>Hedgerow units</th>
                    <th onClick={() => requestSortAllocations('watercoursesUnits')} className={getSortClassName('watercoursesUnits', sortConfigAllocations)}>Watercourse units</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAllocations.map((alloc, index) => (
                    <tr key={index}>
                      <td>{alloc.planningReference}</td>
                      <td>{alloc.localPlanningAuthority}</td>
                      <td>{"WIP"}</td>
                      <td>{alloc.projectName}</td>
                      <td>{alloc.areaUnits}</td>
                      <td>{alloc.hedgerowUnits}</td>
                      <td>{alloc.watercoursesUnits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p>No allocation information available.</p>}
          </section>
        </div>
      </main>
    </>
  );
}