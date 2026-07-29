import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, BarChart, Bar, LabelList } from 'recharts';
import ChartRow from '@/components/styles/ChartRow';
import ChartItem from '@/components/styles/ChartItem';
import { Heading, Flex, Box, Text } from '@chakra-ui/react';

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

const BIN_DEFS = [
  { key: '0 – 0.01',   test: t => t <  0.01 },
  { key: '0.01 – 0.1', test: t => t <  0.1  },
  { key: '0.1 – 1',    test: t => t <  1     },
  { key: '1 – 10',     test: t => t < 10     },
  { key: '10 – 100',   test: t => t < 100    },
  { key: 'over 100',   test: () => true       },
];

export default function AllocationAnalysis({ allocations }) {

  const distanceDistributionData = useMemo(() => {
    const distances = allocations.map(alloc => alloc.d).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) {
      return [];
    }

    const cumulativeData = [];
    const total = distances.length;

    distances.forEach((distance, index) => {
      const cumulativeCount = index + 1;
      cumulativeData.push({
        distance: distance,
        cumulativeCount: cumulativeCount,
        percentage: (cumulativeCount / total) * 100,
      });
    });

    return cumulativeData;
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
          <Heading as="h4" size="md" textAlign="center">Cumulative distance distribution (km) - The distance between the development site and the BGS offset site.</Heading>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={distanceDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="distance" name="CDistance (km)" unit="km" domain={['dataMin', 'dataMax']} tickFormatter={(value) => formatNumber(value, 0)} />
              <YAxis dataKey="percentage" name="Cumulative Percentage" unit="%" domain={[0, 105]} />
              <RechartsTooltip formatter={(value, name, props) => (name === 'Cumulative Percentage' ? `${formatNumber(value, 2)}%` : `${formatNumber(props.payload.distance, 2)} km`)} labelFormatter={(label) => `Distance: ${formatNumber(label, 2)} km`} />
              <Legend />
              <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Cumulative Percentage" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartItem>
        <ChartItem>
          <Heading as="h4" size="md" textAlign="center">Habitat Unit (HU) Distribution</Heading>
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
              <Bar yAxisId="left" dataKey="count" fill="#2d6e42" name="Allocations (count)">
                <LabelList dataKey="count" content={makeBarLabel(v => formatNumber(v, 0))} />
              </Bar>
              <Bar yAxisId="right" dataKey="sum" fill="#b85c2a" name="Habitat units (sum)">
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
