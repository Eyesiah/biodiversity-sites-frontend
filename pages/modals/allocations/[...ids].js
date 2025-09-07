import { fetchSite, fetchAllSites } from '../../../lib/api';
import { slugify } from '../../../lib/format';
import HabitatSummaryTable from '../../../components/HabitatSummaryTable';
import styles from '../../../styles/Modal.module.css';

// This function tells Next.js which paths to pre-render at build time.
export async function getStaticPaths() {
  const allSites = await fetchAllSites();
  const paths = allSites.flatMap(site =>
    (site.allocations || []).map(alloc => ({
      params: { ids: [site.referenceNumber, alloc.planningReference] },
    }))
  );

  return { paths, fallback: 'blocking' };
}

// This function fetches the data for a specific allocation.
export async function getStaticProps({ params }) {
  const [siteReferenceNumber, planningReference] = params.ids;

  try {
    const site = await fetchSite(siteReferenceNumber);
    if (!site) {
      return { notFound: true };
    }

    const matchingAllocations = (site.allocations || []).filter(
      alloc => slugify(alloc.planningReference) === planningReference
    );

    // Validate that the planning reference is unique for this site
    if (matchingAllocations.length > 1) {
      console.error(`Validation Error: Found ${matchingAllocations.length} allocations with planningReference '${planningReference}' in site '${siteReferenceNumber}'. Expected 1.`);
    }

    const allocation = matchingAllocations[0];

    if (!allocation) {
      return { notFound: true };
    }

    const mapHabitats = (habitats) => (habitats || []).map(h => ({
      module: h.module,
      type: h.type,
      distinctiveness: h.distinctiveness || '',
      condition: h.condition,
      size: h.size,
    }));

    const flattenedHabitats = [
      ...(mapHabitats(allocation.habitats?.areas)),
      ...(mapHabitats(allocation.habitats?.hedgerows)),
      ...(mapHabitats(allocation.habitats?.watercourses)),
    ];

    return {
      props: {          
        habitats: flattenedHabitats
      },
      revalidate: 3600, // Re-generate page at most once per hour
    };
  } catch (error) {
    console.error(`Error fetching data for allocation ${siteReferenceNumber}/${planningReference}:`, error);
    return { notFound: true };
  }
}

// This page is only used for its getStaticProps data, not for rendering.
export default function AllocationsHabitatsPage() {
  return null;
}
