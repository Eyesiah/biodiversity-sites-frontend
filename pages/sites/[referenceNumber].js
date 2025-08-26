import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import styles from '../../styles/SiteDetails.module.css';
import API_URL from '../../config';
import { fetchAllSites } from '../../lib/api';
import { getDistinctivenessMap } from '../../lib/habitat';

// This function tells Next.js which paths to pre-render at build time.
export async function getStaticPaths() {
  const sites = await fetchAllSites(1000);

  const paths = sites.map(site => ({
    params: { referenceNumber: site.referenceNumber },
  }));

  // fallback: 'blocking' means that if a path is not found,
  // Next.js will server-render it on the first request and then cache it.
  return { paths, fallback: 'blocking' };
}

const processHabitatDisplayTypes = (habitats) => {  
  habitats.forEach(habitat => {
      const typeParts = habitat.type.split(' - ');
      const lookupType = (typeParts.length > 1 ? typeParts[1] : habitat.type).trim();
      habitat.displayType = lookupType;
  });
}
const processAreaData = (areas) => {  
  processHabitatDisplayTypes(areas)
  areas.forEach(habitat => {
      const typeParts = habitat.type.split(' - ');
      const lookupType = (typeParts.length > 1 ? typeParts[1] : habitat.type).trim();
      habitat.displayType = lookupType;
  });
}

