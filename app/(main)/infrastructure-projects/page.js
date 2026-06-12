import Footer from '@/components/core/Footer';
import { fetchNSIPGeoJson, fetchNSIPDevelopers, fetchNSIPRegisterRows } from '@/lib/nsip';
import { processNSIPData } from '@/lib/nsip-data';
import InfrastructureProjectsContent from './InfrastructureProjectsContent';

export const revalidate = 86400; // 24 hours

export const metadata = {
  title: 'Nationally Significant Infrastructure Projects',
  description: 'View Nationally Significant Infrastructure Projects (NSIPs) across England, including energy, transport, water and waste projects.',
  keywords: ['NSIP', 'Nationally Significant Infrastructure Projects', 'infrastructure', 'planning', 'energy', 'transport', 'waste', 'water'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/infrastructure-projects',
  },
};

export default async function InfrastructureProjectsPage() {
  try {
    const [geoJson, developers, registerRows] = await Promise.all([
      fetchNSIPGeoJson(),
      fetchNSIPDevelopers(),
      fetchNSIPRegisterRows(),
    ]);
    const projects = processNSIPData(geoJson, developers, registerRows);

    return (
      <>
        <InfrastructureProjectsContent projects={projects} />
        <Footer lastUpdated={new Date().toISOString()} />
      </>
    );
  } catch (e) {
    console.error('Error in InfrastructureProjectsPage:', e);
    return (
      <>
        <InfrastructureProjectsContent projects={[]} error={e.message} />
        <Footer lastUpdated={new Date().toISOString()} />
      </>
    );
  }
}
