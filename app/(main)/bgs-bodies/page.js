import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { slugify, normalizeBodyName } from '@/lib/format';
import { fetchAllSites, transformAllocations } from '@/lib/api';
import { processSiteForListView, processSitesForListView } from '@/lib/sites';
import { getLPAData, getNCAData } from '@/lib/habitat';
import { ARCGIS_LNRS_URL } from '@/config';
import BGSBodiesContent from './BGSBodiesContent';
import Footer from '@/components/core/Footer';

export const revalidate = 86400; // 24 hours

export const metadata = {
  title: 'BGS Bodies',
  description: 'View all the Responsible Bodies, Local Planning Authorities, National Character Areas, and Local Nature Recovery Strategies in the Register.',
  keywords: ['Responsible Bodies', 'Local Planning Authority', 'LPA', 'National Character Areas', 'NCA', 'Local Nature Recovery Strategy', 'LNRS', 'BGS organizations', 'conservation bodies'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/bgs-bodies',
  },
};

async function getResponsibleBodiesData(sites) {
  try {
    // Count allocations per responsible body
    const allocationCounts = {};
    sites.forEach(site => {
      if (site.allocations) {
        site.allocations.forEach(alloc => {
          if (site.responsibleBodies) {
            site.responsibleBodies.forEach(body => {
              allocationCounts[body] = (allocationCounts[body] || 0) + 1;
            });
          }
        });
      }
    });

    const csvPath = path.join(process.cwd(), 'data', 'responsible-bodies.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');

    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const bodyItems = parsedData.data.map(item => ({
      name: item['Name'] || '',
      designationDate: item['Designation Date'] || '',
      expertise: item['Area of Expertise'] || '',
      organisationType: item['Type of Organisation'] || '',
      address: item['Address'] || '',
      emails: item['Email'] ? item['Email'].split('; ') : [],
      telephone: item['Telephone'] || '',
      sites: [],
      allocationsCount: 0
    }));

    // Allocate sites and allocations to responsible bodies
    sites.forEach(site => {
      if (site.responsibleBodies) {
        site.responsibleBodies.forEach(body => {
          const bodyName = slugify(normalizeBodyName(body));
          let bodyItem = bodyItems.find(b => slugify(normalizeBodyName(b.name)) === bodyName);
          if (bodyItem == null) {
            // when RB is not found, add it to the entry for "unknown"
            bodyItem = bodyItems.find(b => b.name === '<Unknown>');
            if (bodyItem == null) {
              bodyItem = {
                name: '<Unknown>',
                designationDate: '',
                expertise: '',
                organisationType: '<Only LPAs listed for site>',
                address: '',
                emails: [],
                telephone: '',
                sites: [],
                allocationsCount: 0
              };
              bodyItems.push(bodyItem);
            }
          }
          if (bodyItem && !bodyItem.sites.find(s => s.referenceNumber === site.referenceNumber)) {
            bodyItem.sites.push(site.referenceNumber);
          }
          bodyItem.allocationsCount = allocationCounts[body] || 0;
        });
      }
    });

    return bodyItems;
  } catch (e) {
    console.error('Error loading responsible bodies:', e);
    return [];
  }
}

async function getLPAPageData(allSites) {
  const allocationCounts = {};

  allSites.forEach(site => {
    if (site.allocations) {
      site.allocations.forEach(alloc => {
        const lpaName = alloc.localPlanningAuthority;
        allocationCounts[lpaName] = (allocationCounts[lpaName] || 0) + 1;
      });
    }
  });

  let lpas = Array.from(getLPAData().values());
  lpas.forEach(lpa => {
    lpa.sites = allSites.filter(s => s.lpaName == lpa.name).map(s => s.referenceNumber);
    lpa.allocationsCount = allocationCounts[lpa.name] || 0;
  });

  return lpas;
}

async function getNCAPageData(allSites) {
  const ncas = Array.from(getNCAData().values());

  ncas.forEach(nca => {
    nca.sites = allSites.filter(s => s.ncaName == nca.name).map(s => s.referenceNumber);
  });

  return ncas;
}

