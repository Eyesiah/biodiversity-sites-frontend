import styles from '@/styles/SiteDetails.module.css';
import HUCalculatorForm from './HUCalculatorForm';
import { getAllConditions, getAllHabitats } from '@/lib/habitat';

export default function HUCalculatorPage({}) {

  const habitats = getAllHabitats().sort();
  const conditions = getAllConditions();

  return (
    <section>
      <HUCalculatorForm habitats={habitats} conditions={conditions}></HUCalculatorForm>
    </section>
  )
}