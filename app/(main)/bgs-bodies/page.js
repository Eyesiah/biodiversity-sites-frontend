import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { slugify, normalizeBodyName } from '@/lib/format';
import { fetchAllSites, transformAllocations } from '@/lib/api';
import { processSiteForListView, processSitesForListView } from '@/lib/sites';
import { getLPAData, getNCAData } from '@/lib/habitat';
import { ARCGIS_LNRS_URL, ARCGIS_LPA_URL, ARCGIS_NCA_URL } from '@/config';
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

async function getLNRSBoundaries() {
  try {
    // geometryPrecision rounds coordinates to ~1m accuracy without removing any vertices,
    // cutting payload size substantially with no risk of distorting the boundary shapes.
    // (Note: maxAllowableOffset-based generalization was tried and rejected - this ArcGIS
    // service collapses polygons to a handful of points even at a 1m offset, corrupting the shapes.)
    const url = `${ARCGIS_LNRS_URL}?where=1%3D1&outFields=Name&returnGeometry=true&geometryPrecision=5&f=geojson`;
    const res = await fetch(url, { next: { revalidate: revalidate } });
    return await res.json();
  } catch (e) {
    console.error('Error loading LNRS boundaries:', e);
    return null;
  }
}

async function getLPABoundaries() {
  try {
    // This service covers the whole UK; LPA23CD is prefixed by country (E/S/W/N), so filter
    // to English LPAs only, since that's the only place BGS allocations can land.
    const url = `${ARCGIS_LPA_URL}?where=LPA23CD+LIKE+'E%25'&outFields=LPA23NM&returnGeometry=true&geometryPrecision=5&f=geojson`;
    const res = await fetch(url, { next: { revalidate: revalidate } });
    return await res.json();
  } catch (e) {
    console.error('Error loading LPA boundaries:', e);
    return null;
  }
}

async function getNCABoundaries() {
  try {
    const url = `${ARCGIS_NCA_URL}?where=1%3D1&outFields=NCA_Name&returnGeometry=true&geometryPrecision=5&f=geojson`;
    const res = await fetch(url, { next: { revalidate: revalidate } });
    return await res.json();
  } catch (e) {
    console.error('Error loading NCA boundaries:', e);
    return null;
  }
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
