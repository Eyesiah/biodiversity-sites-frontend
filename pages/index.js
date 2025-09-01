// This function runs on the server side before the page is rendered.

import SiteList from "../components/SiteList";
import API_URL from '../config';
import { fetchAllSites } from '../lib/api';
import { processSiteDataForIndex } from '../lib/sites';
import { formatNumber } from '../lib/format';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites();
    const { processedSites, summary } = processSiteDataForIndex(allSites);

    // The value of the `props` key will be
    // passed to the `HomePage` component.
    return {
      props: {
        sites: processedSites,
        summary,
        error: null
      },
      revalidate: 3600, // In seconds
    };
  } catch (e) {
    // Handle any errors during the fetch.
    console.error(e);
    return {
      props: {
        sites: null,
        summary: { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0 },
        error: e.message
      },
    };
  }
}

// The main page component. It receives props from getServerSideProps.
export default function HomePage({ sites, error, summary = { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0 } }) {
  if (error) {
    return (
      <div className="container">
        <main className="main">
          <h1 className="title">Biodiversity Gain Sites</h1>
          <p className="error">Error fetching data: {error}</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="container">
      <main className="main">
        <h1 className="title">
          Biodiversity Gain Sites
        </h1>
        <div className="summary">
           <p>This list of <strong>{formatNumber(summary.totalSites, 0)}</strong> sites covers <strong>{formatNumber(summary.totalArea, 0)}</strong> hectares. These sites comprise <strong>{formatNumber(summary.totalBaselineHUs, 0)}</strong> baseline and <strong>{formatNumber(summary.totalCreatedHUs, 0)}</strong> created habitat units.</p>
        </div>
        <SiteList sites={sites} />
      </main>
    </div>
  );
}
