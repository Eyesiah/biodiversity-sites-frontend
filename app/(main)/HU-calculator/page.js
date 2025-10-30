import HUCalculatorForm from './HUCalculatorForm';
import { getAllConditions, getAllHabitats } from '@/lib/habitat';
import Footer from '@/components/core/Footer';
import { ContentLayout } from '@/components/styles/ContentLayout';

export const metadata = {
  title: 'Habitat unit calculator',
  description: 'Use this form to calculate how many Habitat Units a particular Parcel would have.'
};

export default function HUCalculatorPage({}) {

  const habitats = getAllHabitats().sort();
  const conditions = getAllConditions();

  return (
    <ContentLayout footer={<Footer lastUpdated={Date.now()} />}>
      <HUCalculatorForm habitats={habitats} conditions={conditions} />
    </ContentLayout>
  )
}
