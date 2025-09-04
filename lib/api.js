import API_URL from '../config.js';

async function fetchAllSites(maxResults=0) {
  let allSites = [];
  let page = 0;
  const resultsPerPage = 50;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${API_URL}/BiodiversityGainSites?page=${page}&resultsPerPage=${resultsPerPage}`,      
      { next: { revalidate: 3600 } } // Revalidate the data at most once per hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sites, status: ${response.status}`);
    }
    const data = await response.json();
    const sites = data.sites;

    if (sites && sites.length > 0) {
      allSites.push(...sites);
      page++;
    } else {
      hasMore = false;
    }

    if (maxResults > 0 && allSites.length >= maxResults)
    {
      hasMore = false;
    }
  }

  return allSites;
}

export { fetchAllSites };
