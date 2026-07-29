import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ReferenceLine, BarChart, Bar, LabelList } from 'recharts';
import ChartRow from '@/components/styles/ChartRow';
import ChartItem from '@/components/styles/ChartItem';
import { Heading, Flex, Box, Text } from '@chakra-ui/react';
import Tooltip from '@/components/ui/Tooltip';
import AUTHORITY_TIERS from '@/data/authority-tiers.json';

const makeBarLabel = (fmt = String) => {
  const BarLabel = ({ x, y, width, height, value }) => {
    if (value == null || value === 0) return null;
    const inside = height > 18;
    return (
      <text
        x={x + width / 2}
        y={inside ? y + height / 2 : y - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fill={inside ? '#fff' : '#555'}
      >
        {fmt(value)}
      </text>
    );
  };
  BarLabel.displayName = 'BarLabel';
  return BarLabel;
};

const CATEGORY_ORDER = ['London borough', 'Metropolitan district', 'Other urban unitary', 'Non-urban'];
const CATEGORY_COLORS = {
  'London borough': '#2d6e42',
  'Metropolitan district': '#6ac98fff',
  'Other urban unitary': '#e2742fff',
  'Non-urban': '#999999',
};
const TIER_LABELS = {
  'London borough': 'London boroughs',
  'Metropolitan district': 'Metropolitan districts',
  'Other urban unitary': 'Other unitary authorities',
  'Non-urban': 'Non-urban authorities',
};

const BIN_DEFS = [
  { key: '0 – 0.01',   test: t => t <  0.01 },
  { key: '0.01 – 0.1', test: t => t <  0.1  },
  { key: '0.1 – 1',    test: t => t <  1     },
  { key: '1 – 10',     test: t => t < 10     },
  { key: '10 – 100',   test: t => t < 100    },
  { key: 'over 100',   test: () => true       },
];

export default function AllocationAnalysis({ allocations }) {

  const distanceByCategoryData = useMemo(() => {
    const groups = Object.fromEntries(CATEGORY_ORDER.map(c => [c, []]));

    allocations.forEach(alloc => {
      if (typeof alloc.d !== 'number' || alloc.d <= 0) return;
      const name = (alloc.lpa || '').replace(/ LPA$/i, '').trim();
      const type = AUTHORITY_TIERS[name] || 'Non-urban';
      groups[type].push(alloc.d);
    });

    CATEGORY_ORDER.forEach(c => groups[c].sort((a, b) => a - b));

    const counts = Object.fromEntries(CATEGORY_ORDER.map(c => [c, groups[c].length]));

    const med = arr => {
      if (arr.length === 0) return null;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };
    const medians = Object.fromEntries(CATEGORY_ORDER.map(c => [c, med(groups[c])]));

    // Merge all distances, then compute cumulative % per category at each point
    const allDistances = [...new Set(Object.values(groups).flat())].sort((a, b) => a - b);
    if (allDistances.length === 0) return { data: [], counts, medians };

    const pointers = Object.fromEntries(CATEGORY_ORDER.map(c => [c, 0]));
    const data = allDistances.map(d => {
      const point = { distance: d };
      CATEGORY_ORDER.forEach(c => {
        const sorted = groups[c];
        while (pointers[c] < sorted.length && sorted[pointers[c]] <= d) pointers[c]++;
        point[c] = sorted.length > 0 ? (pointers[c] / sorted.length) * 100 : null;
      });
      return point;
    });

    return { data, counts, medians };
  }, [allocations]);

  const habitatUnitDistributionData = useMemo(() => {
    if (allocations.length === 0) return [];
    const bins = Object.fromEntries(BIN_DEFS.map(b => [b.key, { name: b.key, count: 0, sum: 0 }]));
    allocations.forEach(alloc => {
      const total = (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
      const bin = BIN_DEFS.find(b => b.test(total));
      bins[bin.key].count++;
      bins[bin.key].sum += total;
    });
    return BIN_DEFS.map(b => bins[b.key]);
  }, [allocations]);

  const huSummary = useMemo(() => {
    const area = allocations.reduce((s, a) => s + (a.au || 0), 0);
    const hedgerow = allocations.reduce((s, a) => s + (a.hu || 0), 0);
    const watercourse = allocations.reduce((s, a) => s + (a.wu || 0), 0);
    return { count: allocations.length, total: area + hedgerow + watercourse, area, hedgerow, watercourse };
  }, [allocations]);

  const imdDistributionData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      decile: `${i + 1}`,
      developmentSites: 0,
      bgsSites: 0,
    }));

    allocations.forEach(alloc => {
      if (typeof alloc.imd === 'number' && alloc.imd >= 1 && alloc.imd <= 10) {
        bins[alloc.imd - 1].developmentSites++;
      }
      if (typeof alloc.simd === 'number' && alloc.simd >= 1 && alloc.simd <= 10) {
        bins[alloc.simd - 1].bgsSites++;
      }
    });

    return bins;
  }, [allocations]);

  const srDistributionData = useMemo(() => {
    const totalAllocations = allocations.length > 0 ? allocations.length : 1;

    const bins = {
      'Within': { category: 'Within', lpa: 0, lnrs: 0, outside: 0 },
      'Neighbouring': { category: 'Neighbouring', lpa: 0, lnrs: 0, outside: 0 },
      'Outside': { category: 'Outside', lpa: 0, lnrs: 0, outside: 0 },
    };

    allocations.forEach(alloc => {
      if (alloc.sr?.cat) {
        const category = alloc.sr.cat;
        if (bins[category]) {
          if (category === 'Outside') {
            bins[category].outside++;
          } else {
            const from = alloc.sr.from || 'LPA';
            if (from === 'LPA') bins[category].lpa++;
            if (from === 'LNRS') bins[category].lnrs++;
          }
        }
      }
    });

    return Object.values(bins).map(bin => ({
      ...bin,
      lpaPercentage: (bin.lpa / totalAllocations) * 100,
      lnrsPercentage: (bin.lnrs / totalAllocations) * 100,
      outsidePercentage: (bin.outside / totalAllocations) * 100,
    }));
  }, [allocations]);

  return (
    <>
      <ChartRow>
        <ChartItem>
          <Heading as="h4" size="md" textAlign="center">
            <Tooltip text="Each line shows the cumulative % of allocations whose development-to-offset distance is at or below each value (x-axis, log scale). Lines are split by the built-up character of the development site's LPA, using the classification from the Bristol Tree Forum article 'Where does the biodiversity go?': London boroughs (26 inner and outer London boroughs); Metropolitan districts (35 boroughs across Greater Manchester, Merseyside, West Midlands, West Yorkshire, South Yorkshire and Tyne & Wear); Other unitary authorities (30 substantially built-up unitary authorities outside London and the metropolitan areas); Non-urban authorities (all other authorities — largely rural unitaries such as Cornwall, Wiltshire and North Yorkshire, plus district and county councils, national parks and development corporations).">
              Cumulative distance distribution — development site to BGS offset site (log scale)
            </Tooltip>
          </Heading>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={distanceByCategoryData.data} margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="distance"
                scale="log"
                domain={['dataMin', 'dataMax']}
                ticks={[1, 3, 10, 30, 100, 300]}
                tickFormatter={v => v}
                label={{ value: 'Distance from development to allocated habitat (km, log scale)', position: 'insideBottom', offset: -25 }}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                label={{ value: '% of allocations at or below', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <RechartsTooltip
                formatter={(value, name) => value != null ? [`${formatNumber(value, 1)}%`, name] : [null, name]}
                labelFormatter={label => `Distance: ${formatNumber(label, 1)} km`}
              />
              <ReferenceLine y={50} stroke="#bbb" strokeDasharray="4 4" />
              <Legend verticalAlign="top" />
              {CATEGORY_ORDER.map(cat => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={CATEGORY_COLORS[cat]}
                  dot={false}
                  strokeWidth={2}
                  name={`${TIER_LABELS[cat]} (n=${distanceByCategoryData.counts?.[cat] ?? 0})`}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <Text fontSize="0.8rem" color="gray.500" textAlign="center" mt={1}>
            Median distances — {CATEGORY_ORDER.map((cat, i) => (
              <span key={cat}>
                {i > 0 ? ' · ' : ''}
                {TIER_LABELS[cat]}: {distanceByCategoryData.medians?.[cat] != null
                  ? `${formatNumber(distanceByCategoryData.medians[cat], 0)} km`
                  : 'n/a'}
              </span>
            ))}
          </Text>
        </ChartItem>
        <ChartItem>
          <Heading as="h4" size="md" textAlign="center">
            <Tooltip text="Each allocation is placed into a bin based on its total habitat units (area + hedgerow + watercourse HUs combined). The green bars show the number of allocations in each bin (left axis); the orange bars show the total habitat units those allocations represent (right axis). Bins use a logarithmic scale (0–0.01, 0.01–0.1, 0.1–1, 1–10, 10–100, over 100 HUs) to reveal the distribution across allocations of very different sizes.">
              Habitat Unit (HU) Distribution
            </Tooltip>
          </Heading>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={habitatUnitDistributionData} margin={{ top: 20, right: 60, left: 20, bottom: 5 }} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" allowDecimals={false} tickFormatter={(v) => formatNumber(v, 0)} label={{ value: 'Number of allocations', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatNumber(v, 0)} label={{ value: 'Habitat units', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
              <RechartsTooltip formatter={(value, name, props) => {
                if (name === 'Allocations (count)') {
                  return [`${formatNumber((value / huSummary.count) * 100, 1)}% of allocations`, name];
                }
                return [`${formatNumber((value / huSummary.total) * 100, 1)}% of habitat units`, name];
              }} />
              <Legend verticalAlign="top" />
              <Bar yAxisId="left" dataKey="count" fill="#6ac98fff" name="Allocations (count)">
                <LabelList dataKey="count" content={makeBarLabel(v => formatNumber(v, 0))} />
              </Bar>
              <Bar yAxisId="right" dataKey="sum" fill="#e2742fff" name="Habitat units (sum)">
                <LabelList dataKey="sum" content={makeBarLabel(v => {
                  if (v >= 1) return formatNumber(v, 0);
                  if (v >= 0.001) return formatNumber(v, 3);
                  if (v > 0) return '<0.001';
                  return '0';
                })} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Text fontSize="0.8rem" color="gray.500" textAlign="center" mt={1}>
            {huSummary.count.toLocaleString()} allocations totalling {formatNumber(huSummary.total, 2)} habitat units ({formatNumber(huSummary.area, 2)} area, {formatNumber(huSummary.hedgerow, 2)} hedgerow, {formatNumber(huSummary.watercourse, 2)} watercourse)
          </Text>
        </ChartItem>
      </ChartRow>
      <ChartRow>
      <ChartItem>
        <Heading as="h4" size="md" textAlign="center">Allocations by IMD Decile (1 = most deprived. 10 = least deprived)</Heading>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={imdDistributionData} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="decile" name="IMD Decile" />
            <YAxis name="Number of Sites" allowDecimals={false} />
            <RechartsTooltip formatter={(value, name, props) => [value, name]} />
            <Legend />
            <Bar dataKey="developmentSites" fill="#e2742fff" name="Development Sites" />
            <Bar dataKey="bgsSites" fill="#6ac98fff" name="BGS Offset Sites" />
          </BarChart>
        </ResponsiveContainer>
      </ChartItem>
      <ChartItem>
        <Heading as="h4" size="md" textAlign="center">Allocations by Spatial Risk Category</Heading>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={srDistributionData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" tick={{ textAnchor: 'middle' }} />
            <YAxis allowDecimals={false} />
            <RechartsTooltip content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="recharts-default-tooltip" style={{ backgroundColor: '#fff', border: '1px solid #ccc', padding: '10px' }}>
                    <p className="recharts-tooltip-label" style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                    <ul className="recharts-tooltip-item-list" style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                      {payload.filter(p => p.value > 0).map((p, index) => {
                        let percentage = 0;
                        if (p.name === 'LPA') percentage = p.payload.lpaPercentage;
                        if (p.name === 'LNRS') percentage = p.payload.lnrsPercentage;
                        if (p.name === 'Outside') percentage = p.payload.outsidePercentage;
                        return (
                          <li key={index} className="recharts-tooltip-item" style={{ color: p.color }}>
                            {`${p.name}: ${p.value} (${formatNumber(percentage, 1)}%)`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              }
              return null;
            }} />
            <Bar dataKey="lpa" fill="#e2742fff" name="LPA">
              <LabelList dataKey="lpa" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
            <Bar dataKey="lnrs" fill="#6ac98fff" name="LNRS">
              <LabelList dataKey="lnrs" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
            <Bar dataKey="outside" fill="#8884d8" name="Outside">
              <LabelList dataKey="outside" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Flex justifyContent="center" alignItems="center" gap={4} mt={2} fontSize="0.9rem">
          <Flex alignItems="center">
            <Box w="12px" h="12px" bg="#e2742fff" mr="5px" border="1px solid #ccc"></Box>
            <Text>LPA</Text>
          </Flex>
          <Flex alignItems="center">
            <Box w="12px" h="12px" bg="#6ac98fff" mr="5px" border="1px solid #ccc"></Box>
            <Text>LNRS</Text>
          </Flex>
          <Flex alignItems="center">
            <Box w="12px" h="12px" bg="#8884d8" mr="5px" border="1px solid #ccc"></Box>
            <Text>Outside</Text>
          </Flex>
        </Flex>
      </ChartItem>
    </ChartRow >
    </>
  );
}
