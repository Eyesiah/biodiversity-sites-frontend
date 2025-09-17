import clientPromise from '@/lib/mongodb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export async function getStaticProps() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const statsData = await db
      .collection('statistics')
      .find({})
      .sort({ timestamp: 1 })
      .toArray();

    // gather the site additions by date first to collate entries together on the same day
    let siteAdditionsMap = {};
    statsData.forEach((stat) => {
      if (stat.newSites && stat.newSites.length > 0) {
        const date = new Date(stat.timestamp);
        var noTime = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        if (siteAdditionsMap[noTime] == null) {
          siteAdditionsMap[noTime] = [];
        }
        siteAdditionsMap[noTime].push(...stat.newSites);
      }
    });
    let siteAdditions = [];
    for (const [date, list] of Object.entries(siteAdditionsMap)) {
      siteAdditions.push({
        date: date,
        sites: list
      });
    };

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
        siteAdditions
      },
      revalidate: 3600, // Re-generate the page every hour
    };
  } catch (e) {
    console.error(e);
    return {
      props: { stats: [], siteAdditions: [] },
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

export default function StatisticsPage({ stats, siteAdditions }) {
  const renderMultiLineChart = (dataKeys, strokeColors, names, title) => {
    const filteredData = stats.filter(stat =>
      dataKeys.some(key => stat[key] != null && stat[key] !== 0)
    );

    // Replace 0 with null for better line chart rendering (to create gaps)
    const chartData = filteredData.map(stat => {
      const newStat = { ...stat };
      dataKeys.forEach(key => {
        if (newStat[key] === 0) {
          newStat[key] = null;
        }
      });
      return newStat;
    });

    if (chartData.length === 0) {
      return (
        <div>
          <h2 style={{ textAlign: 'center' }}>{title}</h2>
          <p style={{ textAlign: 'center', height: '400px' }}>No data available for this chart.</p>
        </div>
      );
    }

    return (
      <div>
        <h2 style={{ textAlign: 'center' }}>{title}</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
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
              <Line connectNulls key={dataKey} type="monotone" dataKey={dataKey} stroke={strokeColors[i]} name={names[i]} activeDot={{ r: 8 }} strokeWidth={3} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="container">
      <main className="main">
        <h1 className="title">BGS Register Statistics</h1>
        {stats.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', marginBottom: '40px' }}>
              <div style={{ flex: 1, marginRight: '20px' }}>
                {renderMultiLineChart(
                  ['totalSites', 'numAllocations'],
                  ['#8884d8', '#82ca9d'],
                  ['Total Sites', 'Total Allocations'],
                  'Sites and Allocations'
                )}
              </div>
              <div style={{ flex: 1 }}>
                {renderMultiLineChart(
                  ['allocationsPerSite'],
                  ['#d4a6f2'],
                  ['Allocations Per Site'],
                  'Allocations Per Site'
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
              <div style={{ flex: 1, marginRight: '20px' }}>
                {renderMultiLineChart(
                  ['totalArea', 'baselineAreaSize', 'improvementsAreaSize'],
                  ['#ffc658', '#ff7300', '#ffb870'],
                  ['Total Site Area (ha)', 'Baseline Area (ha)', 'Improvement Area (ha)'],
                  'Site Area (ha): Total, Baseline & Improvement'
                )}
              </div>
              <div style={{ flex: 1, marginRight: '20px' }}>
                {renderMultiLineChart(
                  ['baselineHedgerowSize', 'improvementsHedgerowSize'],
                  ['#00C49F', '#70d9c4'],
                  ['Baseline Hedgerow (km)', 'Improvement Hedgerow (km)'],
                  'Hedgerow (km): Baseline vs. Improvement Sizes'
                )}
              </div>
              <div style={{ flex: 1 }}>
                {renderMultiLineChart(
                  ['baselineWatercourseSize', 'improvementsWatercourseSize'],
                  ['#d4a6f2', '#e9d3f9'],
                  ['Baseline Watercourse (km)', 'Improvement Watercourse (km)'],
                  'Watercourse (km): Baseline vs. Improvement Sizes'
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
              <div style={{ flex: 1, marginRight: '20px' }}>
                {renderMultiLineChart(
                  ['totalBaselineHUs', 'totalCreatedHUs', 'totalAllocationHUs'],
                  ['#ff7300', '#00C49F', '#d4a6f2'],
                  ['Total Baseline Habitat Units', 'Total Created Habitat Units', 'Total Allocated Habitat Units'],
                  'Habitat Units'
                )}
              </div>
              <div style={{ flex: 1, marginRight: '20px' }}>
                {renderMultiLineChart(
                  ['baselineParcels', 'improvementsParcels', 'allocatedParcels'],
                  ['#ff7300', '#00C49F', '#d4a6f2'],
                  ['Baseline Parcels', 'Improved Parcels', 'Allocated Parcels'],
                  'Parcels Count'
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
              

              { siteAdditions && siteAdditions.length > 0 && <div style={{ flex: 1, marginRight: '20px' }}>
                <h2>Site Register Addition Date</h2>
                <table className="site-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteAdditions.map((addition) => (
                      <tr key={addition.date}>
                        <td>{new Date(Number(addition.date)).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</td>
                        <td>{addition.sites.map((site, index) => (
                          <>
                            <Link href={`/sites/${site}`}>{site}</Link>
                            {index < addition.sites.length - 1 && ', '}
                          </> ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div> }
            </div>
          </>
        ) : (
          <p>No statistics data available yet. The first data point will be generated by the next scheduled run.</p>
        )}
      </main>
    </div>
  );
}
