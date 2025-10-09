
import { fetchAllSites } from '@/lib/api';
import { processSitesForListView } from '@/lib/sites';
import NCAContent from './NCAContent';
import Footer from '@/components/Footer';
import { getNCAData } from '@/lib/habitat'

export const metadata = {
  title: 'National Character Areas',
  description: 'View all the NCA bodies and which sites are present in each one. Click on any record for a dropdown of adjacent NCAs.'
};

async function getNCAPageData() {
  try {
    const allSites = await fetchAllSites(true);
    const ncas = Array.from(getNCAData().values());
    
    const siteCountsByNCA = allSites.reduce((acc, site) => {
      if (site.ncaName) {
        acc[site.ncaName] = (acc[site.ncaName] || 0) + 1;
      }
      return acc;
    }, {});

    ncas.forEach(nca => {
      nca.siteCount = siteCountsByNCA[nca.name] || 0;
    })

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
  const { ncas, sites, error, lastUpdated } = await getNCAPageData();

  return (
    <>
      <div className="container">
        <NCAContent ncas={ncas} sites={sites} error={error} />
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
