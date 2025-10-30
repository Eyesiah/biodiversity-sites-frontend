import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, BarChart, Bar, LabelList } from 'recharts';
import ChartRow from '@/components/styles/ChartRow';
import ChartItem from '@/components/styles/ChartItem';
import { Heading } from '@chakra-ui/react';

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
    const allUnits = allocations.flatMap(alloc => [alloc.au, alloc.hu, alloc.wu]).filter(u => typeof u === 'number' && u > 0);
    if (allUnits.length === 0) return [];
    const totalCount = allUnits.length;

    const bins = {
      '0-1 HUs': 0,
      '1-2 HUs': 0,
      '2-3 HUs': 0,
      '3-4 HUs': 0,
      '4-5 HUs': 0,
      '>5 HUs': 0,
    };

    for (const unit of allUnits) {
      if (unit <= 1) bins['0-1 HUs']++;
      else if (unit <= 2) bins['1-2 HUs']++;
      else if (unit <= 3) bins['2-3 HUs']++;
      else if (unit <= 4) bins['3-4 HUs']++;
      else if (unit <= 5) bins['4-5 HUs']++;
      else bins['>5 HUs']++;
    }

    return Object.entries(bins).map(([name, count]) => ({ name, count, percentage: (count / totalCount) * 100 }));
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
      'Within': { category: 'Within', lpa: 0, nca: 0, outside: 0 },
      'Neighbouring': { category: 'Neighbouring', lpa: 0, nca: 0, outside: 0 },
      'Outside': { category: 'Outside', lpa: 0, nca: 0, outside: 0 },
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
            if (from === 'NCA') bins[category].nca++;
          }
        }
      }
    });

    return Object.values(bins).map(bin => ({
      ...bin,
      lpaPercentage: (bin.lpa / totalAllocations) * 100,
      ncaPercentage: (bin.nca / totalAllocations) * 100,
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
              <YAxis dataKey="percentage" name="Cumulative Percentage" unit="%" domain={[0, 100]} />
              <RechartsTooltip formatter={(value, name, props) => (name === 'Cumulative Percentage' ? `${formatNumber(value, 2)}%` : `${formatNumber(props.payload.distance, 2)} km`)} labelFormatter={(label) => `Distance: ${formatNumber(label, 2)} km`} />
              <Legend />
              <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Cumulative Percentage" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartItem>
        <ChartItem>
          <Heading as="h4" size="md" textAlign="center">Habitat Unit (HU) Distribution</Heading>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={habitatUnitDistributionData} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" name="HUs" />
              <YAxis name="Count" />
              <RechartsTooltip formatter={(value, name, props) => [`${value} (${formatNumber(props.payload.percentage, 1)}%)`, name]} />
              <Legend />
              <Bar dataKey="count" fill="#6ac98fff" name="Number of Allocations"><LabelList dataKey="count" position="top" /></Bar>
            </BarChart>
          </ResponsiveContainer>
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
            <RechartsTooltip formatter={(value) => [value, 'Sites']} />
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
                        if (p.name === 'NCA') percentage = p.payload.ncaPercentage;
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
            <Bar dataKey="nca" fill="#6ac98fff" name="NCA">
              <LabelList dataKey="nca" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
            <Bar dataKey="outside" fill="#8884d8" name="Outside">
              <LabelList dataKey="outside" position="top" formatter={(v) => v > 0 ? v : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ height: '12px', width: '12px', backgroundColor: '#e2742fff', marginRight: '5px', border: '1px solid #ccc' }}></span>
            <span>LPA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ height: '12px', width: '12px', backgroundColor: '#6ac98fff', marginRight: '5px', border: '1px solid #ccc' }}></span>
            <span>NCA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ height: '12px', width: '12px', backgroundColor: '#8884d8', marginRight: '5px', border: '1px solid #ccc' }}></span>
            <span>Outside</span>
          </div>
        </div>
      </ChartItem>
    </ChartRow >
    </>
  );
}
