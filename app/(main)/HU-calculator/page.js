import HUCalculatorForm from './HUCalculatorForm';
import { getAllConditions, getAllHabitats } from '@/lib/habitat';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Habitat Unit Calculator',
};

export default function HUCalculatorPage({}) {

  const habitats = getAllHabitats().sort();
  const conditions = getAllConditions();

  return (
    <>
      <div>
        <section>
          <HUCalculatorForm habitats={habitats} conditions={conditions}></HUCalculatorForm>
        </section>
      </div>
      <Footer lastUpdated={Date.now()} />
    </>
  )
}