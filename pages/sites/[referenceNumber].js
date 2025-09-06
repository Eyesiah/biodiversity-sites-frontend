import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import styles from '../../styles/SiteDetails.module.css';
import API_URL from '../../config';
import { fetchAllSites } from '../../lib/api';
import { processSiteHabitatData  } from '../../lib/habitat';
import { getDistanceFromLatLonInKm, getCoordinatesForAddress, getCoordinatesForLPA } from '../../lib/geo';
import { useSortableData, getSortClassName } from '../../lib/hooks';
import ExternalLink from '../../components/ExternalLink';
import Modal from '../../components/Modal';
import { formatNumber, slugify } from '../../lib/format';
import { HabitatsCard } from "../../components/HabitatsCard"
import { CollapsibleRow } from "../../components/CollapsibleRow"
import { HabitatSummaryTable } from "../../components/HabitatSummaryTable"
import { DetailRow } from "../../components/DetailRow"

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

// This function will be used to normalize names for both counting and matching
const normalize = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/(\b(county|borough|district|city|metropolitan)\b\s)?council/g, '')
    .replace(/\blpa\b/g, '')
    .replace(/(\bcombined\b\s)?authority/g, '')
    .replace(/(\bwildlife\b\s)?trust/g, '')
    .replace(/limited|ltd/g, '')
    .replace(/\s+/g, ' ').trim();
};

// This function fetches the data for a single site based on its reference number.
export async function getStaticProps({ params }) {
  try {
    // Fetch the data for the specific site.
    const res = await fetch(`${API_URL}/BiodiversityGainSites/${params.referenceNumber}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch site data, status: ${res.status}`);
    }

    // Fetch all sites to calculate counts for responsible bodies
    const allSitesForCount = await fetchAllSites();
    const bodyCounts = allSitesForCount.reduce((acc, currentSite) => {
      if (currentSite.responsibleBodies) {
        currentSite.responsibleBodies.forEach(bodyName => {
          // Use the same robust normalization for counting
          const normalizedName = normalize(bodyName);
          acc[normalizedName] = (acc[normalizedName] || 0) + 1;
        });
      }
      return acc;
    }, {});


    // Fetch and parse responsible bodies data
    const csvPath = path.join(process.cwd(), 'data', 'responsible-bodies.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const allResponsibleBodies = parsedData.data.map(item => ({
      name: item['Name'] || '',
      designationDate: item['Designation Date'] || '',
      expertise: item['Area of Expertise'] || '',
      organisationType: item['Type of Organisation'] || '',
      address: item['Address'] || '',
      emails: item['Email'] ? item['Email'].split('; ') : [],
      telephone: item['Telephone'] || '',
      // Find the count for this body
      siteCount: bodyCounts[normalize(item['Name'] || '')] || 0,
    }));

    // Fetch all LPAs to link from site
    const lpaJsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
    const lpaJsonData = fs.readFileSync(lpaJsonPath, 'utf-8');
    const allLpas = JSON.parse(lpaJsonData);
    allLpas.forEach(lpa => {
      lpa.size = lpa.size / 10000;
      if (lpa.adjacents) lpa.adjacents.forEach(adj => adj.size = adj.size / 10000);
    });

    const site = await res.json();

    if (!site) {
      // If the site is not found, return a 404 page.
      return { notFound: true };
    }

    processSiteHabitatData(site);

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

          // If distance is > 688km, fall back to LPA centroid
          if (alloc.distance > 688 && alloc.localPlanningAuthority) {
            const lpaCoords = await getCoordinatesForLPA(alloc.localPlanningAuthority);
            if (lpaCoords) {
              alloc.distance = getDistanceFromLatLonInKm(site.latitude, site.longitude, lpaCoords.latitude, lpaCoords.longitude);
            }
          }
        } else {
          alloc.distance = 'unknown';
        }

      }));
    }

    const siteResponsibleBodies = (site.responsibleBodies || []).map(siteBodyName => {
        const normalizedSiteBodyName = normalize(siteBodyName);
        const foundBody = allResponsibleBodies.find(fullBody => normalize(fullBody.name) === normalizedSiteBodyName);
        return {
            name: siteBodyName,
            details: foundBody || null,
        };
    });

    const siteLpaDetails = allLpas.find(lpa => lpa.name === site.lpaArea?.name) || null;

    return {
      props: {
        site,
        siteResponsibleBodies,
        siteLpaDetails,
        lastUpdated: new Date().toISOString(),
        error: null,
      },
      revalidate: 3600, // Re-generate the page at most once per hour
    };
  } catch (e) {
    console.error(e);
    return {  
      props: {
        site: null,
        allResponsibleBodies: [],
        allLpas: [],
        error: e.message,
      },
    };
  }
}


