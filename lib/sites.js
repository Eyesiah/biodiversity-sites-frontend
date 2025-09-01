import { calculateBaselineHU, calculateImprovementHU } from './habitat';

/**
 * Processes an array of raw site objects to a format suitable for the site list view.
 * This reduces the data payload sent to the client.
 * @param {Array} sites - The array of raw site objects.
 * @returns {Array} The array of processed site objects.
 */
export function processSitesForListView(sites) {
  if (!sites) return [];
  return sites.map(site => ({
    referenceNumber: site.referenceNumber,
    responsibleBodies: site.responsibleBodies || [],
    siteSize: site.siteSize || 0,
    allocationsCount: site.allocations ? site.allocations.length : 0,
    lpaName: site.lpaArea ? site.lpaArea.name : 'N/A',
    ncaName: site.nationalCharacterArea ? site.nationalCharacterArea.name : 'N/A',
  }));
}

/**
 * Processes raw site data for the index page, calculating summary statistics.
 * @param {Array} allSites - The array of raw site objects.
 * @returns {{processedSites: Array, summary: Object}}
 */
export function processSiteDataForIndex(allSites) {
  if (!allSites) {
    return {
      processedSites: [],
      summary: { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0 },
    };
  }

  let totalBaselineHUs = 0;
  let totalCreatedHUs = 0;
  allSites.forEach(site => {
    if (site.habitats) {
      const processHabitats = (habitats, isArea) => {
        if (!habitats) return;
        habitats.forEach(h => {
          let type = h.type;
          if (isArea) {
            const typeParts = h.type.split(' - ');
            type = (typeParts.length > 1 ? typeParts[1] : h.type).trim();
          }
          totalBaselineHUs += calculateBaselineHU(h.size, type, h.condition || 'N/A - Other');
        });
      };
      processHabitats(site.habitats.areas, true);
      processHabitats(site.habitats.hedgerows, false);
      processHabitats(site.habitats.watercourses, false);
    }

    if (site.improvements) {
      const processImprovementHabitats = (habitats, isArea) => {
        if (!habitats) return;
        habitats.forEach(h => {
          let type = h.type;
          if (isArea) {
            const typeParts = h.type.split(' - ');
            type = (typeParts.length > 1 ? typeParts[1] : h.type).trim();
          }
          totalCreatedHUs += calculateImprovementHU(h.size, type, h.condition || 'N/A - Other', h.interventionType || '');
        });
      };
      processImprovementHabitats(site.improvements.areas, true);
      processImprovementHabitats(site.improvements.hedgerows, false);
      processImprovementHabitats(site.improvements.watercourses, false);
    }
  });

  const processedSites = processSitesForListView(allSites);
  const totalSites = processedSites.length;
  const totalArea = processedSites.reduce((acc, site) => acc + (site.siteSize || 0), 0);

  return {
    processedSites,
    summary: {
      totalSites,
      totalArea,
      totalBaselineHUs,
      totalCreatedHUs,
    },
  };
}