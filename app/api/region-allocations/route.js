import { NextResponse } from 'next/server';
import { fetchAllSites, transformAllocations } from '@/lib/api';

// Lightweight allocation data for the BGS Bodies page's region heat maps
// (components/map/RegionAllocationHeatMap.js), fetched client-side rather than embedded as
// server-rendered props - the full transformAllocations() output (particularly the per-habitat
// `habitats` breakdown, unused by these maps) is large enough that passing it down from
// app/(main)/bgs-bodies/page.js pushed that page's pre-rendered ISR response over Vercel's
// 19.07MB limit and broke the production deployment (FALLBACK_BODY_TOO_LARGE).
export const revalidate = 86400; // 24 hours

const FIELDS_USED_BY_HEAT_MAPS = ['lnrs', 'allocLnrs', 'siteLpa', 'lpa', 'nca', 'allocNca', 'srn', 'siteName', 'rb', 'au', 'hu', 'wu', 'd', 'srCat'];

export async function GET() {
  const allSites = await fetchAllSites(true, true, true);
  const allocations = transformAllocations(allSites).map(alloc => {
    const lightweight = {};
    FIELDS_USED_BY_HEAT_MAPS.forEach(field => {
      lightweight[field] = alloc[field];
    });
    return lightweight;
  });

  return NextResponse.json(allocations);
}
