import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import styles from '../../styles/SiteDetails.module.css';
import API_URL from '../../config';
import { fetchAllSites } from '../../lib/api';
import { getHabitatDistinctiveness, calculateBaselineHU } from '../../lib/habitat';
import ExternalLink from '../../components/ExternalLink';

const DEFAULT_NUMERIC_NUM_DECIMALS = 2

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

const processBaselineHabitats = (habitats) => {  
  // baseline habitats need their distinctiveness rating gathered and HUs calculated
  habitats.forEach(habitat => {      
      habitat.distinctiveness = getHabitatDistinctiveness(habitat.type);
      habitat.HUs = calculateBaselineHU(habitat.size, habitat.distinctiveness, habitat.condition)
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

    // Add distinctiveness to each baseline habitat
    if (site.habitats) 
    {
      if (site.habitats.areas)
      {
        // areas first need their sub-type processed out
        processHabitatSubTypes(site.habitats.areas)
        processBaselineHabitats(site.habitats.areas);
      }
      if (site.habitats.hedgerows)
      {
        processBaselineHabitats(site.habitats.hedgerows);
      }
      if (site.habitats.watercourses)
      {
        processBaselineHabitats(site.habitats.watercourses);
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
        HUs: 0,
        subRows: {},
      };
    }
    acc[key].parcels += 1;
    acc[key].area += habitat.size;
    acc[key].HUs += habitat.HUs;

    const subKey = isImprovement ? `${habitat.interventionType}-${habitat.condition}` : habitat.condition;
    if (!acc[key].subRows[subKey]) {
      acc[key].subRows[subKey] = {
        condition: habitat.condition,
        interventionType: habitat.interventionType,
        parcels: 0,
        area: 0,
        HUs: 0,
      };
    }
    acc[key].subRows[subKey].parcels += 1;
    acc[key].subRows[subKey].area += habitat.size;
    acc[key].subRows[subKey].HUs += habitat.HUs;

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

  const baselineAreaHUs = (habitats.areas || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineHedgerowHUs = (habitats.hedgerows || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineWatercourseHUs = (habitats.watercourses || []).reduce((acc, h) => acc + h.HUs, 0);

  const improvementArea = (improvements.areas || []).reduce((acc, h) => acc + h.size, 0);
  const improvementHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const improvementWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const allocationArea = allocations.reduce((acc, a) => acc + a.areaUnits, 0);
  const allocationHedgerow = allocations.reduce((acc, a) => acc + a.hedgerowUnits, 0);
  const allocationWatercourse = allocations.reduce((acc, a) => acc + a.watercoursesUnits, 0);

  return (
    <table className={`${styles.subTable} ${styles.inlineTable}`}>
      <thead>
        <tr>
          <th>Habitat</th>
          <th>Baseline Size</th>
          <th>Baseline HUs</th>
          <th>Improvements Size</th>
          <th>Allocations Size</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Areas (ha)</td>
          <td className={styles.numericData}>{baselineArea.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{baselineAreaHUs.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{improvementArea.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{allocationArea.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
        </tr>
        <tr>
          <td>Hedgerows (km)</td>
          <td className={styles.numericData}>{baselineHedgerow.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{baselineHedgerowHUs.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{improvementHedgerow.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{allocationHedgerow.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
        </tr>
        <tr>
          <td>Watercourses (km)</td>
          <td className={styles.numericData}>{baselineWatercourse.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{baselineWatercourseHUs.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{improvementWatercourse.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
          <td className={styles.numericData}>{allocationWatercourse.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
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

const SiteDetailsCard = ({site}) => {
  return <section className={styles.card}>
    <h3>Site Details</h3>
    <div>
      <DetailRow label="BGS Reference" value={<ExternalLink href={`https://environment.data.gov.uk/biodiversity-net-gain/search/${site.referenceNumber}`}>{site.referenceNumber}</ExternalLink>} />
      <DetailRow label="Responsible Bodies" value={site.responsibleBodies?.join(', ') || 'N/A'} />
      <DetailRow label="Start Date" value={site.startDate ? new Date(site.startDate).toLocaleDateString('en-GB') : 'N/A'} />
      <DetailRow label="Location (Lat/Long)" value={`${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}`} />
      <DetailRow label="Map" value={<ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}>View on Google Maps</ExternalLink>} />
      <DetailRow label="NCA" value={site.nationalCharacterArea?.name || 'N/A'} />
      <DetailRow label="LPA" value={site.lpaArea?.name || 'N/A'} />
      <DetailRow label="# Allocations" value={site.allocations?.length || 0} />
      <DetailRow label="# Planning applications" value={site.allocations?.length || 0} />
      <DetailRow label="Site Area" value={`${site.siteSize?.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)} ha.`} />
      <div className={styles.detailRow}>
        <dt className={styles.detailLabel}>Habitat Summary</dt>
        <dd className={styles.detailValue}>
          <HabitatSummary site={site} />
        </dd>
      </div>
    </div>
  </section>
}


const HabitatRow = ({ habitat, isImprovement }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasDistinctiveness = !isImprovement;

  return (
    <>
      <tr onClick={() => setIsOpen(!isOpen)} className={styles.clickableRow}>
        <td>{habitat.type}</td>
        {hasDistinctiveness && <td>{habitat.distinctiveness}</td>}
        <td className={styles.numericData}>{habitat.parcels}</td>
        <td className={styles.numericData}>{habitat.area.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
        <td className={styles.numericData}>{habitat.HUs ? habitat.HUs.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS) : 0}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={hasDistinctiveness ? 5 : 4}>
            <table className={styles.subTable}>
              <thead>
                <tr>
                  {isImprovement && <th>Intervention</th>}
                  <th>Condition</th>
                  <th># parcels</th>
                  <th>Area (ha)</th>
                  <th>HUs</th>
                </tr>
              </thead>
              <tbody>
                {habitat.subRows.map((subRow, index) => (
                  <tr key={index}>
                    {isImprovement && <td>{subRow.interventionType}</td>}
                    <td>{subRow.condition}</td>
                    <td className={styles.numericData}>{subRow.parcels}</td>
                    <td className={styles.numericData}>{subRow.area.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
                    <td className={styles.numericData}>{subRow.HUs ? subRow.HUs.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS) : 0}</td>
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

const HabitatTable = ({ title, habitats, requestSort, sortConfig, isImprovement }) => {

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
              <th onClick={() => requestSort('HUs')} className={getSortClassName('HUs', sortConfig)}>HUs</th>
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

const HabitatsCard = ({title, habitats, isImprovement}) => {
  const [isOpen, setIsOpen] = useState(true);

  const collatedAreas = collateHabitats(habitats?.areas, isImprovement);
  const collatedWatercourses = collateHabitats(habitats?.watercourses, isImprovement);
  const collatedHedgerows = collateHabitats(habitats?.hedgerows, isImprovement);
  
  const { items: sortedAreas, requestSort: requestSortAreas, sortConfig: sortConfigAreas } = useSortableData(collatedAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedWatercourses, requestSort: requestSortWatercourses, sortConfig: sortConfigWatercourses } = useSortableData(collatedWatercourses, { key: 'type', direction: 'ascending' });
  const { items: sortedHedgerows, requestSort: requestSortHedgerows, sortConfig: sortConfigHedgerows } = useSortableData(collatedHedgerows, { key: 'type', direction: 'ascending' });
  
  const hasHabitats = sortedAreas.length > 0 || sortedWatercourses.length > 0 || sortedHedgerows.length > 0;

  if (hasHabitats)
  {
    return (
      <section className={styles.card}>
        <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
          {title} {isOpen ? '▼' : '▶'}
        </h3>
        {isOpen && (
          <>
            <HabitatTable
              title="Areas"
              habitats={sortedAreas}
              requestSort={requestSortAreas}
              sortConfig={sortConfigAreas}
              isImprovement={isImprovement}
            />

            <HabitatTable
              title="Watercourses"
              habitats={sortedWatercourses}
              requestSort={requestSortWatercourses}
              sortConfig={sortConfigWatercourses}
              isImprovement={isImprovement}
            />

            <HabitatTable
              title="Hedgerows"
              habitats={sortedHedgerows}
              requestSort={requestSortHedgerows}
              sortConfig={sortConfigHedgerows}
              isImprovement={isImprovement}
            />
          </>
        )}
      </section>
    );
  }
  else
  {
    return null;
  }
}

const AllocationsCard = ({allocations}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(allocations || [], { key: 'planningReference', direction: 'ascending' });
  
  return (
    <section className={styles.card}>
      <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        Allocations {isOpen ? '▼' : '▶'}
      </h3>
      {isOpen && (
        <>
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
                    <td className={styles.numericData}>{alloc.areaUnits.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
                    <td className={styles.numericData}>{alloc.hedgerowUnits.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
                    <td className={styles.numericData}>{alloc.watercoursesUnits.toFixed(DEFAULT_NUMERIC_NUM_DECIMALS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>No allocation information available.</p>}
        </>
      )}
    </section>
  );
}

export default function SitePage({ site, error }) {
  if (error) {
    return (
      <>
        <Head>
          <title>Error</title>
        </Head>
        <main className={styles.container}>
          <p className={styles.error}>Error: {error}</p>
          <Link href="/">Back to list</Link>
        </main>
      </>
    );
  }

  if (!site) {
    return (
      <>
        <Head>
          <title>Loading...</title>
        </Head>
        <main className={styles.container}>
          <p>Loading...</p>
        </main>
      </>
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
          <SiteDetailsCard
            site={site}
          />

          <HabitatsCard
            title="Baseline"
            habitats = {site.habitats}
            isImprovement={false}
          />

          <HabitatsCard
            title="Improvements"
            habitats = {site.improvements}
            isImprovement={true}
          />

          <AllocationsCard 
            allocations = {site.allocations}
          />

        </div>
      </main>
    </>
  );
}
