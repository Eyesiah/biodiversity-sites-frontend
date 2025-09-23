import Head from 'next/head';

export default function ChartPage({ title, children }) {
  return (
    <div style={{ backgroundColor: '#F9F6EE', padding: '1rem', height: '100vh' }}>
      <Head><title>{title}</title></Head>
      <div style={{ height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
