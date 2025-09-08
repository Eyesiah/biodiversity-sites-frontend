import clientPromise from '../lib/mongodb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export async function getStaticProps() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const statsData = await db
      .collection('statistics')
      .find({})
      .sort({ timestamp: 1 })
      .toArray();

    // Process data for the charts, using the most recent entry for each day
    const statsByDate = statsData.reduce((acc, stat) => {
      const date = new Date(stat.timestamp).toLocaleDateString('en-GB');
      // Since the data is sorted by timestamp, the last one in the list for a given date will be the most recent.
      acc[date] = stat;
      return acc;
    }, {});

    const processedData = Object.values(statsByDate).map(stat => {
      const date = new Date(stat.timestamp);
      const totalSites = stat.totalSites || 0;
      const numAllocations = stat.numAllocations || 0;
      const allocationsPerSite = totalSites > 0 ? numAllocations / totalSites : 0;

      return {
        ...stat,
        timestamp: date.getTime(),
        date: date.toLocaleDateString('en-GB'),
        _id: stat._id.toString(),
        allocationsPerSite,
      };
    });

    return {
      props: {
        stats: processedData,
      },
      revalidate: 3600, // Re-generate the page every hour
    };
  } catch (e) {
    console.error(e);
    return {
      props: { stats: [] },
    };
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedDate = new Date(label).toLocaleDateString('en-GB');
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label">{`Date : ${formattedDate}`}</p>
        {payload.map(pld => (
          <p key={pld.dataKey} style={{ color: pld.color }}>{`${pld.name} : ${pld.value.toLocaleString()}`}</p>
        ))}
      </div>
    );
  }

  return null;
};

export default function StatisticsPage({ stats }) {
  const renderMultiLineChart = (dataKeys, strokeColors, names, title) => (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ textAlign: 'center' }}>{title}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={stats}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('en-GB')}
          />
          <YAxis tickFormatter={(value) => value.toLocaleString()} />
          <Tooltip isAnimationActive={false} content={<CustomTooltip />} />
          <Legend />
          {dataKeys.map((dataKey, i) => (
            <Line key={dataKey} type="monotone" dataKey={dataKey} stroke={strokeColors[i]} name={names[i]} activeDot={{ r: 8 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderChart = (dataKey, strokeColor, name) => (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ textAlign: 'center' }}>{name}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={stats}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString('en-GB')}
          />
          <YAxis tickFormatter={(value) => value.toLocaleString()} />
          <Tooltip isAnimationActive={false} content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke={strokeColor} name={name} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="container">
      <main className="main">
        <h1 className="title">Historical Statistics</h1>
        {stats.length > 0 ? (
          <>
            {renderMultiLineChart(
              ['totalSites', 'numAllocations'],
              ['#8884d8', '#82ca9d'],
              ['Total Sites', 'Total Allocations'],
              'Sites and Allocations'
            )}
            {renderChart('allocationsPerSite', '#d4a6f2', 'Allocations Per Site')}
            {renderMultiLineChart(
              ['totalBaselineHUs', 'totalCreatedHUs'],
              ['#ff7300', '#00C49F'],
              ['Total Baseline Habitat Units', 'Total Created Habitat Units'],
              'Habitat Units'
            )}
            {renderChart('totalArea', '#ffc658', 'Total Area (ha)')}
          </>
        ) : (
          <p>No statistics data available yet. The first data point will be generated by the next scheduled run.</p>
        )}
      </main>
    </div>
  );
}
