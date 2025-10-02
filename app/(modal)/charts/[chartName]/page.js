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
    }
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
      
      <div style={{ backgroundColor: '#F9F6EE', padding: '1rem', height: '100vh' }}>
        <div style={{ height: '100%' }}>
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
