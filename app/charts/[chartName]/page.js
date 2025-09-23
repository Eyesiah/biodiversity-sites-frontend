import { AllocationPieChart } from '@/components/AllocationPieChart';
import { ImprovementPieChart } from '@/components/ImprovementPieChart';
import { getChartData } from '@/lib/charts';
import { fetchAllSites } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import Head from 'next/head';

const chartConfig = {
    'watercourse-allocations': {
        title: "Watercourse Habitats Allocated Chart",
        chartComponent: AllocationPieChart,
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
        title: "Allocated Area Habitats Chart",
        chartComponent: AllocationPieChart,
        chartProps: { title: "Allocated Area Habitats Chart" },
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
        title: "Baseline Area Habitats Chart",
        chartComponent: AllocationPieChart,
        chartProps: { title: "Baseline Area Habitats - by size", otherLabel: "Area habitats <1%" },
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
        title: "Baseline Hedgerow Habitats Chart",
        chartComponent: AllocationPieChart,
        chartProps: { disableAggregation: true, title: "Baseline Hedgerow Habitats - by size", showBreakdown: false },
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
        title: "Baseline Watercourse Habitats Chart",
        chartComponent: AllocationPieChart,
        chartProps: { disableAggregation: true, title: "Baseline Watercourse Habitats - by size", showBreakdown: false },
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
        title: "Hedgerow Habitats Allocated Chart",
        chartComponent: AllocationPieChart,
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
        title: "Improvement Habitats Chart",
        chartComponent: ImprovementPieChart,
        chartProps: { title: "Area Habitats Improved - by size" },
        dataFetcher: () => getChartData((site, habitatData) => {
            site.improvements?.areas?.forEach(habitat => {
                if (habitat.type) {
                    habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'area' };
                }
            });
        })
    },
    'improvement-hedgerows': {
        title: "Improvement Hedgerow Habitats Chart",
        chartComponent: ImprovementPieChart,
        chartProps: { title: "Hedgerow Habitats Improved - by size", showBreakdown: false, disableAggregation: true },
        dataFetcher: () => getChartData((site, habitatData) => {
            site.improvements?.hedgerows?.forEach(habitat => {
                if (habitat.type) {
                    habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'hedgerow' };
                }
            });
        })
    },
    'improvement-watercourses': {
        title: "Improvement Watercourse Habitats Chart",
        chartComponent: ImprovementPieChart,
        chartProps: { title: "Watercourse Habitats Improved - by size", disableAggregation: true, showBreakdown: false },
        dataFetcher: () => getChartData((site, habitatData) => {
            site.improvements?.watercourses?.forEach(habitat => {
                if (habitat.type) {
                    habitatData[habitat.type] = { value: (habitatData[habitat.type]?.value || 0) + habitat.size, module: 'watercourse' };
                }
            });
        })
    },
    'imd-decile-distribution': {
        title: "IMD Decile Distribution",
        chartComponent: ({ data }) => (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 40, right: 30, left: 20, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" name="BGS IMD Decile Score" label={{ value: 'BGS IMD Decile Score', position: 'insideBottom', offset: -10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#dcab1bff">
                        <LabelList content={CustomLabel} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        ),
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

export default async function Chart({ params }) {
    const { chartName } = params;
    const config = chartConfig[chartName];

    if (!config) {
        // TODO: render a 404 page
        return <div>Chart not found</div>;
    }

    const { data, error } = await config.dataFetcher();

    if (error) {
        return <div>Error: {error}</div>;
    }

    const ChartComponent = config.chartComponent;

    return (    
      <div style={{ backgroundColor: '#F9F6EE', padding: '1rem', height: '100vh' }}>
        <Head><title>{title}</title></Head>
        <div style={{ height: '100%' }}>
            <ChartComponent data={data} {...config.chartProps} />
        </div>
      </div>
    );
}

export async function generateStaticParams() {
  return Object.keys(chartConfig).map((chartName) => ({
    chartName,
  }));
}
