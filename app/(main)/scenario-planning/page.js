import ScenarioPlanningContent from './ScenarioPlanningContent';
import { getAllHabitats, getAllConditions, getAllHabitatGroups, getHabitatsByGroup } from '@/lib/habitat';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Habitat Unit Scenario Planning',
  description: 'Explore potential Habitat Unit outcomes across different target conditions'
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

  return (
    <>
      <ScenarioPlanningContent 
        habitats={habitats} 
        conditions={conditions} 
        broadHabitats={broadHabitats}
        habitatsByGroup={habitatsByGroup}
      />
      <Footer lastUpdated={new Date().toISOString()} />
    </>
  );
}
