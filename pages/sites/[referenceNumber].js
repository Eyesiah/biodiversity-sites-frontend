import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import styles from '../../styles/SiteDetails.module.css';
import { fetchAllSites, fetchSite } from '../../lib/api';
import { getDistanceFromLatLonInKm, getCoordinatesForAddress, getCoordinatesForLPA } from '../../lib/geo';
import { useSortableData, getSortClassName } from '../../lib/hooks';
import ExternalLink from '../../components/ExternalLink';
import Modal from '../../components/Modal';
import { formatNumber, slugify, normalizeBodyName } from '../../lib/format';
import { HabitatsCard } from "../../components/HabitatsCard"
import { CollapsibleRow } from "../../components/CollapsibleRow"
import { HabitatSummaryTable } from "../../components/HabitatSummaryTable"
import { DetailRow } from "../../components/DetailRow"

// This function tells Next.js which paths to pre-render at build time.
export async function getStaticPaths() {
  try {
    const sites = await fetchAllSites(1000);
    const paths = sites.map(site => ({
      params: { referenceNumber: site.referenceNumber },
    }));

    // fallback: 'blocking' means that if a path is not found,
    // Next.js will server-render it on the first request and then cache it.
    return { paths, fallback: 'blocking' };
  } catch (error) {
    console.error("Error in getStaticPaths:", error);
    // If the API is down, we can't pre-render any pages.
    // fallback: 'blocking' will cause pages to be rendered on-demand when requested.
    return { paths: [], fallback: 'blocking' };
  }
}

