import APIQueryForm from './APIQueryForm';
import Footer from '@/components/core/Footer';
import { ContentLayout } from '@/components/styles/ContentLayout';

export const metadata = {
  title: 'Data Export / API Query',
  description: 'Construct API queries or export data from our custom API which gets the raw data from the Government BGS register.',
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/query',
  },
};

export default function QueryPage({}) {

  return (
    <ContentLayout footer={<Footer />}>
      <APIQueryForm />
    </ContentLayout>
  )
}
