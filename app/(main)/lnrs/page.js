import fs from 'fs';
import path from 'path';
import { fetchAllSites } from '@/lib/api';
import { processSitesForListView} from '@/lib/sites';
import { ARCGIS_LNRS_URL } from '@/config';
import LNRSContent from './LNRSContent';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Local Nature Recovery Strategy Sites',
  description: 'View all the LNRS bodies and which sites are present in each one. Click on any record for a dropdown of adjacent LNRS sites.'
};

async function getLnrsData() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'LNRSs.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const rawLnrs = JSON.parse(jsonData);
    const allSites = await fetchAllSites(true);

    const lnrsArcGISRes = await fetch(`${ARCGIS_LNRS_URL}?where=1%3D1&outFields=*&returnGeometry=false&f=json`, {next: { revalidate: 3600 } });
    const lnrsArcGISData = await lnrsArcGISRes.json();

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
      // add link to published from argisData

      const arcGISLNRS = lnrsArcGISData.features.find(f => f.attributes.Name == lnrs.name);
      if (arcGISLNRS) {
        lnrs.publicationStatus = arcGISLNRS.attributes.Status || 'N/A';
        if (arcGISLNRS.attributes.Link_to_published) {
          lnrs.link = arcGISLNRS.attributes.Link_to_published;
        }
      }
    });

    // Sort by name by default
    const lnrs = rawLnrs.sort((a, b) => a.name.localeCompare(b.name));

    return {
      lnrs,
      sites: processSitesForListView(allSites),
      lastUpdated: new Date().toISOString(),
      error: null,
    };
  } catch (e) {
    console.error(e);
    // In the App Router, you can return an error object or render an error component.
    // For this conversion, we'll pass an error message to the client component.
    return {
        lnrs: [],
        sites: [],
        error: e.message || "An unexpected error occurred."
    }
  }
}


export default async function LNRSAreasPage() {
  const { lnrs, sites, error, lastUpdated } = await getLnrsData();

  return (
    <>
      <LNRSContent lnrs={lnrs} sites={sites} error={error} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
