'use client';

import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { formatNumber } from '@/lib/format';
import { Box } from '@chakra-ui/react';

const CustomSankeyNode = ({ x, y, width, height, index, payload, containerWidth }) => {
  const isOut = x + width + 6 < containerWidth;
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill="#5192ca" fillOpacity="1" />
      <text textAnchor={isOut ? "end" : "start"} x={isOut ? x - 6 : x + width + 6} y={y + height / 2} fontSize="14" stroke="#333">
        {payload.name}
      </text>
      <text textAnchor={isOut ? "end" : "start"} x={isOut ? x - 6 : x + width + 6} y={y + height / 2 + 13} fontSize="12" stroke="#333" strokeOpacity="0.5">
        {formatNumber(payload.value, 2) + "HU"}
      </text>
    </Layer>
  );
};

const processSankeyData = (allocations) => {
  const IMDPairMap = new Map();

  allocations.forEach((alloc) => {
    const siteScore = alloc.simd;
    const allocScore = alloc.imd;

    if (siteScore && allocScore && typeof siteScore === 'number' && typeof allocScore === 'number') {
      let allocMap = IMDPairMap.get(allocScore);
      if (!allocMap) {
        allocMap = new Map();
        IMDPairMap.set(allocScore, allocMap);
      }
      let allocSize = allocMap.get(siteScore) || 0;
      allocSize += (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
      if (allocSize > 0) {
        allocMap.set(siteScore, allocSize);
      }
    }
  });

  const data = { nodes: [], links: [] };

  for (let i = 1; i <= 10; i++) {
    data.nodes.push({ name: `Allocation Decile ${i}` });
  }
  for (let i = 1; i <= 10; i++) {
    data.nodes.push({ name: `BNG Decile ${i}` });
  }

  IMDPairMap.forEach((sites, allocScore) => {
    sites.forEach((units, siteScore) => {
      data.links.push({ source: allocScore - 1, target: siteScore + 9, value: units });
    });
  });

  return data;
};

export default function SankeyChart({ allocations }) {
  const data = processSankeyData(allocations);

  return (
    <Box width="100vw" height="80vh" border="1px solid black" boxSizing="border-box" bg="ivory">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          width={960}
          height={900}
          margin={{ top: 20, bottom: 20 }}
          data={data}
          sort={false}
          nodeWidth={10}
          nodePadding={40}
          linkCurvature={0.61}
          iterations={64}
          node={<CustomSankeyNode containerWidth={800} />}
          link={{ stroke: "url(#linkGradient)" }}
        >
          <defs>
            <linearGradient id={"linkGradient"}><stop offset="55%" stopColor="#f1c40f" /><stop offset="85%" stopColor="#2ecc71" /></linearGradient>
          </defs>
          <Tooltip isAnimationActive={false} formatter={(value) => `${formatNumber(value, 2)} HU`} />
        </Sankey>
      </ResponsiveContainer>
    </Box>
  );
}
