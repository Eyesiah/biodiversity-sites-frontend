import { calculateScenarios } from './actions';
import { getAllHabitatsWithOriginalCase, getAllConditions, getAllHabitatGroups, getHabitatsByGroup, getCompatibleHabitatsForEnhancement, getOriginalHabitatNamesMap, getDistinctivenessScoresMap, getOriginalCaseHabitatName } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import ScenarioPlanningContent from './ScenarioPlanningContent';

export const metadata = {
  title: 'Habitat Unit Planner',
  description: 'Explore potential Habitat Unit outcomes across different target conditions',
  keywords: ['scenario planning', 'habitat unit scenarios', 'BNG scenario', 'biodiversity outcomes', 'habitat enhancement', 'habitat creation', 'BNG planning'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/scenario-planning',
  },
};

export default function ScenarioPlanningPage() {
  const habitats = getAllHabitatsWithOriginalCase();
  const conditions = getAllConditions();
  const broadHabitats = getAllHabitatGroups();
  
  // Pre-compute habitats by group to avoid passing functions to client component
  const habitatsByGroup = {};
  broadHabitats.forEach(group => {
    // Get habitats for this group with original case
    const groupHabitats = getHabitatsByGroup(group);
    habitatsByGroup[group] = groupHabitats.map(habitat => {
      // Convert to original case using the map function
      return getOriginalCaseHabitatName(habitat);
    });
  });

  // Pre-compute compatible habitats for enhancement with original case
  const allCompatibleHabitats = getCompatibleHabitatsForEnhancement(null).map(habitat => 
    getOriginalCaseHabitatName(habitat)
  );

  // Get habitat maps for client-side use
  const originalHabitatNamesMap = getOriginalHabitatNamesMap();
  const distinctivenessScoresMap = getDistinctivenessScoresMap();

  return (
    <>
      <ScenarioPlanningContent 
        habitats={habitats} 
        conditions={conditions} 
        broadHabitats={broadHabitats}
        habitatsByGroup={habitatsByGroup}
        allCompatibleHabitats={allCompatibleHabitats}
        originalHabitatNamesMap={originalHabitatNamesMap}
        distinctivenessScoresMap={distinctivenessScoresMap}
      />
      <Footer lastUpdated={new Date().toISOString()} />
    </>
  );
}
