// This function runs on the server side before the page is rendered.
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

    const sites = await response.json();

    // The value of the `props` key will be
    // passed to the `HomePage` component.
    return {
      props: {
        sites,
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

        {sites && <pre className="raw-json">{JSON.stringify(sites, null, 2)}</pre>}
      </main>
    </div>
  );
}