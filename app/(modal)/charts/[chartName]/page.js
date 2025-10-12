import ChartRenderer from './ChartRenderer';
import { getChartData } from '@/lib/charts';
import { fetchAllSites } from '@/lib/api';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

const chartConfig = {
    'watercourse-allocations': {
        title: "Watercourse habitats allocated chart",
        chartType: 'AllocationPieChart',
        chartProps: { disableAggregation: true, title: "Watercourse habitats allocated - by size" },
        dataFetcher: () => getChartData((site, habitatData) => {
            if (site.allocations) {
                site.allocations.forEach(alloc => {
                    alloc.habitats?.watercourses?.forEach(habitat => {
                        if (habitat.type) {
                            habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'watercourse' };
                        }
                    });
                });
            }
        })
    },
    'allocated-habitats': {
        title: "Allocated area habitats chart",
        chartType: 'AllocationPieChart',
        chartProps: { title: "Allocated area habitats chart" },
        dataFetcher: () => getChartData((site, habitatData) => {
            if (site.allocations) {
                site.allocations.forEach(alloc => {
                    alloc.habitats?.areas?.forEach(habitat => {
                        if (habitat.type) {
                            habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'area' };
                        }
                    });
                });
            }
        })
    },
    'baseline-area-habitats': {
        title: "Baseline area habitats chart",
        chartType: 'AllocationPieChart',
        chartProps: { title: "Baseline area habitats - by size", otherLabel: "Area habitats <1%" },
        dataFetcher: () => getChartData((site, habitatData) => {
            if (site.habitats?.areas) {
                site.habitats.areas.forEach(habitat => {
                    if (habitat.type) {
                        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'area' };
                    }
                });
            }
        })
    },
    'baseline-hedgerow-habitats': {
        title: "Baseline hedgerow habitats chart",
        chartType: 'AllocationPieChart',
        chartProps: { disableAggregation: true, title: "Baseline hedgerow habitats - by size", showBreakdown: false },
        dataFetcher: () => getChartData((site, habitatData) => {
            if (site.habitats?.hedgerows) {
                site.habitats.hedgerows.forEach(habitat => {
                    if (habitat.type) {
                        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'hedgerow' };
                    }
                });
            }
        })
    },
    'baseline-watercourse-habitats': {
        title: "Baseline watercourse habitats Chart",
        chartType: 'AllocationPieChart',
        chartProps: { disableAggregation: true, title: "Baseline watercourse habitats - by size", showBreakdown: false },
        dataFetcher: () => getChartData((site, habitatData) => {
            if (site.habitats?.watercourses) {
                site.habitats.watercourses.forEach(habitat => {
                    if (habitat.type) {
                        habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'watercourse' };
                    }
                });
            }
        })
    },
    'hedgerow-allocations': {
        title: "Hedgerow habitats allocated chart",
        chartType: 'AllocationPieChart',
        chartProps: { disableAggregation: true, title: "Hedgerow habitats allocated - by size" },
        dataFetcher: () => getChartData((site, habitatData) => {
            if (site.allocations) {
                site.allocations.forEach(alloc => {
                    alloc.habitats?.hedgerows?.forEach(habitat => {
                        if (habitat.type) {
                            habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'hedgerow' };
                        }
                    });
                });
            }
        })
    },
    'improvement-habitats': {
        title: "Improvement habitats chart",
        chartType: 'ImprovementPieChart',
        chartProps: { title: "Area habitats improved - by size" },
        dataFetcher: () => getChartData((site, habitatData) => {
            site.improvements?.areas?.forEach(habitat => {
                if (habitat.type) {
                    habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'area' };
                }
            });
        })
    },
    'improvement-hedgerows': {
        title: "Improvement hedgerow habitats chart",
        chartType: 'ImprovementPieChart',
        chartProps: { title: "Hedgerow habitats improved - by size", showBreakdown: false, disableAggregation: true },
        dataFetcher: () => getChartData((site, habitatData) => {
            site.improvements?.hedgerows?.forEach(habitat => {
                if (habitat.type) {
                    habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'hedgerow' };
                }
            });
        })
    },
    'improvement-watercourses': {
        title: "Improvement watercourse habitats chart",
        chartType: 'ImprovementPieChart',
        chartProps: { title: "Watercourse habitats improved - by size", disableAggregation: true, showBreakdown: false },
        dataFetcher: () => getChartData((site, habitatData) => {
            site.improvements?.watercourses?.forEach(habitat => {
                if (habitat.type) {
                    habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'watercourse' };
                }
            });
        })
    },
    'imd-decile-distribution': {
        title: "IMD decile distribution",
        chartType: 'BarChart',
        chartProps: {},
        dataFetcher: async () => {
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
                return { data: chartData, error: null };
            } catch (e) {
                console.error(e);
                return { data: [], error: 'Failed to load chart data.' };
            }
        }
    },
    'imd-scattergram': {
        title: "BGS IMD Scores Cf. Allocation IMD Scores",
        chartType: 'ScatterChart',
        chartProps: {
            xAxis: { dataKey: 'allocationImdScore', name: 'Allocation IMD Score', type: 'number' },
            yAxis: { dataKey: 'siteImdScore', name: 'BGS IMD Score', type: 'number' },
            zAxis: { dataKey: 'count', name: 'Count of Pairs', range: [50, 800] }
        },
        dataFetcher: async () => {
            try {
                const allSites = await fetchAllSites(true, true);
                const scorePairs = allSites.reduce((acc, site) => {
                    const siteScore = site.lsoa?.IMDScore;
                    if (siteScore && site.allocations) {
                        site.allocations.forEach(alloc => {
                            const allocScore = alloc.lsoa?.IMDScore;
                            if (allocScore) {
                                const key = `${siteScore}-${allocScore}`;
                                acc[key] = (acc[key] || 0) + 1;
                            }
                        });
                    }
                    return acc;
                }, {});

                const chartData = Object.entries(scorePairs).map(([key, count]) => ({ siteImdScore: Number(key.split('-')[0]), allocationImdScore: Number(key.split('-')[1]), count }));

                return { data: chartData, error: null };

            } catch (e) {
                console.error(e);
                return { data: [], error: 'Failed to load chart data.' };
            }
        }
    },
    'imd-sankey': {
        title: "IMD Transfer",
        chartType: 'Sankey',
        chartProps: { title: "IMD Transfer" },
        dataFetcher: async () =>  {         

          const allSites = await fetchAllSites(true, true);
          const IMDPairMap = new Map();
    
          allSites.forEach((site) => {
            const siteScore = site.lsoa?.IMDDecile;
            if (siteScore && site.allocations) {
                site.allocations.forEach(alloc => {
                    const allocScore = alloc.lsoa?.IMDDecile;
                    if (allocScore) {
                        let allocMap = IMDPairMap.get(allocScore);
                        if (allocMap == null) {
                          allocMap = new Map();
                          IMDPairMap.set(allocScore, allocMap);
                        }
                        let allocSize = allocMap.get(siteScore) ;
                        if (allocSize == null) {
                          allocSize = 0;
                        }
                        allocSize += alloc.areaUnits + alloc.hedgerowUnits + alloc.watercoursesUnits;
                        allocMap.set(siteScore, allocSize);
                    }
                });
            }
          });

          const data = {
            nodes: [],
            links: []
          };

          // create the nodes pre-sorted
          // source (alloc) nodes
          for (let i = 1; i <= 10; i++) {
            data.nodes.push({name: `Allocation Decile ${i}`});
          }
          // dest (site) nodes
          for (let i = 1; i <= 10; i++) {
            data.nodes.push({name: `BNG Decile ${i}`});
          }

          IMDPairMap.forEach((sites, allocScore) => {
            sites.forEach((units, siteScore) => {
              data.links.push({source: allocScore - 1, target: siteScore + 9, value: units});
            });
          });

          const sourceNodesWithLinks = new Set();
          data.links.forEach(link => {
              sourceNodesWithLinks.add(link.source);
          });

          // Add dummy links for source nodes without any outgoing links
          for (let i = 0; i < 10; i++) {
              if (!sourceNodesWithLinks.has(i)) {
                  // Add a dummy link to the first destination node to anchor it
                  data.links.push({ source: i, target: 10, value: 0 });
              }
          }

          return {data: data, error: null}
        }
    },
};

export async function generateStaticParams() {
  return Object.keys(chartConfig).map((chartName) => ({
    chartName,
  }));
}

export async function generateMetadata({ params }) {

  const { chartName } = await params;
  const config = chartConfig[chartName];

  return {
    title: config.title
  };
}

export default async function Chart({ params }) {
    const { chartName } = await params;
    const config = chartConfig[chartName];

    if (!config) {
        // TODO: render a 404 page
        return <div>Chart not found</div>;
    }

    const { data, error } = await config.dataFetcher();

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
      
        <div style={{ backgroundColor: '#98917eff', padding: '1rem', height: '100vh' }}>
        <div style={{ height: 'calc(100% - 2rem)' }}>
          <ChartRenderer
            chartType={config.chartType}
            data={data}
            chartProps={config.chartProps}
            title={config.title}
        />
        </div>
      </div>

        
    );
}
