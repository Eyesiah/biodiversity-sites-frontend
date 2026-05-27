import Footer from '@/components/core/Footer';
import MetricFileUpload from './MetricFileUpload';
import { ContentLayout } from '@/components/styles/ContentLayout';

export const metadata = {
  title: 'Statutory Metric Viewer',
  description: 'Upload a statutory biodiversity metric calculation file (.xlsm or .xlsx) to view and explore all its parsed habitat, hedgerow, and watercourse data.',
  keywords: [
    'statutory metric viewer', 'BNG metric', 'biodiversity metric calculator',
    'habitat units', 'BNG calculation', 'metric file parser', 'xlsm parser',
  ],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/metric-calculator',
  },
};

export default function MetricCalculatorPage() {
  return (
    <ContentLayout footer={<Footer lastUpdated={new Date().toISOString()} />}>
      <MetricFileUpload />
    </ContentLayout>
  );
}
