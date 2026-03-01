import { fetchAllRefNos, fetchAllAllocationsForStaticParams } from '@/lib/api';

export const revalidate = 86400; // 24 hours

const URL = 'https://bgs.bristoltrees.space';

export default async function sitemap() {
  const staticRoutes = [
    '',
    '/all-allocations',
    '/habitat-analysis',
    '/habitat-summary',
    '/HU-calculator',
    '/scenario-planning',
    '/query',
    '/bgs-bodies',
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
  const sites = await fetchAllRefNos();
  const siteRoutes = sites.map((referenceNumber) => ({
    url: `${URL}/sites/${referenceNumber}`,
    lastModified: new Date().toISOString(),
  }));

  // Generate dynamic routes for allocations
  const allocations = await fetchAllAllocationsForStaticParams();
  const allocationRoutes = allocations.map((alloc) => ({
    url: `${URL}/allocations/${alloc.lpa}/${alloc.planningRef}`,
    lastModified: new Date().toISOString(),
  }));

  return [...staticRoutes, ...siteRoutes, ...allocationRoutes];
}
