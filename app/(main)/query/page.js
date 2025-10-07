import APIQueryForm from './APIQueryForm';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Data Export / API Query',
  description: 'Construct API queries or export data from our custom API which gets the raw data from the Government BGS register.'
};

export default function QueryPage({}) {

  return (
    <>
      <div>
        <section>
          <APIQueryForm></APIQueryForm>
        </section>
      </div>
      <Footer />
    </>
  )
}