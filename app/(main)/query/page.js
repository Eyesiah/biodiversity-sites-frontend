import APIQueryForm from './APIQueryForm';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Data Export / API Query',
  description: 'Construct API queries or just export data from our API'
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