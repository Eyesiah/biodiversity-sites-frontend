import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { slugify, normalizeBodyName } from '@/lib/format';
import { fetchAllSites } from '@/lib/api';
import { processSiteForListView, processSitesForListView } from '@/lib/sites';
import { getLPAData, getNCAData } from '@/lib/habitat';
import { ARCGIS_LNRS_URL } from '@/config';
import BGSBodiesContent from './BGSBodiesContent';
import Footer from '@/components/core/Footer';

export const revalidate = 43200; // 12 hours

export const metadata = {
  title: 'BGS Bodies',
  description: 'View all the Responsible Bodies, Local Planning Authorities, National Character Areas, and Local Nature Recovery Strategies in the Register.'
};

async function getResponsibleBodiesData() {
  try {
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
      sites: []
    }));

    return bodyItems;
  } catch (e) {
    console.error('Error loading responsible bodies:', e);
    return [];
  }
}

async function getLPAPageData(allSites) {
  const allocationCounts = {};
  const siteCounts = {};

  allSites.forEach(site => {
    if (site.allocations) {
      site.allocations.forEach(alloc => {
        const lpaName = alloc.localPlanningAuthority;
        allocationCounts[lpaName] = (allocationCounts[lpaName] || 0) + 1;
      });
    }
    if (site.lpaName) {
      const lpaName = site.lpaName;
      siteCounts[lpaName] = (siteCounts[lpaName] || 0) + 1;
    }
  });

  let lpas = Array.from(getLPAData().values());
  lpas.forEach(lpa => {
    lpa.siteCount = siteCounts[lpa.name] || 0;
    lpa.allocationsCount = allocationCounts[lpa.name] || 0;
  });

  const sites = processSitesForListView(allSites);

  return { lpas, sites };
}

async function getNCAPageData(allSites) {
  const ncas = Array.from(getNCAData().values());

  const siteCountsByNCA = allSites.reduce((acc, site) => {
    if (site.ncaName) {
      acc[site.ncaName] = (acc[site.ncaName] || 0) + 1;
    }
    return acc;
  }, {});

  ncas.forEach(nca => {
    nca.siteCount = siteCountsByNCA[nca.name] || 0;
  });

  return { ncas, sites: processSitesForListView(allSites) };
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

    const siteCountsByLnrs = allSites.reduce((acc, site) => {
      if (site.lnrsName) {
        acc[site.lnrsName] = (acc[site.lnrsName] || 0) + 1;
      }
      return acc;
    }, {});

    rawLnrs.forEach(lnrs => {
      // Convert size from square meters to hectares
      lnrs.size = lnrs.size / 10000;
      lnrs.siteCount = siteCountsByLnrs[lnrs.name] || 0;
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

    return { lnrs, sites: processSitesForListView(allSites) };
  } catch (e) {
    console.error('Error loading LNRS data:', e);
    return { lnrs: [], sites: [] };
  }
}

export default async function BGSBodiesPage() {
  try {
    // Fetch all sites once
    const allSites = await fetchAllSites(true);

    // Fetch all body data in parallel
    const [responsibleBodyItems, lpaData, ncaData, lnrsData] = await Promise.all([
      getResponsibleBodiesData(),
      getLPAPageData(allSites),
      getNCAPageData(allSites),
      getLNRSPageData(allSites)
    ]);

    // Allocate sites to responsible bodies
    allSites.forEach(site => {
      if (site.responsibleBodies) {
        site.responsibleBodies.forEach(body => {
          const bodyName = slugify(normalizeBodyName(body));
          let bodyItem = responsibleBodyItems.find(b => slugify(normalizeBodyName(b.name)) === bodyName);
          if (bodyItem == null) {
            // when RB is not found, add it to the entry for "unknown"
            bodyItem = responsibleBodyItems.find(b => b.name === '<Unknown>');
            if (bodyItem == null) {
              bodyItem = {
                name: '<Unknown>',
                designationDate: '',
                expertise: '',
                organisationType: '<Only LPAs listed for site>',
                address: '',
                emails: [],
                telephone: '',
                sites: []
              };
              responsibleBodyItems.push(bodyItem);
            }
          }
          if (bodyItem && !bodyItem.sites.find(s => s.referenceNumber === site.referenceNumber)) {
            bodyItem.sites.push(processSiteForListView(site));
          }
        });
      }
    });

    const lastUpdated = new Date().toISOString();

    return (
      <>
        <BGSBodiesContent
          responsibleBodies={responsibleBodyItems}
          lpas={lpaData.lpas}
          lpaSites={lpaData.sites}
          ncas={ncaData.ncas}
          ncaSites={ncaData.sites}
          lnrs={lnrsData.lnrs}
          lnrsSites={lnrsData.sites}
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
