import { fetchAllSites, transformAllocations } from '@/lib/api';
import clientPromise from '@/lib/mongodb';
import { MONGODB_DATABASE_NAME } from '@/config';
import AllAllocationsContent from './AllAllocationsContent';
import Footer from '@/components/core/Footer';

export const revalidate = 86400; // 24 hours

export const metadata = {
  title: 'BGS allocations',
  description: 'Every allocation in the register is listed here. Select a row for more detail about which habitats have been allocated.',
  keywords: ['BGS allocations', 'biodiversity allocations', 'habitat allocations', 'BNG allocations', 'site allocations England', 'allocated habitat units'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/all-allocations',
  },
};

export default async function AllocationsPage() {

  const allSites = await fetchAllSites(true, true, true);
  const allocations = transformAllocations(allSites);

  const siteSupply = {};
  for (const site of allSites) {
    const sum = (unit) =>
      (site.improvements?.[unit] || []).reduce((s, h) => s + (h.HUs || 0), 0);
    siteSupply[site.referenceNumber] = {
      areaHUs: sum('areas'),
      treeHUs: sum('trees'),
      hedgerowHUs: sum('hedgerows'),
      watercourseHUs: sum('watercourses'),
      siteSize: site.siteSize || 0,
    };
  }

  // Fetch per-allocation first-seen timestamps recorded by the cron job
  let allocFirstSeen = {};
  if (clientPromise) {
    try {
      const client = await clientPromise;
      const db = client.db(MONGODB_DATABASE_NAME);
      const records = await db.collection('allocations').find({}, { projection: { dr: 1, firstSeen: 1 } }).toArray();
      for (const r of records) {
        if (r.dr && r.firstSeen) allocFirstSeen[r.dr] = r.firstSeen;
      }
    } catch (e) {
      console.error('Failed to fetch allocation timestamps:', e);
    }
  }

  const allocationsWithDates = allocations.map(alloc => ({
    ...alloc,
    firstSeen: allocFirstSeen[alloc.dr] || null,
  }));

  const lastUpdated = Date.now();

  return (
    <>
      <AllAllocationsContent allocations={allocationsWithDates} siteSupply={siteSupply} />
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
