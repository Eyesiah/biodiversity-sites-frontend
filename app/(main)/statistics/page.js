import clientPromise from '@/lib/mongodb';
import Link from 'next/link';
import { StatsChart } from './StatisticsChart'
import Footer from '@/components/core/Footer';
import ChartRow from '@/components/styles/ChartRow';
import ChartItem from '@/components/styles/ChartItem';
import PrimaryTable from '@/components/styles/PrimaryTable';
import { Heading, Box } from "@chakra-ui/react"
import { ContentLayout } from '@/components/styles/ContentLayout';

export const revalidate = 43200; // 12 hours

const CommaSeperatedSiteLink = ({ site, index, count }) => {
  return (
    <>
      <Link href={`/sites/${site}`}>{site}</Link>
      {index < count - 1 && ', '}
    </>
  );
};

export const metadata = {
  title: 'BGS Register Statistics',
  description: 'View various statistics about the register to see how it has changed over time.'
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
    siteAdditions.splice(0, 0, {
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
      <ContentLayout footer={<Footer lastUpdated={Date.now()} />}>
        {stats.length > 0 ? (
          <>
            <ChartRow marginTop={5}>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['totalSites', 'numAllocations']}
                  strokeColors={['#8884d8', '#82ca9d']}
                  names={['Total Sites', 'Total Allocations']}
                  title={'Sites & Allocations'}
                />
              </ChartItem>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['allocationsPerSite']}
                  strokeColors={['#d4a6f2']}
                  names={['Allocations per site']}
                  title={'Allocations per site'}
                />
              </ChartItem>
            </ChartRow>

            <ChartRow>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['totalArea', 'baselineAreaSize', 'improvementsAreaSize']}
                  strokeColors={['#ffc658', '#ff7300', '#ffb870']}
                  names={['Total site area (ha)', 'Baseline area (ha)', 'Improvement area (ha)']}
                  title={'Site Area (ha): Total, Baseline & Improvement'}
                />
              </ChartItem>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['baselineHedgerowSize', 'improvementsHedgerowSize']}
                  strokeColors={['#00C49F', '#70d9c4']}
                  names={['Baseline hedgerow (km)', 'Improvement hedgerow (km)']}
                  title={'Hedgerow (km): Baseline vs. Improvement sizes'}
                />
              </ChartItem>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['baselineWatercourseSize', 'improvementsWatercourseSize']}
                  strokeColors={['#d4a6f2', '#e9d3f9']}
                  names={['Baseline watercourse (km)', 'Improvement watercourse (km)']}
                  title={'Watercourse (km): Baseline vs. Improvement sizes'}
                />
              </ChartItem>
            </ChartRow>

            <ChartRow>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['totalBaselineHUs', 'totalCreatedHUs', 'totalEnhancedHUs', 'totalHUGain', 'totalAllocationHUs']}
                  strokeColors={['#ff7300', '#00C49F', '#d4a6f2', '#ffc658', '#8884d8']}
                  names={['Total baseline HUs', 'Total created HUs', 'Total Enhanced HUs', 'Total HU gain', 'Total allocated HUs']}
                  title={'Habitat units'}
                />
              </ChartItem>
              <ChartItem>
                <StatsChart stats={stats}
                  dataKeys={['baselineParcels', 'improvementsParcels', 'allocatedParcels']}
                  strokeColors={['#ff7300', '#00C49F', '#d4a6f2']}
                  names={['Baseline parcels', 'Improved parcels', 'Allocated parcels']}
                  title={'Parcels count'}
                />
              </ChartItem>
            </ChartRow>

            <ChartRow>

              {siteAdditions && siteAdditions.length > 0 && (
                <ChartItem>
                  <Heading as="h2" size="lg" textAlign="center">Site Register Addition Date</Heading>
                  <Box maxHeight="500px" overflowY="auto" maxWidth='700px' margin="0 auto">
                    <PrimaryTable.Root>
                      <PrimaryTable.Header>
                        <PrimaryTable.Row>
                          <PrimaryTable.ColumnHeader>Date</PrimaryTable.ColumnHeader>
                          <PrimaryTable.ColumnHeader>Sites</PrimaryTable.ColumnHeader>
                        </PrimaryTable.Row>
                      </PrimaryTable.Header>
                      <PrimaryTable.Body>
                        {siteAdditions.map((addition) => (
                          <PrimaryTable.Row key={addition.date}>
                            <PrimaryTable.Cell>{new Date(Number(addition.date)).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</PrimaryTable.Cell>
                            <PrimaryTable.Cell>
                              {addition.sites.map((site, index) => (
                                <CommaSeperatedSiteLink key={index} site={site} index={index} count={addition.sites.length} />
                              ))}
                            </PrimaryTable.Cell>
                          </PrimaryTable.Row>
                        ))}
                      </PrimaryTable.Body>
                    </PrimaryTable.Root>
                  </Box>
                </ChartItem>
              )}
            </ChartRow>
          </>
        ) : (
          <p>No statistics data available yet. The first data point will be generated by the next scheduled run.</p>
        )}
      </ContentLayout>
    </>
  );
}