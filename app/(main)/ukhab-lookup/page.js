import UKHabLookupContent from './UKHabLookupContent';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'UKHab Classification Lookup',
  description: 'Cross-reference BNG habitats with the UK Habitat Classification system',
  keywords: ['UKHab', 'UK Habitat Classification', 'BNG habitats', 'habitat codes', 'habitat classification', 'biodiversity', 'habitat mapping'],
};

export default function UKHabLookupPage() {
  return (
    <>
      <UKHabLookupContent />
      <Footer lastUpdated={new Date().toISOString()} />
    </>
  );
}