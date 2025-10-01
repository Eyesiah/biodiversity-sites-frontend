import clientPromise from '@/lib/mongodb';
import Link from 'next/link';
import { StatsChart } from './StatisticsChart'
import Footer from '@/components/Footer';
import styles from '@/styles/Statistics.module.css';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

const CommaSeperatedSiteLink = ({site, index, count}) => {
  return (
  <>    
    <Link href={`/sites/${site}`}>{site}</Link>
    {index < count - 1 && ', '}
  </>
  );
};

export const metadata = {
  title: 'BGS register statistics',
};

export default async function StatisticsPage() {

  const lastUpdated = Date.now();
  const client = await clientPromise;
  const db = client.db();

  if (db == null) {
    return <h1>{'Error: Unable to access the stats database.'}</h1>;
  }

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

  const stats = Object.values(statsByDate).map(stat => {
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
  
  return (
    <>
      <div className="container">
        {stats.length > 0 ? (
          <>
            <div className={styles.chartRow}>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['totalSites', 'numAllocations']}
                  strokeColors={['#8884d8', '#82ca9d']}
                  names={['Total Sites', 'Total Allocations']}
                  title={'Sites and Allocations'}
                />
              </div>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['allocationsPerSite']}
                  strokeColors={['#d4a6f2']}
                  names={['Allocations Per Site']}
                  title={'Allocations Per Site'}
                />
              </div>
            </div>

            <div className={styles.chartRow}>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['totalArea', 'baselineAreaSize', 'improvementsAreaSize']}
                  strokeColors={['#ffc658', '#ff7300', '#ffb870']}
                  names={['Total Site Area (ha)', 'Baseline Area (ha)', 'Improvement Area (ha)']}
                  title={'Site Area (ha): Total, Baseline & Improvement'}
                />
              </div>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['baselineHedgerowSize', 'improvementsHedgerowSize']}
                  strokeColors={['#00C49F', '#70d9c4']}
                  names={['Baseline Hedgerow (km)', 'Improvement Hedgerow (km)']}
                  title={'Hedgerow (km): Baseline vs. Improvement Sizes'}
                />
              </div>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['baselineWatercourseSize', 'improvementsWatercourseSize']}
                  strokeColors={['#d4a6f2', '#e9d3f9']}
                  names={['Baseline Watercourse (km)', 'Improvement Watercourse (km)']}
                  title={'Watercourse (km): Baseline vs. Improvement Sizes'}
                />
              </div>
            </div>
            
            <div className={styles.chartRow}>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['totalBaselineHUs', 'totalCreatedHUs', 'totalAllocationHUs']}
                  strokeColors={['#ff7300', '#00C49F', '#d4a6f2']}
                  names={['Total Baseline Habitat Units', 'Total Created Habitat Units', 'Total Allocated Habitat Units']}
                  title={'Habitat Units'}
                />
              </div>
              <div className={styles.chartItem}>
                <StatsChart stats={stats}
                  dataKeys={['baselineParcels', 'improvementsParcels', 'allocatedParcels']}
                  strokeColors={['#ff7300', '#00C49F', '#d4a6f2']}
                  names={['Baseline Parcels', 'Improved Parcels', 'Allocated Parcels']}
                  title={'Parcels Count'}
                />
              </div>
            </div>

            <div className={styles.chartRow}>              

              { siteAdditions && siteAdditions.length > 0 && <div className={styles.chartItem}>
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
                        <td>
                          {addition.sites.map((site, index) => (
                            <CommaSeperatedSiteLink key={index} site={site} index={index} count={addition.sites.length} />
                          ))}
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
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
