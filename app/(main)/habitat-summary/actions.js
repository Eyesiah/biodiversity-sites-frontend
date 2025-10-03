"use server"

import { fetchAllSites } from '@/lib/api';
import { processSiteDataForIndex } from '@/lib/sites';

export async function GetSitesWithHabitat(habitatType, isImprovement, category) {
  
  const allSites = await fetchAllSites({ next: { revalidate: 3600 } });

  const sitesWithHabitat = allSites.filter((site) => {
    const habs = isImprovement ? site.improvements : site.habitats;
    const habList = category=="Areas" ? habs?.areas : category=="Watercourses" ? habs?.watercourses : habs?.hedgerows;
    return habList && habList.find(h => h.type == habitatType);
  });
  
  const { processedSites, summary } = processSiteDataForIndex(sitesWithHabitat);
  return processedSites;
}