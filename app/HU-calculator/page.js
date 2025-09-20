import HUCalculatorForm from './HUCalculatorForm';
import { getAllConditions, getAllHabitats } from '@/lib/habitat';
import Footer from '@/components/Footer';

export default function HUCalculatorPage({}) {

  const habitats = getAllHabitats().sort();
  const conditions = getAllConditions();

  return (
    <>
      <main>
        <section>
          <HUCalculatorForm habitats={habitats} conditions={conditions}></HUCalculatorForm>
        </section>
      </main>
      <Footer lastUpdated={Date.now()} />
    </>
  )
}