// This function fetches the data for a single site based on its reference number.
export async function getStaticProps({ params }) {
  try {
    // Fetch the data for the specific site.
    const res = await fetch(`${API_URL}/BiodiversityGainSites/${params.referenceNumber}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch site data, status: ${res.status}`);
    }

    const site = await res.json();

    if (!site) {
      // If the site is not found, return a 404 page.
      return { notFound: true };
    }

    const distinctivenessMap = getDistinctivenessMap();

    // Add distinctiveness and displayType to each baseline habitat
    if (site.habitats) {
      if (site.habitats.areas)
      {
        processAreaData(site.habitats.areas);
      }
      if (site.habitats.hedgerows)
      {
        processAreaData(site.habitats.hedgerows);
      }
      if (site.habitats.watercourses)
      {
        processAreaData(site.habitats.watercourses);
      }
    }
    
    // Add displayType to each habitat improvement
    if (site.improvements && site.improvements.areas) {
        processHabitatDisplayTypes(site.improvements.areas);
    }

    return {
      props: {
        site,
        error: null,
      },
      revalidate: 3600, // Re-generate the page at most once per hour
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
        const keyA = sortConfig.key === 'type' ? a.displayType : a[sortConfig.key];
        const keyB = sortConfig.key === 'type' ? b.displayType : b[sortConfig.key];

        if (keyA < keyB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (keyA > keyB) {
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
        displayType: habitat.displayType,
        distinctiveness: habitat.distinctiveness,
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

const HabitatSummary = ({ habitats }) => {
  const summary = habitats.reduce((acc, habitat) => {
    const key = habitat.type.split(' - ')[0];
    if (!acc[key]) {
      acc[key] = { area: 0, parcels: 0 };
    }
    acc[key].area += habitat.size;
    acc[key].parcels += 1;
    return acc;
  }, {});

  return (
    <table className={styles.subTable}>
      <thead>
        <tr>
          <th>Habitat</th>
          <th>Area (ha)</th>
          <th>Parcels</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(summary).map(([type, data], index) => (
          <tr key={index}>
            <td>{type}</td>
            <td>{data.area.toFixed(4)}</td>
            <td>{data.parcels}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
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
  const hasDistinctiveness = !isImprovement;

  return (
    <>
      <tr onClick={() => setIsOpen(!isOpen)} className={styles.clickableRow}>
        <td>{habitat.displayType}</td>
        {hasDistinctiveness && <td>{habitat.distinctiveness}</td>}
        <td>{habitat.parcels}</td>
        <td>{habitat.area.toFixed(4)}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={hasDistinctiveness ? 4 : 3}>
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

const getSortClassName = (name, sortConfig) => {
  if (!sortConfig) {
    return;
  }
  return sortConfig.key === name ? styles[sortConfig.direction] : undefined;
};

const BaselineHabitatTable = ({ title, habitats, requestSort, sortConfig }) => {

  if (!habitats || habitats.length == 0)
  {
    return null;
  }
  return <section className={styles.card}>
      <h3>Baseline {title}</h3>
      
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => requestSort('type')} className={getSortClassName('type', sortConfig)}>Habitat</th>
              <th onClick={() => requestSort('distinctiveness')} className={getSortClassName('distinctiveness', sortConfig)}>Distinctiveness</th>
              <th onClick={() => requestSort('parcels')} className={getSortClassName('parcels', sortConfig)}># parcels</th>
              <th onClick={() => requestSort('area')} className={getSortClassName('area', sortConfig)}>Area (ha)</th>
            </tr>
          </thead>
          <tbody>
            {habitats.map((habitat, index) => (
              <HabitatRow key={index} habitat={habitat} isImprovement={false} />
            ))}
          </tbody>
        </table>
      
    </section>
    
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

  const collatedBaselineAreas = collateHabitats(site.habitats?.areas, false);
  const collatedBaselineWatercourses = collateHabitats(site.habitats?.watercourses, false);
  const collatedBaselineHedgerows = collateHabitats(site.habitats?.hedgerows, false);
  const collatedImprovements = collateHabitats(site.improvements?.areas, true);

  const { items: sortedBaselineAreas, requestSort: requestSortBaselineAreas, sortConfig: sortConfigBaselineAreas } = useSortableData(collatedBaselineAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineWatercourses, requestSort: requestSortBaselineWatercourses, sortConfig: sortConfigBaselineWatercourses } = useSortableData(collatedBaselineWatercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineHedgerows, requestSort: requestSortBaselineHedgerows, sortConfig: sortConfigBaselineHedgerows } = useSortableData(collatedBaselineHedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovements, requestSort: requestSortImprovements, sortConfig: sortConfigImprovements } = useSortableData(collatedImprovements, { key: 'type', direction: 'ascending' });
  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(site.allocations || [], { key: 'planningReference', direction: 'ascending' });

  const planningApplications = new Set(site.allocations?.map(a => a.planningReference)).size;

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
              <DetailRow label="BGS Reference" value={site.referenceNumber} />
              <DetailRow label="Responsible Bodies" value={site.responsibleBodies?.join(', ') || 'N/A'} />
              <DetailRow label="Start Date" value={site.startDate ? new Date(site.startDate).toLocaleDateString('en-GB') : 'N/A'} />
              <DetailRow label="Location" value={`${site.latitude}, ${site.longitude}`} />
              <DetailRow label="Map" value={<a href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`} target="_blank" rel="noreferrer">View on Google Maps</a>} />
              <DetailRow label="NCA" value={site.nationalCharacterArea?.name || 'N/A'} />
              <DetailRow label="LPA" value={site.lpaArea?.name || 'N/A'} />
              <DetailRow label="# Allocations" value={site.allocations?.length || 0} />
              <DetailRow label="# Planning applications" value={planningApplications} />
              <DetailRow label="Site Area" value={`${site.siteSize?.toFixed(4)} ha.`} />
            </dl>
            <h4>Habitat Summary</h4>
            <HabitatSummary habitats={site.habitats?.areas} />
            <h4>Habitat Units</h4>
            <p>Habitat Units (HUs) are calculated as: HU = Habitat area/length x Distinctiveness x Condition x Strategic Significance.</p>
            <p>The data required to calculate the HUs (Distinctiveness and Strategic Significance) is not available in the API.</p>
          </section>

          <BaselineHabitatTable
            title="Areas"
            habitats={sortedBaselineAreas}
            requestSort={requestSortBaselineAreas}
            sortConfig={sortConfigBaselineAreas}
          />

          <BaselineHabitatTable
            title="Watercourses"
            habitats={sortedBaselineWatercourses}
            requestSort={requestSortBaselineWatercourses}
            sortConfig={sortConfigBaselineWatercourses}
          />

          <BaselineHabitatTable
            title="Hedgerows"
            habitats={sortedBaselineHedgerows}
            requestSort={requestSortBaselineHedgerows}
            sortConfig={sortConfigBaselineHedgerows}
          />

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
                    <HabitatRow key={index} habitat={habitat} isImprovement={true} />
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