async function getLNRSPageData(allSites) {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'LNRSs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawLnrs = JSON.parse(jsonData);

    const lnrsArcGISRes = await fetch(`${ARCGIS_LNRS_URL}?where=1%3D1&outFields=*&returnGeometry=false&f=json`, { next: { revalidate: revalidate } });
    const lnrsArcGISData = await lnrsArcGISRes.json();

    const csvPath = path.join(process.cwd(), 'data', 'LNRS-Strategies.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    rawLnrs.forEach(lnrs => {
      // Convert size from square meters to hectares
      lnrs.size = lnrs.size / 10000;
      lnrs.sites = allSites.filter(s => s.lnrsName == lnrs.name).map(s => s.referenceNumber);
      // Ensure adjacents exist before processing
      (lnrs.adjacents || []).forEach(adj => adj.size = adj.size / 10000);

      // First, try to get link from CSV (primary source)
      const csvLnrs = parsedData.data.find(item => parseInt(item['LNRS ID']) === parseInt(lnrs.id));
      if (csvLnrs && csvLnrs['URL']) {
        lnrs.link = csvLnrs['URL'];
        lnrs.publicationStatus = 'Published (final)';
      } else {
        // Fall back to ArcGIS data only if CSV has no URL
        const arcGISLNRS = lnrsArcGISData.features.find(f => f.attributes.Name == lnrs.name);
        if (arcGISLNRS) {
          lnrs.publicationStatus = arcGISLNRS.attributes.Status || 'N/A';
          if (arcGISLNRS.attributes.Link_to_published) {
            lnrs.link = arcGISLNRS.attributes.Link_to_published;
          }
        }
      }
    });

    // Sort by name by default
    const lnrs = rawLnrs.sort((a, b) => a.name.localeCompare(b.name));

    return lnrs;
  } catch (e) {
    console.error('Error loading LNRS data:', e);
    return [];
  }
}

// LNRS/LPA/NCA boundaries are pre-fetched and simplified into static files by
// scripts/generate-region-boundaries.js, rather than being live-fetched here. The live ArcGIS
// responses (LNRS ~25-30MB, NCA ~4MB) are far too large for Next.js's fetch Data Cache (which
// has a hard 2MB-per-item limit and silently fails to cache anything bigger), so every request
// was doing an uncached multi-MB live fetch. Re-run that script if the source boundaries change.
function readBoundariesFile(fileName) {
  try {
    const jsonPath = path.join(process.cwd(), 'data', fileName);
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (e) {
    console.error(`Error loading ${fileName}:`, e);
    return null;
  }
}

function getLNRSBoundaries() {
  return readBoundariesFile('LNRS-Boundaries.json');
}

function getLPABoundaries() {
  return readBoundariesFile('LPA-Boundaries.json');
}

function getNCABoundaries() {
  return readBoundariesFile('NCA-Boundaries.json');
}

export default async function BGSBodiesPage() {
  try {
    // Fetch all sites once
    const allSites = await fetchAllSites(true, false, true);

    // Fetch all body data in parallel
    const [responsibleBodyItems, lpaData, ncaData, lnrsData, lnrsBoundaries, lpaBoundaries, ncaBoundaries] = await Promise.all([
      getResponsibleBodiesData(allSites),
      getLPAPageData(allSites),
      getNCAPageData(allSites),
      getLNRSPageData(allSites),
      getLNRSBoundaries(),
      getLPABoundaries(),
      getNCABoundaries()
    ]);

    const lastUpdated = new Date().toISOString();

    const allocations = transformAllocations(allSites);

    return (
      <>
        <BGSBodiesContent
          responsibleBodies={responsibleBodyItems}
          lpas={lpaData}
          ncas={ncaData}
          lnrs={lnrsData}
          sites={processSitesForListView(allSites)}
          allocations={allocations}
          lnrsBoundaries={lnrsBoundaries}
          lpaBoundaries={lpaBoundaries}
          ncaBoundaries={ncaBoundaries}
        />
        <Footer lastUpdated={lastUpdated} />
      </>
    );
  } catch (e) {
    console.error('Error in BGSBodiesPage:', e);
    return (
      <>
        <BGSBodiesContent error={e.message} />
        <Footer lastUpdated={new Date().toISOString()} />
      </>
    );
  }
}
