
import Footer from '@/components/Footer';
export const revalidate = 20;

export default async function Page() {
  
  const lastUpdated = Date.now();
  return (
    <>
    <main>
      <h1>Testing ISR</h1>
    </main>
    <Footer lastUpdated={lastUpdated} />
    </>
  )
}