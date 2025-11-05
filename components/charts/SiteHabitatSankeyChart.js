import { Rectangle, Layer, Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/format'
import { useBreakpointValue, Flex, Heading, Text, Stack, List } from '@chakra-ui/react';
import InfoButton from '@/components/styles/InfoButton'
import Modal from '@/components/ui/Modal';
import { useState } from 'react';
import ExternalLink from '@/components/ui/ExternalLink';

// Base colors in HSL for each unit type
const BASE_COLORS = {
  areas: { h: 120, s: 45, l: 25 }, // Green
  hedgerows: { h: 50, s: 90, l: 55 }, // Yellow
  watercourses: { h: 220, s: 90, l: 30 } // Blue
};

// Distinctiveness bands for lightness mapping
const DISTINCTIVENESS_BANDS = {
  0: { min: 70, max: 75 }, // Very Low (area)
  1: { min: 70, max: 75 }, // Very Low
  2: { min: 60, max: 65 }, // Low
  4: { min: 50, max: 55 }, // Medium
  6: { min: 40, max: 45 }, // High
  8: { min: 30, max: 35 }  // Very High
};

// Get habitat-specific color for a node based on unit hue and quality lightness
const getNodeColor = (node) => {
  const { name: habitatName, unit, distinctivenessScore, conditionScore } = node;

  // Special handling for Individual trees habitats
  if (habitatName === 'Urban tree' || habitatName === 'Rural tree') {
    return '#b0500cff'; // Burnt Orange colour for Individual trees
  }

  // Special handling for dummy nodes
  if (habitatName === '<CREATED>' || habitatName === '<RETAINED>') {
    return '#808080'; // Gray for dummy nodes
  }

  // Get distinctiveness band
  const band = DISTINCTIVENESS_BANDS[distinctivenessScore] || DISTINCTIVENESS_BANDS[3];

  // Map condition within the band (higher condition = darker)
  const conditionNormalized = conditionScore / 3; // 0 to 3
  const lightness = band.min + (1 - conditionNormalized) * (band.max - band.min);

  // Get base color for unit
  const base = BASE_COLORS[unit] || BASE_COLORS.areas;

  return `hsl(${base.h}, ${base.s}%, ${lightness}%)`;
};



const CustomSankeyNode = ({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth }) => {
  const isOut = x + width + 6 > containerWidth;

  let name = payload.condition.length > 0 ? `[${payload.condition}] ${payload.name}` : payload.name;
  const isMobile = useBreakpointValue({ base: true, md: false });
  const maxLen = isMobile ? 12 : 50;
  if (name.length > maxLen) {
    name = name.slice(0, maxLen) + '...';
  }

  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getNodeColor(payload)}
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 3 : x + width + 3}
        y={y + height / 2 + 6}
        fill="#000"
        style={{ fontSize: '14px' }}
      >
        {`${formatNumber(payload.value, 2)}${payload.unit == 'areas' ? 'ha' : 'km'} - ${name}`}
      </text>
    </Layer>
  );
}

const CustomSankeyLink = (props) => {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;

  // Get source and target habitat names from payload
  const sourceHabitat = payload.sourceHabitat;
  const targetHabitat = payload.targetHabitat;
  const unit = payload.unit;

  const sourceColor = getNodeColor(payload.sourceNode);
  const targetColor = getNodeColor(payload.targetNode);

  // Create gradient ID
  const gradientId = `linkGradient${index}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="20%" stopColor={sourceColor} />
          <stop offset="80%" stopColor={targetColor} />
        </linearGradient>
      </defs>
      <path
        key={`CustomLink${index}`}
        d={`
          M${sourceX},${sourceY + linkWidth / 2}
          C${sourceControlX},${sourceY + linkWidth / 2}
           ${targetControlX},${targetY + linkWidth / 2}
           ${targetX},${targetY + linkWidth / 2}
          L${targetX},${targetY - linkWidth / 2}
          C${targetControlX},${targetY - linkWidth / 2}
           ${sourceControlX},${sourceY - linkWidth / 2}
           ${sourceX},${sourceY - linkWidth / 2}
          Z
        `}
        fill={`url(#${gradientId})`}
        fillOpacity="1"
      />
    </g>
  );
}

