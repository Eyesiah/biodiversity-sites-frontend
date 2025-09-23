import { fetchAllSites } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import ChartPage from '@/components/ChartPage';

export async function getStaticProps() {
  try {
    const allSites = await fetchAllSites(true);

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
      revalidate: 3600,
    };
  } catch (e) {
    console.error(e);
    return { props: { chartData: [], error: 'Failed to load chart data.' } };
  }
}

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
    <ChartPage title="IMD Decile Distribution">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 15 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" name="BGS IMD Decile Score" label={{ value: 'BGS IMD Decile Score', position: 'insideBottom', offset: -10 }} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#dcab1bff">
            <LabelList content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPage>
  );
}
