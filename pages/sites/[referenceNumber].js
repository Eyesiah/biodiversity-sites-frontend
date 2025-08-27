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

const processHabitatSubTypes = (habitats) => {  
  habitats.forEach(habitat => {
      const typeParts = habitat.type.split(' - ');
      habitat.type = (typeParts.length > 1 ? typeParts[1] : habitat.type).trim();
  });
}
const processAreaData = (areas, distinctivenessMap) => {  
  areas.forEach(habitat => {      
      habitat.distinctiveness = distinctivenessMap.get(habitat.type) || 'N/A';
  });
}

// This function fetches the data for a single site based on its reference number.
export async function getStaticProps({ params }) {
  const distinctivenessMap = getDistinctivenessMap();
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

    // Add distinctiveness to each baseline habitat
    if (site.habitats) 
    {
      if (site.habitats.areas)
      {
        // areas first need their sub-type processed out
        processHabitatSubTypes(site.habitats.areas)
        processAreaData(site.habitats.areas, distinctivenessMap);
      }
      if (site.habitats.hedgerows)
      {
        processAreaData(site.habitats.hedgerows, distinctivenessMap);
      }
      if (site.habitats.watercourses)
      {
        processAreaData(site.habitats.watercourses, distinctivenessMap);
      }
    }
    
    if (site.improvements?.areas)
    {      
      // areas need their sub-type processed out
      processHabitatSubTypes(site.improvements.areas);
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
        const keyA = sortConfig.key === 'type' ? a.type : a[sortConfig.key];
        const keyB = sortConfig.key === 'type' ? b.type : b[sortConfig.key];

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

const HabitatSummary = ({ site }) => {
  const habitats = site.habitats || {};
  const improvements = site.improvements || {};
  const allocations = site.allocations || [];

  const baselineArea = (habitats.areas || []).reduce((acc, h) => acc + h.size, 0);
  const baselineHedgerow = (habitats.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const baselineWatercourse = (habitats.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const improvementArea = (improvements.areas || []).reduce((acc, h) => acc + h.size, 0);
  const improvementHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const improvementWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const allocationArea = allocations.reduce((acc, a) => acc + a.areaUnits, 0);
  const allocationHedgerow = allocations.reduce((acc, a) => acc + a.hedgerowUnits, 0);
  const allocationWatercourse = allocations.reduce((acc, a) => acc + a.watercoursesUnits, 0);

  return (
    <table className={styles.subTable}>
      <thead>
        <tr>
          <th>Habitat</th>
          <th>Baseline</th>
          <th>Improvements</th>
          <th>Allocations</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Areas (ha)</td>
          <td className={styles.numericData}>{baselineArea.toFixed(4)}</td>
          <td className={styles.numericData}>{improvementArea.toFixed(4)}</td>
          <td className={styles.numericData}>{allocationArea.toFixed(4)}</td>
        </tr>
        <tr>
          <td>Hedgerows (km)</td>
          <td className={styles.numericData}>{baselineHedgerow.toFixed(4)}</td>
          <td className={styles.numericData}>{improvementHedgerow.toFixed(4)}</td>
          <td className={styles.numericData}>{allocationHedgerow.toFixed(4)}</td>
        </tr>
        <tr>
          <td>Watercourses (km)</td>
          <td className={styles.numericData}>{baselineWatercourse.toFixed(4)}</td>
          <td className={styles.numericData}>{improvementWatercourse.toFixed(4)}</td>
          <td className={styles.numericData}>{allocationWatercourse.toFixed(4)}</td>
        </tr>
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
        <td>{habitat.type}</td>
        {hasDistinctiveness && <td>{habitat.distinctiveness}</td>}
        <td className={styles.numericData}>{habitat.parcels}</td>
        <td className={styles.numericData}>{habitat.area.toFixed(4)}</td>
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
                    <td className={styles.numericData}>{subRow.parcels}</td>
                    <td className={styles.numericData}>{subRow.area.toFixed(4)}</td>
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

const BaselineHabitatTable = ({ title, habitats, requestSort, sortConfig, isImprovement }) => {

  if (!habitats || habitats.length == 0)
  {
    return null;
  }
  return <section className={styles.card}>
      <h3>{title}</h3>
      
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => requestSort('type')} className={getSortClassName('type', sortConfig)}>Habitat</th>
              {!isImprovement && <th onClick={() => requestSort('distinctiveness')} className={getSortClassName('distinctiveness', sortConfig)}>Distinctiveness</th>}
              <th onClick={() => requestSort('parcels')} className={getSortClassName('parcels', sortConfig)}># parcels</th>
              <th onClick={() => requestSort('area')} className={getSortClassName('area', sortConfig)}>Area (ha)</th>
            </tr>
          </thead>
          <tbody>
            {habitats.map((habitat, index) => (
              <HabitatRow key={index} habitat={habitat} isImprovement={isImprovement} />
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
  
  const collatedImprovementAreas = collateHabitats(site.improvements?.areas, true);
  const collatedImprovementWatercourses = collateHabitats(site.improvements?.watercourses, true);
  const collatedImprovementHedgerows = collateHabitats(site.improvements?.hedgerows, true);

  const { items: sortedBaselineAreas, requestSort: requestSortBaselineAreas, sortConfig: sortConfigBaselineAreas } = useSortableData(collatedBaselineAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineWatercourses, requestSort: requestSortBaselineWatercourses, sortConfig: sortConfigBaselineWatercourses } = useSortableData(collatedBaselineWatercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedBaselineHedgerows, requestSort: requestSortBaselineHedgerows, sortConfig: sortConfigBaselineHedgerows } = useSortableData(collatedBaselineHedgerows, { key: 'type', direction: 'ascending' });
  
  const { items: sortedImprovementAreas, requestSort: requestSortImprovementAreas, sortConfig: sortConfigImprovementAreas } = useSortableData(collatedImprovementAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementWatercourses, requestSort: requestSortImprovementWatercourses, sortConfig: sortConfigImprovementWatercourses } = useSortableData(collatedImprovementWatercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedImprovementHedgerows, requestSort: requestSortImprovementHedgerows, sortConfig: sortConfigImprovementHedgerows } = useSortableData(collatedImprovementHedgerows, { key: 'type', direction: 'ascending' });

  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(site.allocations || [], { key: 'planningReference', direction: 'ascending' });

  const planningApplications = new Set(site.allocations?.map(a => a.planningReference)).size;

  const hasBaseline = sortedBaselineAreas.length > 0 || sortedBaselineWatercourses.length > 0 || sortedBaselineHedgerows.length > 0;
  const hasImprovements = sortedImprovementAreas.length > 0 || sortedImprovementWatercourses.length > 0 || sortedImprovementHedgerows.length > 0;


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
            <HabitatSummary site={site} />
          </section>

          {hasBaseline && <section className={styles.card}>
            <h3>Baseline</h3>
            <BaselineHabitatTable
              title="Areas"
              habitats={sortedBaselineAreas}
              requestSort={requestSortBaselineAreas}
              sortConfig={sortConfigBaselineAreas}
              isImprovement={false}
            />

            <BaselineHabitatTable
              title="Watercourses"
              habitats={sortedBaselineWatercourses}
              requestSort={requestSortBaselineWatercourses}
              sortConfig={sortConfigBaselineWatercourses}
              isImprovement={false}
            />

            <BaselineHabitatTable
              title="Hedgerows"
              habitats={sortedBaselineHedgerows}
              requestSort={requestSortBaselineHedgerows}
              sortConfig={sortConfigBaselineHedgerows}
              isImprovement={false}
            />
          </section>}

          {hasImprovements && <section className={styles.card}>
            <h3>Improvements</h3>
            <BaselineHabitatTable
              title="Areas"
              habitats={sortedImprovementAreas}
              requestSort={requestSortImprovementAreas}
              sortConfig={sortConfigImprovementAreas}
              isImprovement={true}
            />

            <BaselineHabitatTable
              title="Watercourses"
              habitats={sortedImprovementWatercourses}
              requestSort={requestSortImprovementWatercourses}
              sortConfig={sortConfigImprovementWatercourses}
              isImprovement={true}
            />

            <BaselineHabitatTable
              title="Hedgerows"
              habitats={sortedImprovementHedgerows}
              requestSort={requestSortImprovementHedgerows}
              sortConfig={sortConfigImprovementHedgerows}
              isImprovement={true}
            />
          </section>}

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
                      <td className={styles.numericData}>{alloc.areaUnits}</td>
                      <td className={styles.numericData}>{alloc.hedgerowUnits}</td>
                      <td className={styles.numericData}>{alloc.watercoursesUnits}</td>
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
