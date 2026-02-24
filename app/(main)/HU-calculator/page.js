import { calcHU } from './actions';
import { getAllConditions, getAllHabitats, getAllHabitatGroups, getHabitatsByGroup, getCompatibleHabitatsForEnhancement } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import { ContentLayout } from '@/components/styles/ContentLayout';
import HabitatForm, { calculatorInitialState } from '@/components/habitat-form/HabitatForm';

export const metadata = {
  title: 'Habitat unit calculator',
  description: 'Use this form to calculate how many Habitat Units a particular Parcel would have.',
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/HU-calculator',
  },
};

export default function HUCalculatorPage({}) {

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
    <ContentLayout footer={<Footer lastUpdated={Date.now()} />}>
      <HabitatForm 
        mode="calculator"
        formAction={calcHU}
        initialState={calculatorInitialState}
        habitats={habitats} 
        conditions={conditions}
        broadHabitats={broadHabitats}
        habitatsByGroup={habitatsByGroup}
        allCompatibleHabitats={allCompatibleHabitats}
      />
    </ContentLayout>
  )
}
