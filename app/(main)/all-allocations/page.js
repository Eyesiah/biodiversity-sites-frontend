import { fetchAllSites, transformAllocations } from '@/lib/api';
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

  const lastUpdated = Date.now();

  return (
    <>
      <AllAllocationsContent allocations={allocations}/>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
