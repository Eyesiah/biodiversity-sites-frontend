import { calculateBaselineHU, calculateImprovementHU } from '@/lib/habitat';

export function processSiteForListView(site) {
  return {
    referenceNumber: site.referenceNumber,
    responsibleBodies: site.responsibleBodies || [],
    siteSize: site.siteSize || 0,
    allocationsCount: site.allocations ? site.allocations.length : 0,
    lpaName: site.lpaName ? site.lpaName : 'N/A',
    ncaName: site.ncaName ? site.ncaName : 'N/A',
    lnrsName: site.lnrsName || 'N/A',
    imdDecile: site.lsoa?.IMDDecile ?? 'N/A',
    position: site.latitude && site.longitude ? [site.latitude, site.longitude] : null,    
    lsoaName: site.lsoa?.name || '',
    summary: {
      responsibleBody: site.responsibleBodies?.[0] || 'N/A',
      allocationsCount: site.allocations ? site.allocations.length : 0,
      totalSize: site.siteSize || 0,
      lpaName: site.lpaName ? site.lpaName : 'N/A',
      ncaName: site.ncaName ? site.ncaName : 'N/A'
    }
  }
}

/**
 * Processes an array of raw site objects to a format suitable for the site list view.
 * This reduces the data payload sent to the client.
 * @param {Array} sites - The array of raw site objects.
 * @returns {Array} The array of processed site objects.
 */
export function processSitesForListView(sites) {
  if (!sites) return [];
  return sites.map(site => processSiteForListView(site));
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
      summary: { totalSites: 0, totalArea: 0, totalBaselineHUs: 0, totalCreatedHUs: 0, numAllocations: 0 },
    };
  }

  let totalBaselineHUs = 0;
  let totalCreatedHUs = 0;
  let totalAllocationHUs = 0;
  let numAllocations = 0;
  let baselineAreaSize = 0;
  let baselineWatercourseSize = 0;
  let baselineHedgerowSize = 0;
  let improvementsAreaSize = 0;
  let improvementsWatercourseSize = 0;
  let improvementsHedgerowSize = 0;
  let baselineParcels = 0;
  let improvementsParcels = 0;
  let allocatedParcels = 0;
  allSites.forEach(site => {
    if (site.habitats) {
      const processHabitats = (habitats, isArea, ref ) => {
        if (!habitats) return;
        habitats.forEach(h => {
          let type = h.type;
          if (isArea) {
            const typeParts = h.type.split(' - ');
            type = (typeParts.length > 1 ? typeParts[1] : h.type).trim();
          }
          totalBaselineHUs += calculateBaselineHU(h.size, type, h.condition || 'N/A - Other');
          baselineParcels += 1;
        });
      };
      processHabitats(site.habitats.areas, true);
      processHabitats(site.habitats.hedgerows, false);
      processHabitats(site.habitats.watercourses, false);

      baselineAreaSize += site.habitats.areas.reduce((acc, hab) => acc + hab.size, 0);
      baselineWatercourseSize += site.habitats.hedgerows.reduce((acc, hab) => acc + hab.size, 0);
      baselineHedgerowSize += site.habitats.watercourses.reduce((acc, hab) => acc + hab.size, 0);
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
          if (type) {
            totalCreatedHUs += calculateImprovementHU(h.size, type, h.condition || 'N/A - Other', h.interventionType || '');
            improvementsParcels += 1;
          } else {
            // Log a warning if a habitat is missing a type
            console.warn(`Skipping improvement habitat calculation due to missing type for site: ${site.referenceNumber}`);
          }
        });
      };
      processImprovementHabitats(site.improvements.areas, true);
      processImprovementHabitats(site.improvements.hedgerows, false);
      processImprovementHabitats(site.improvements.watercourses, false);
      
      improvementsAreaSize += site.improvements.areas.reduce((acc, hab) => acc + hab.size, 0);
      improvementsWatercourseSize += site.improvements.hedgerows.reduce((acc, hab) => acc + hab.size, 0);
      improvementsHedgerowSize += site.improvements.watercourses.reduce((acc, hab) => acc + hab.size, 0);
    }

    if (site.allocations)
    {
      numAllocations += site.allocations.length;
      site.allocations.forEach(alloc => {
        totalAllocationHUs += (alloc.areaUnits || 0);
        totalAllocationHUs += (alloc.hedgerowUnits || 0);
        totalAllocationHUs += (alloc.watercoursesUnits || 0);

        const processHabitats = (habitats) => {      
          if (habitats) {  
            allocatedParcels += habitats.length;
          }
        };
        processHabitats(alloc.habitats?.areas);
        processHabitats(alloc.habitats?.hedgerows);
        processHabitats(alloc.habitats?.watercourses);
      });
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
      totalAllocationHUs,
      numAllocations,
      baselineAreaSize,
      baselineWatercourseSize,
      baselineHedgerowSize,
      improvementsAreaSize,
      improvementsWatercourseSize,
      improvementsHedgerowSize,
      baselineParcels,
      improvementsParcels,
      allocatedParcels,
    },
  };
}