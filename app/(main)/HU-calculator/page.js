import HUCalculatorForm from './HUCalculatorForm';
import { getAllConditions, getAllHabitats } from '@/lib/habitat';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Habitat unit calculator',
  description: 'Use this form to calculate how many Habitat Units a particular Parcel would have.'
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