const reverseDistinctivenessLookup = {
  0: 'Very Low',
  1: 'Very Low',
  2: 'Low',
  4: 'Medium',
  6: 'High',
  8: 'Very High'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload?.payload;
  if (!data) return null;

  // Check if it's a link (has source and target)
  if (data.sourceNode && data.targetNode) {
    // Link tooltip
    debugger;
    const sourceNode = data.sourceNode;
    const targetNode = data.targetNode;
    const value = data.value;

    return (
      <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{sourceNode.name} → {targetNode.name}</p>
        <p>Condition: {sourceNode.condition} → {targetNode.condition}</p>
        <p>Distinctiveness: {reverseDistinctivenessLookup[sourceNode.distinctivenessScore]} → {reverseDistinctivenessLookup[targetNode.distinctivenessScore]}</p>
        <p style={{ margin: 0 }}>
          Area: {formatNumber(value, 2)} {data.unit === 'areas' ? 'ha' : 'km'}
        </p>
      </div>
    );
  } else {
    // Node tooltip
    const node = data;
    const value = node.value;

    return (
      <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{node.name}</p>
        {node.condition && <p style={{ margin: 0 }}>Condition: {node.condition}</p>}
        <p style={{ margin: 0 }}>Distinctiveness: {reverseDistinctivenessLookup[node.distinctivenessScore]}</p>
        <p style={{ margin: 0 }}>
          Area: {formatNumber(value, 2)} {node.unit === 'areas' ? 'ha' : 'km'}
        </p>
      </div>
    );
  }
};

export default function SiteHabitatSankeyChart({ data }) {
  const [modalState, setModalState] = useState(false);

  const sankeyHeight = data.dynamicHeight || 900;

  // Note: Coloring now uses quality-based calculation, no longer needs pre-generated shades

  // Create enhanced data with source and target habitat info for links
  const enhancedData = {
    ...data,
    links: data.links?.map(link => {
      const sourceNode = data.nodes?.[link.source];
      const targetNode = data.nodes?.[link.target];
      return {
        ...link,
        sourceHabitat: sourceNode?.name || null,
        targetHabitat: targetNode?.name || null,
        sourceNode,
        targetNode
      };
    }) || []
  };

  const showModal = () => {
    setModalState(true);
  };

  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Stack>
      <InfoButton onClick={() => showModal()}>
        <Heading as="h2" size="lg" textAlign="center">Habitat Improvement Chart</Heading>
      </InfoButton>

      <Flex width='100%' justifyContent="space-between" alignItems="flex-end">
        <Text textAlign='left' marginLeft='10px' fontSize={12} fontWeight='bold' >Baseline<br />Habitats</Text>
        {!isMobile && <Text fontSize={12} fontWeight='bold'>... which are becoming ...</Text>}
        <Text textAlign='right' marginRight='10px' fontSize={12} fontWeight='bold'>Improved<br />Habitats</Text>
      </Flex>

      <ResponsiveContainer width="100%" height={sankeyHeight}>
        <Sankey
          height={sankeyHeight}
          margin={{ top: 20, bottom: 20 }}
          data={enhancedData}
          sort={data.sort}
          nodeWidth={10}
          nodePadding={20}
          linkCurvature={0.6}
          iterations={64}
          node={<CustomSankeyNode containerWidth={400} />}
          link={<CustomSankeyLink />}
        >
          <Tooltip
            content={<CustomTooltip />}
          />
        </Sankey>
      </ResponsiveContainer>
      <Modal show={modalState} onClose={() => setModalState(false)} title='About this chart' size='md'>
        <Text>
          The BGS Register contains information about the site&apos;s habitats before (baseline) and after (improved) the enhancement works, but does not specify exactly which habitats have been converted to which.
        </Text>
        <br />
        <Text>This Sankey chart estimates what these conversions might plausibly be. Higher distinctiveness habitats are higher on the chart, so you can follow the flow of the bars to see how improvements were made. The data is processed using a custom heuristic (i.e. a guess) that we have developed based on the <ExternalLink a='https://bristoltreeforum.org/2024/10/27/biodiversity-metrics-the-trading-rules-explained/ '>trading rules</ExternalLink>:</Text>
        <br />
        <List.Root ml="6">
          <List.Item>First, habitats that have been improved (i.e. where the condition score is better) are assigned;</List.Item>
          <List.Item>Low and Very Low distinctiveness habitats are assumed to be converted to higher distinctiveness habitats first;</List.Item>
          <List.Item>Then, Medium distinctiveness habitats are converted within the same broad category where possible;</List.Item>
          <List.Item>Finally, remaining habitats are converted, prioritising the lowest distinctiveness habitats;</List.Item>
          <List.Item>Any remaining habitats that cannot be assigned to an improvement are then considered Retained.</List.Item>
        </List.Root>
        <br />
        <Text>We think this way of viewing the data gives you a good overview of how the site has been transformed to become a BGS site, despite the limitations of the source data. Please do give us feedback about how you think this could be improved, using the <b>Feedback</b> button at the top of the page. You can view the open source code for the algorithm on our <ExternalLink a='https://github.com/Eyesiah/biodiversity-sites-frontend/blob/master/lib/habitat.js'>github repository</ExternalLink>.</Text>
      </Modal>
    </Stack>
  );
}
