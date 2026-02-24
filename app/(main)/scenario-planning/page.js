import { calculateScenarios } from './actions';
import { getAllHabitats, getAllConditions, getAllHabitatGroups, getHabitatsByGroup, getCompatibleHabitatsForEnhancement } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import ScenarioPlanningContent from './ScenarioPlanningContent';

export const metadata = {
  title: 'Habitat Unit Scenario Planning',
  description: 'Explore potential Habitat Unit outcomes across different target conditions',
  keywords: ['scenario planning', 'habitat unit scenarios', 'BNG scenario', 'biodiversity outcomes', 'habitat enhancement', 'habitat creation', 'BNG planning'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/scenario-planning',
  },
};

export default function ScenarioPlanningPage() {
  const habitats = getAllHabitats().sort();
  const conditions = getAllConditions();
  const broadHabitats = getAllHabitatGroups();
  
  // Pre-compute habitats by group to avoid passing functions to client component
  const habitatsByGroup = {};
  broadHabitats.forEach(group => {
    habitatsByGroup[group] = getHabitatsByGroup(group);
  });

  // Pre-compute compatible habitats for enhancement
  const allCompatibleHabitats = getCompatibleHabitatsForEnhancement(null);

  return (
    <>
      <ScenarioPlanningContent 
        habitats={habitats} 
        conditions={conditions} 
        broadHabitats={broadHabitats}
        habitatsByGroup={habitatsByGroup}
        allCompatibleHabitats={allCompatibleHabitats}
      />
      <Footer lastUpdated={new Date().toISOString()} />
    </>
  );
}
