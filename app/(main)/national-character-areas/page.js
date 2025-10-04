import fs from 'fs';
import path from 'path';
import { fetchAllSites } from '@/lib/api';
import { processSitesForListView } from '@/lib/sites';
import NCAContent from './NCAContent';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'National Character Areas',
  description: 'View all the NCA bodies and which sites are present in each one.'
};

async function getNCAData() {
    try {
        const jsonPath = path.join(process.cwd(), 'data', 'NCAs.json');
        const jsonData = fs.readFileSync(jsonPath, 'utf-8');
        const rawNcas = JSON.parse(jsonData);
        const allSites = await fetchAllSites(true);
    
        const siteCountsByNCA = allSites.reduce((acc, site) => {
          if (site.ncaName) {
            acc[site.ncaName] = (acc[site.ncaName] || 0) + 1;
          }
          return acc;
        }, {});
    
        // Convert size from square meters to hectares
        rawNcas.forEach(nca => {
          nca.size = nca.size / 10000;
          nca.siteCount = siteCountsByNCA[nca.name] || 0;
          if (nca.adjacents) {
            nca.adjacents.forEach(adj => adj.size = adj.size / 10000);
          }
        });
        const ncas = rawNcas.sort((a, b) => a.name.localeCompare(b.name));
        
        return {
          ncas,
          sites: processSitesForListView(allSites),
          lastUpdated: new Date().toISOString(),
          error: null,
        };
      } catch (e) {
        console.error(e);
        return {
            ncas: [],
            sites: [],
            error: e.message || "An unexpected error occurred."
        }
      }
}

export default async function NationalCharacterAreasPage() {
  const { ncas, sites, error, lastUpdated } = await getNCAData();

  return (
    <>
      <div className="container">
        <NCAContent ncas={ncas} sites={sites} error={error} />
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
