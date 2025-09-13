import Head from 'next/head';
import { fetchAllSites } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites(0, true);

    const decileCounts = allSites.reduce((acc, site) => {
      const decile = site.lsoa?.IMDDecile ?? 'N/A';
      acc[decile] = (acc[decile] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(decileCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'N/A') return 1;
        if (b.name === 'N/A') return -1;
        return Number(a.name) - Number(b.name);
      });

    return {
      props: {
        chartData,
      },
      revalidate: 3600, // Re-generate the page at most once per hour
    };
  } catch (e) {
    console.error(e);
    return { props: { chartData: [], error: 'Failed to load chart data.' } };
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', '#a4de6c', '#8884d8'];

const CustomLabel = (props) => {
  const { x, y, width, value } = props;
  if (value > 0) {
    return (
      <text x={x + width / 2} y={y} dy={-4} fill="#666" textAnchor="middle" fontSize={14} fontWeight="bold">
        {value}
      </text>
    );
  }
  return null;
};

export default function ImdDecileDistributionChartPage({ chartData, error }) {
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ backgroundColor: '#F9F6EE', padding: '1rem', height: '100vh' }}>
      <Head><title>BGS IMD Decile Distribution</title></Head>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => window.close()} className="linkButton" style={{ justifySelf: 'start', fontSize: '1rem', padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
     </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 15 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" name="BGS IMD Decile Score" label={{ value: 'BGS IMD Decile Score', position: 'insideBottom', offset: -10 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count">
            <LabelList content={<CustomLabel />} />
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}