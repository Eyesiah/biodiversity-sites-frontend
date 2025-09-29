
import Footer from '@/components/Footer';
export const revalidate = 20;

export default async function Page() {
  
  const lastUpdated = Date.now();
  return (
    <>
    <div>
      <h1>Testing ISR</h1>
    </div>
    <Footer lastUpdated={lastUpdated} />
    </>
  )
}