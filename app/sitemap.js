
import { fetchAllSites } from '@/lib/api';

import {ISR_REVALIDATE_TIME} from '@/config'
export const revalidate = ISR_REVALIDATE_TIME;

const URL = 'https://bgs.bristoltrees.space';

export default async function sitemap() {
  const staticRoutes = [
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

  // Generate dynamic routes for individual sites
  const sites = await fetchAllSites();
  const siteRoutes = sites.map((site) => ({
    url: `${URL}/sites/${site.referenceNumber}`,
    lastModified: new Date().toISOString(),
  }));

  return [...staticRoutes, ...siteRoutes];
}
