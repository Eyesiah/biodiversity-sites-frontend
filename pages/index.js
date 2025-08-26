// This function runs on the server side before the page is rendered.

import SiteList from "../components/SiteList";
import API_URL from '../config';

export async function getStaticProps() {
  try {
    // Fetch data from the external API.
    // By adding a revalidate option to fetch, we can make the data's cache
    // lifetime independent of the page's revalidation period.
    const response = await fetch(
      `${API_URL}/BiodiversityGainSites`,
      { next: { revalidate: 3600 } } // Revalidate the data at most once per hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sites, status: ${response.status}`);
    }

    const sitesData = await response.json();

    // Process the data on the server to only include what we need for the table.
    // This significantly reduces the amount of data sent to the client.
    const processedSites = sitesData.sites.map(site => ({
      referenceNumber: site.referenceNumber,
      responsibleBodies: site.responsibleBodies,
      siteSize: site.siteSize,
      // We only need the count, not the full allocation objects.
      allocationsCount: site.allocations ? site.allocations.length : 0,
      lpaName: site.lpaArea ? site.lpaArea.name : 'N/A',
      ncaName: site.nationalCharacterArea ? site.nationalCharacterArea.name : 'N/A',
    }));

    // The value of the `props` key will be
    // passed to the `HomePage` component.
    return {
      props: {
        sites: processedSites,
        error: null
      },
      revalidate: 60, // In seconds
    };
  } catch (e) {
    // Handle any errors during the fetch.
    console.error(e);
    return {
      props: {
        sites: null,
        error: e.message
      },
    };
  }
}

// The main page component. It receives props from getServerSideProps.
export default function HomePage({ sites, error }) {
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
  
  const totalSites = sites ? sites.length : 0;
  const totalArea = sites ? sites.reduce((acc, site) => acc + site.siteSize, 0) : 0;

  return (
    <div className="container">
      <main className="main">
        <h1 className="title">
          Biodiversity Gain Sites
        </h1>
        <div className="summary">
          <p>Displaying <strong>{totalSites}</strong> sites with a total area of <strong>{totalArea.toFixed(2)}</strong> hectares.</p>
        </div>
        <SiteList sites={sites} />
      </main>
    </div>
  );
}