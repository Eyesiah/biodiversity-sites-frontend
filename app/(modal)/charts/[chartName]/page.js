import ChartRenderer from './ChartRenderer';
import { getChartData } from '@/lib/charts';
import { fetchAllSites } from '@/lib/api';
import { calculateBaselineHU, processSiteHabitatData } from '@/lib/habitat';

// Revalidate this page at most once every hour (3600 seconds)
export const revalidate = 3600;

const chartConfig = {
    
    'imd-scattergram': {
        title: "BGS IMD Scores Cf. Allocation IMD Scores",
        chartType: 'ScatterChart',
        chartProps: {
            xAxis: { dataKey: 'allocationImdScore', name: 'Allocation IMD Score', type: 'number' },
            yAxis: { dataKey: 'siteImdScore', name: 'BGS IMD Score', type: 'number' },
            zAxis: { dataKey: 'count', name: 'Count of Pairs', range: [100, 900] }
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

          data.dynamicHeight = 10 * 90; // 10 nodes per column, 90px per node
          data.sort = false;

          return {data: data, error: null}
        }
    },
    'habitat-transfer-sankey': {
        title: "Habitat Transfer",
        chartType: 'Sankey',
        chartProps: { title: "Habitat Transfer" },
        dataFetcher: async () => {
            const allSites = await fetchAllSites(true);
            allSites.forEach(site => processSiteHabitatData(site));

            const aggregatedLinks = new Map();
            const sourceNodeTypes = new Set();
            const improvementNodeTypes = new Set();
            const habitatTypes = ['areas', 'hedgerows', 'watercourses'];

            for (const site of allSites) {
                const siteBaselineTotals = new Map();
                const siteImprovementTotals = new Map();

                // Aggregate baseline HUs for the current site
                if (site.habitats) {
                    for (const type of habitatTypes) {
                        if (site.habitats[type]) {
                            for (const habitat of site.habitats[type]) {
                                if (habitat.HUs > 0) {
                                  siteBaselineTotals.set(habitat.type, (siteBaselineTotals.get(habitat.type) || 0) + habitat.HUs);
                                  sourceNodeTypes.add(habitat.type);
                                }
                            }
                        }
                    }
                }

                // Aggregate improvement HUs for the current site
                if (site.improvements) {
                    for (const type of habitatTypes) {
                        if (site.improvements[type]) {
                            for (const habitat of site.improvements[type]) {
                                let hu = habitat.HUs;
                                if (habitat.interventionType && habitat.interventionType.toLowerCase() === 'enhanced') {
                                    hu = calculateBaselineHU(habitat.size, habitat.type, habitat.condition);
                                }
                                if (hu > 0) {
                                  siteImprovementTotals.set(habitat.type, (siteImprovementTotals.get(habitat.type) || 0) + hu);
                                  improvementNodeTypes.add(habitat.type);
                                }
                            }
                        }
                    }
                }

                const siteTotalImprovementHU = Array.from(siteImprovementTotals.values()).reduce((sum, hu) => sum + hu, 0);

                if (siteTotalImprovementHU > 0) {
                    for (const [baselineType, baselineHU] of siteBaselineTotals.entries()) {
                        for (const [improvementType, improvementHU] of siteImprovementTotals.entries()) {
                            const linkValue = baselineHU * (improvementHU / siteTotalImprovementHU);
                            if (linkValue > 0) {
                                const linkKey = `${baselineType}|${improvementType}`;
                                aggregatedLinks.set(linkKey, (aggregatedLinks.get(linkKey) || 0) + linkValue);
                            }
                        }
                    }
                }
            }

            const data = { nodes: [], links: [] };
            const baselineNodeMap = new Map();
            const improvementNodeMap = new Map();

            // Create baseline (source) nodes
            for (const type of sourceNodeTypes) {
                baselineNodeMap.set(type, data.nodes.length);
                data.nodes.push({ name: type });
            }

            // Create improvement (destination) nodes
            for (const type of improvementNodeTypes) {
                improvementNodeMap.set(type, data.nodes.length);
                data.nodes.push({ name: type });
            }

            for (const [linkKey, linkValue] of aggregatedLinks.entries()) {
                const [sourceType, improvementType] = linkKey.split('|');
                const sourceIndex = baselineNodeMap.get(sourceType);
                const targetIndex = improvementNodeMap.get(improvementType);

                if (sourceIndex !== undefined && targetIndex !== undefined) {
                    data.links.push({
                        source: sourceIndex,
                        target: targetIndex,
                        value: linkValue
                    });
                }
            }
            
            const numNodes = Math.max(sourceNodeTypes.size, improvementNodeTypes.size);
            data.dynamicHeight = Math.max(900, numNodes * 90);
            data.sort = true;

            return { data: data, error: null };
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

  if (!config) {
    return {
      title: "Chart"
    };
  }

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
