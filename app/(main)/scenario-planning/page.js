import ScenarioPlanningContent from './ScenarioPlanningContent';
import { getAllHabitats, getAllConditions } from '@/lib/habitat';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Scenario Planning - Biodiversity Gain Sites',
  description: 'Explore potential Habitat Unit outcomes across different baseline and target conditions'
};

export default function ScenarioPlanningPage() {
  const habitats = getAllHabitats().sort();
  const conditions = getAllConditions();

  return (
    <>
      <ScenarioPlanningContent habitats={habitats} conditions={conditions} />
      <Footer lastUpdated={new Date().toISOString()} />
    </>
  );
}
