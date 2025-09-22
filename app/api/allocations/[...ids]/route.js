import { NextResponse } from 'next/server';
import { fetchSite, fetchAllSites } from '@/lib/api';
import { slugify } from '@/lib/format';

export const revalidate = 3600; // Re-generate page at most once per hour

export async function generateStaticParams() {
  const allSites = await fetchAllSites();
  const paths = allSites.flatMap(site =>
    (site.allocations || []).map(alloc => ({
      ids: [site.referenceNumber, slugify(alloc.planningReference.trim())]
    }))
  );

  return paths;
}

export async function GET(request, { params }) {
  const [siteReferenceNumber, planningReference] = params.ids;

  try {
    const site = await fetchSite(siteReferenceNumber);
    if (!site) {
        return new NextResponse('Site not found', { status: 404 });
    }

    const matchingAllocations = (site.allocations || []).filter(
      alloc => slugify(alloc.planningReference.trim()) === planningReference
    );

    const flattenedHabitats = []

    const mapHabitats = (habitats) => (habitats || []).map(h => ({
      module: h.module,
      type: h.type,
      distinctiveness: h.distinctiveness || '',
      condition: h.condition,
      size: h.size,
    }));

    for (const allocation of matchingAllocations) {
      flattenedHabitats.push(...[
        ...(mapHabitats(allocation.habitats?.areas)),
        ...(mapHabitats(allocation.habitats?.hedgerows)),
        ...(mapHabitats(allocation.habitats?.watercourses)),
      ]);
    }

    return NextResponse.json(flattenedHabitats);
  } catch (error) {
    console.error(`Error fetching data for allocation ${siteReferenceNumber}/${planningReference}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}