import HUCalculatorForm from './HUCalculatorForm';
import { getAllConditions, getAllHabitats, getAllHabitatGroups, getHabitatsByGroup } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import { ContentLayout } from '@/components/styles/ContentLayout';

export const metadata = {
  title: 'Habitat unit calculator',
  description: 'Use this form to calculate how many Habitat Units a particular Parcel would have.'
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

  return (
    <ContentLayout footer={<Footer lastUpdated={Date.now()} />}>
      <HUCalculatorForm 
        habitats={habitats} 
        conditions={conditions}
        broadHabitats={broadHabitats}
        habitatsByGroup={habitatsByGroup}
      />
    </ContentLayout>
  )
}
