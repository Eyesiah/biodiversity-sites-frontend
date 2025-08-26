import API_URL from '../config';

async function fetchAllSites() {
  let allSites = [];
  let page = 0;
  const resultsPerPage = 10; // Or another suitable number
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${API_URL}/BiodiversityGainSites?page=${page}&resultsPerPage=${resultsPerPage}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sites, status: ${response.status}`);
    }
    const data = await response.json();
    const sites = data.sites;

    if (sites && sites.length > 0) {
      allSites = allSites.concat(sites);
      page++;
    } else {
      hasMore = false;
    }
  }

  return allSites;
}

export { fetchAllSites };
