// This function runs on the server side before the page is rendered.

import SiteList from '../components/SiteList';

export async function getServerSideProps() {
  try {
    // Fetch data from the external API.
    // Note: We use the full URL here because this code runs on the server,
    // so the development proxy is not used.
    const response = await fetch('https://wa-trees-api-f9evhdfhaufacsdq.ukwest-01.azurewebsites.net/BiodiversityGainSites');

    if (!response.ok) {
      // If the response is not ok, we can return an error prop
      // which will be displayed on the page.
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
  return (
    <div className="container">
      <main className="main">
        <h1 className="title">
          Biodiversity Gain Sites
        </h1>

        {error && <p className="error">Error fetching data: {error}</p>}

        {sites && <SiteList sites={sites} />}
      </main>
    </div>
  );
}