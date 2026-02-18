import ScenarioPlanningContent from './ScenarioPlanningContent';
import { getAllHabitats, getAllConditions } from '@/lib/habitat';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Habitat Unit Scenario Planning',
  description: 'Explore potential Habitat Unit outcomes across different target conditions'
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