export async function getStaticProps({ params }) {
  try {

    site = fetchSite(params.referenceNumber)
    if (!site)
    {
      return { notFound: true };
    }

    // process allocation location data
    if (site.allocations) {
      await Promise.all(site.allocations.map(async (alloc) => {
        let allocCoords = null;

        // 1. Always try to geocode the address, using the LPA for context.
        if (alloc.projectName) {
          allocCoords = await getCoordinatesForAddress(alloc.projectName, alloc.localPlanningAuthority);
        }

        // 2. If geocoding the full address fails, fall back to just the LPA.
        if (!allocCoords && alloc.localPlanningAuthority) {
          allocCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
        }

        // 3. If we have coordinates for the allocation, calculate the distance.
        if (allocCoords && site.latitude && site.longitude) {
          alloc.distance = getDistanceFromLatLonInKm(
            site.latitude,
            site.longitude,
            allocCoords.latitude,
            allocCoords.longitude
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

    return {
      props: {
        site,
        lastUpdated: new Date().toISOString(),
        error: null,
      },
      revalidate: 3600, // Re-generate the page at most once per hour
    };
  } catch (e) {
    // By throwing an error, we signal to Next.js that this regeneration attempt has failed.
    // If a previous version of the page was successfully generated, Next.js will continue
    // to serve the stale (old) page instead of showing an error.
    // For initial page loads (or when using fallback: 'blocking'), this will result in a 500 error page.
    throw e;
  }
}

const InfoModal = ({ modalState, onClose }) => {
  const { show, type, name, title } = modalState;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (show && name) {
      const fetchData = async () => {
        setIsLoading(true);
        setData(null);
        try {
          const buildId = window.__NEXT_DATA__.buildId;
          const res = await fetch(`/_next/data/${buildId}/modals/${type}/${name}.json`);
          if (!res.ok) throw new Error(`Failed to fetch details: ${res.status}`);
          const json = await res.json();
          setData(json.pageProps);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [show, type, name]);

  const renderContent = () => {
    if (isLoading) return <p>Loading...</p>;
    if (!data) return <p>No data available.</p>;

    if (type === 'body' && data.body) {
      const { body } = data;
      return (
        <dl>
          <DetailRow label="Designation Date" value={body.designationDate} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Area of Expertise" value={body.expertise} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Type of Organisation" value={body.organisationType} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Address" value={body.address} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Email" value={body.emails.map(e => <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Telephone" value={body.telephone} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="# BGS Sites" value={body.siteCount} labelColor="#f0f0f0" valueColor="#bdc3c7" />
        </dl>
      );
    }

    if (type === 'lpa' && data.lpa) {
      const { lpa } = data;
      return (
        <dl>
          <DetailRow label="ID" value={lpa.id} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Area (ha)" value={formatNumber(lpa.size, 0)} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="# Adjacent LPAs" value={lpa.adjacents?.length || 0} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          {lpa.adjacents?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Adjacent LPAs</h4>
              <ul className={styles.adjacencyList}>
                {lpa.adjacents.map(adj => <li key={adj.id}>{adj.name} ({adj.id}) - {formatNumber(adj.size, 0)} ha</li>)}
              </ul>
            </div>
          )}
        </dl>
      );
    }

    return <p>Details could not be loaded.</p>;
  };

  return (
    <Modal show={show} onClose={onClose} title={title}>
      {renderContent()}
    </Modal>
  );
};

const SiteDetailsCard = ({ site }) => {
  const [modalState, setModalState] = useState({ show: false, type: null, name: null, title: '' });

  const medianAllocationDistance = useMemo(() => {
    if (!site.allocations || site.allocations.length === 0) return null;
    const distances = site.allocations.map(alloc => alloc.distance).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) return null;
    const mid = Math.floor(distances.length / 2);
    return distances.length % 2 === 0 ? (distances[mid - 1] + distances[mid]) / 2 : distances[mid];
  }, [site.allocations]);

  const showModal = (type, name, title) => {
    setModalState({ show: true, type, name: slugify(normalizeBodyName(name)), title });
  };

  return (
    <section className={styles.card}>
    <h3>Site Details</h3>
    <div>
      <DetailRow label="BGS Reference" value={<ExternalLink href={`https://environment.data.gov.uk/biodiversity-net-gain/search/${site.referenceNumber}`}>{site.referenceNumber}</ExternalLink>} />
      <DetailRow 
        label="Responsible Body" 
        value={
          (site.responsibleBodies && site.responsibleBodies.length > 0) ? (
            site.responsibleBodies.map((bodyName, index) => (
              <span key={index}>
                <button onClick={() => showModal('body', bodyName, bodyName)} className={styles.linkButton}>
                  {bodyName}
                </button>
                {index < site.responsibleBodies.length - 1 && ', '}
              </span>
            ))
          ) : 'N/A'
        } 
      />
      <DetailRow label="Start date of enhancement works" value={site.startDate ? new Date(site.startDate).toLocaleDateString('en-GB') : 'N/A'} />
      <DetailRow label="Location (Lat/Long)" value={(site.latitude && site.longitude) ? `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}` : '??'} />
      {site.latitude && site.longitude && <DetailRow label="Map" value={<ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}>View on Google Maps</ExternalLink>} />}
      <DetailRow label="NCA" value={site.nationalCharacterArea?.name ? <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(site.nationalCharacterArea.name)}`}>{site.nationalCharacterArea.name}</ExternalLink> : 'N/A'} />
      <DetailRow 
        label="LPA" 
        value={
          site.lpaArea?.name ? <button onClick={() => showModal('lpa', site.lpaArea.name, site.lpaArea.name)} className={styles.linkButton}>{site.lpaArea.name}</button> : 'N/A'
        } 
      />
      <DetailRow label="# Allocations" value={site.allocations?.length || 0} />
      <DetailRow label="# Planning applications" value={site.allocations?.length || 0} />
      {medianAllocationDistance !== null && <DetailRow label="Median allocation distance" value={`${formatNumber(Math.round(medianAllocationDistance), 0)} km`} />}
      <DetailRow label="Site Area" value={`${formatNumber(site.siteSize || 0)} ha`} />
      <div className={styles.detailRow}>
        <dt className={styles.detailLabel}>Habitat Summary</dt>
        <dd className={styles.detailValue}>
          <HabitatSummaryTable site={site} />
        </dd>
      </div>
    </div>
      <InfoModal modalState={modalState} onClose={() => setModalState({ show: false, type: null, name: null, title: '' })} />
  </section>
  )
}


// component to display the habitats within an allocation
const AllocationHabitats = ({ habitats }) => {
  // Flatten the habitats from areas, hedgerows, and watercourses
  const flattenedHabitats = [
    ...(habitats.areas || []),
    ...(habitats.hedgerows || []),
    ...(habitats.watercourses || []),
  ];

  if (flattenedHabitats.length === 0) {
    return <p>No habitat details for this allocation.</p>;
  }

  return (
    <table className={styles.subTable}>
      <thead>
        <tr>
          <th>Module</th>
          <th>Habitat</th>
          <th>Distinctiveness</th>
          <th>Condition</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        {flattenedHabitats.map((habitat, index) => (
          <tr key={index}>
            <td>{habitat.module}</td>
            <td>{habitat.type}</td>
            <td>{habitat.distinctiveness}</td>
            <td>{habitat.condition}</td>
            <td className={styles.numericData}>{formatNumber(habitat.size)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// component for each row in the allocations table to handle drill-down
const AllocationRow = ({ alloc }) => {
  const mainRow = (
    <>
      <td>{alloc.planningReference}</td>
      <td>{alloc.localPlanningAuthority}</td>
      <td className={styles.numericData} style={{ textAlign: 'center' }}>
        {typeof alloc.distance === 'number' ? formatNumber(alloc.distance, 0) : alloc.distance}
      </td>
      <td>{alloc.projectName}</td>
      <td className={styles.numericData}>{formatNumber(alloc.areaUnits || 0)}</td>
      <td className={styles.numericData}>{formatNumber(alloc.hedgerowUnits || 0)}</td>
      <td className={styles.numericData}>{formatNumber(alloc.watercoursesUnits || 0)}</td>
    </>
  );

  const collapsibleContent = <AllocationHabitats habitats={alloc.habitats} />;

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={7}
    />
  );
};

const AllocationsCard = ({allocations, title}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(allocations || [], { key: 'planningReference', direction: 'ascending' });
  
  return (
    <section className={styles.card}>
      <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {title} {isOpen ? '▼' : '▶'}
      </h3>
      {isOpen && (
        <>
          {sortedAllocations.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => requestSortAllocations('planningReference')} className={getSortClassName('planningReference', sortConfigAllocations)}>Reference</th>
                  <th onClick={() => requestSortAllocations('localPlanningAuthority')} className={getSortClassName('localPlanningAuthority', sortConfigAllocations)}>LPA</th>
                  <th onClick={() => requestSortAllocations('distance')} className={getSortClassName('distance', sortConfigAllocations)} style={{ textAlign: 'center' }}>Distance (km)</th>
                  <th onClick={() => requestSortAllocations('projectName')} className={getSortClassName('projectName', sortConfigAllocations)}>Address</th>
                  <th onClick={() => requestSortAllocations('areaUnits')} className={getSortClassName('areaUnits', sortConfigAllocations)}>Area units</th>
                  <th onClick={() => requestSortAllocations('hedgerowUnits')} className={getSortClassName('hedgerowUnits', sortConfigAllocations)}>Hedgerow units</th>
                  <th onClick={() => requestSortAllocations('watercoursesUnits')} className={getSortClassName('watercoursesUnits', sortConfigAllocations)}>Watercourse units</th>
                </tr>
              </thead>
              <tbody>
                {sortedAllocations.map((alloc) => (
                  <AllocationRow key={alloc.planningReference} alloc={alloc} />
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
          <Link href="/sites" className={styles.backLink}>&larr; Back to Site List</Link>
          <h1>Biodiversity Gain Site</h1>
          <h2>{site.referenceNumber}</h2>
        </div>

        <div className={styles.detailsGrid}>
          <SiteDetailsCard site={site} />

          <HabitatsCard
            title="Baseline Habitats (click any habitat cell for more detail)"
            habitats = {site.habitats}
            isImprovement={false}
          />

          <HabitatsCard
            title="Improvement Habitats (click any habitat cell for more detail)"
            habitats = {site.improvements}
            isImprovement={true}
          />

          <AllocationsCard 
            title="Allocations (click any allocation for more detail)"
            allocations={site.allocations}
          />

        </div>
      </main>
    </>
  );
}
