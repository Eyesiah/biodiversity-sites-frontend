
const URL = 'https://bgs.bristoltrees.space';

export default async function sitemap() {
  const routes = [
    '',
    '/all-allocations',
    '/habitat-analysis',
    '/habitat-summary',
    '/HU-calculator',
    '/lnrs',
    '/local-planning-authorities',
    '/national-character-areas',
    '/query',
    '/responsible-bodies',
    '/sites',
    '/statistics',
    '/about',
    '/feedback',
    '/glossary',
  ].map((route) => ({
    url: `${URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return routes;
}