const SiteDetailsCard = ({ site, siteResponsibleBodies, siteLpaDetails }) => {
  const [selectedBody, setSelectedBody] = useState(null);
  const [selectedLpa, setSelectedLpa] = useState(null);

  const medianAllocationDistance = useMemo(() => {
    if (!site.allocations || site.allocations.length === 0) {
      return null;
    }
    const distances = site.allocations
      .map(alloc => alloc.distance)
      .filter(d => typeof d === 'number')
      .sort((a, b) => a - b);

    if (distances.length === 0) return null;

    const mid = Math.floor(distances.length / 2);
    if (distances.length % 2 === 0) {
      return (distances[mid - 1] + distances[mid]) / 2;
    } else {
      return distances[mid];
    }
  }, [site.allocations]);

  return <section className={styles.card}>
    <h3>Site Details</h3>
    <div>
      <DetailRow label="BGS Reference" value={<ExternalLink href={`https://environment.data.gov.uk/biodiversity-net-gain/search/${site.referenceNumber}`}>{site.referenceNumber}</ExternalLink>} />
      <DetailRow 
        label="Responsible Body" 
        value={
          siteResponsibleBodies && siteResponsibleBodies.length > 0 ? (
            siteResponsibleBodies.map((body, index) => (
              <span key={index}>
                {body.details ? (
                  <button onClick={() => setSelectedBody(body.details)} className={styles.linkButton}>
                    {body.name}
                  </button>
                ) : (
                  body.name
                )}
                {index < siteResponsibleBodies.length - 1 && ', '}
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
          siteLpaDetails ? <button onClick={() => setSelectedLpa(siteLpaDetails)} className={styles.linkButton}>{site.lpaArea.name}</button> : (site.lpaArea?.name || 'N/A')
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
    <Modal show={!!selectedBody} onClose={() => setSelectedBody(null)} title={selectedBody?.name}>
      {selectedBody && (
        <dl>
          <DetailRow label="Designation Date" value={selectedBody.designationDate} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Area of Expertise" value={selectedBody.expertise} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Type of Organisation" value={selectedBody.organisationType} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Address" value={selectedBody.address} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Email" value={selectedBody.emails.map(e => <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Telephone" value={selectedBody.telephone} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="# BGS Sites" value={selectedBody.siteCount} labelColor="#f0f0f0" valueColor="#bdc3c7" />
        </dl>
      )}
    </Modal>
    <Modal show={!!selectedLpa} onClose={() => setSelectedLpa(null)} title={selectedLpa?.name}>
      {selectedLpa && (
        <dl>
          <DetailRow label="ID" value={selectedLpa.id} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="Area (ha)" value={formatNumber(selectedLpa.size, 0)} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          <DetailRow label="# Adjacent LPAs" value={selectedLpa.adjacents?.length || 0} labelColor="#f0f0f0" valueColor="#bdc3c7" />
          {selectedLpa.adjacents?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Adjacent LPAs</h4>
              <ul className={styles.adjacencyList}>
                {selectedLpa.adjacents.map(adj => <li key={adj.id}>{adj.name} ({adj.id}) - {formatNumber(adj.size, 0)} ha</li>)}
              </ul>
            </div>
          )}
        </dl>
      )}
    </Modal>
  </section>
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

export default function SitePage({ site, siteResponsibleBodies, siteLpaDetails, error }) {
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
          <SiteDetailsCard
            site={site}
            siteResponsibleBodies={siteResponsibleBodies}
            siteLpaDetails={siteLpaDetails}
          />

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
