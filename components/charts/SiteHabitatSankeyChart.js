import { Rectangle, Layer, Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/format'
import {   useBreakpointValue} from '@chakra-ui/react';

// Configuration constants
const NUM_SHADES = 8;
const LIGHTNESS_START = 80;
const LIGHTNESS_STEP = 6;

// Base colors in HSL for each unit type
const BASE_COLORS = {
  areas: { h: 120, s: 45, l: 25 }, // Green
  hedgerows: { h: 50, s: 90, l: 55 }, // Yellow
  watercourses: { h: 220, s: 90, l: 30 } // Blue
};

// Fallback colors for each unit type
const FALLBACK_COLORS = {
  areas: '#2E7D32', // Dark Green
  hedgerows: '#FFCE1B', // Mustard Yellow
  watercourses: '#0041C2', // Blueberry Blue
  default: '#2E7D32' // Dark Green
};

// Generate shades for each unit type
const generateHabitatShades = () => {
  const shades = {
    areas: [],
    hedgerows: [],
    watercourses: []
  };

  // Generate shades for each unit type (varying lightness)
  for (const unit of ['areas', 'hedgerows', 'watercourses']) {
    const base = BASE_COLORS[unit];
    for (let i = 0; i < NUM_SHADES; i++) {
      // Create shades from medium-dark to dark (better visibility)
      const lightness = LIGHTNESS_START - (i * LIGHTNESS_STEP);
      shades[unit].push(`hsl(${base.h}, ${base.s}%, ${lightness}%)`);
    }
  }

  return shades;
};

// Get consistent shade index for a habitat name within a unit type
const getHabitatShadeIndex = (habitatName, unit, allHabitats) => {
  if (!allHabitats[unit]) return 0;

  // Sort habitat names alphabetically for consistent assignment
  const sortedHabitats = [...allHabitats[unit]].sort();
  const index = sortedHabitats.indexOf(habitatName);

  // Cycle through available shades
  return index % NUM_SHADES;
};

// Get habitat-specific color for a node
const getNodeColor = (habitatName, unit, habitatShades, allHabitats) => {
  // Special handling for Individual trees habitats
  if (habitatName === 'Urban tree' || habitatName === 'Rural tree') {
    return '#b0500cff'; // Burnt Orange colour for Individual trees
  }

  if (habitatShades && allHabitats) {
    const shadeIndex = getHabitatShadeIndex(habitatName, unit, allHabitats);
    return habitatShades[unit]?.[shadeIndex] || FALLBACK_COLORS.default;
  }

  // Fallback to original colors
  return FALLBACK_COLORS[unit] || FALLBACK_COLORS.default;
};

// Extract all unique habitats per unit type from sankey data
const extractAllHabitats = (data) => {
  const habitats = {
    areas: new Set(),
    hedgerows: new Set(),
    watercourses: new Set()
  };

  if (data.nodes) {
    data.nodes.forEach(node => {
      if (node.name && node.unit && habitats[node.unit]) {
        habitats[node.unit].add(node.name);
      }
    });
  }

  return habitats;
};

const CustomSankeyNode = ({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth,
  habitatShades,
  allHabitats}) =>
{
  const isOut = x + width + 6 > containerWidth;

  let name = payload.name;
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
        fill={getNodeColor(payload.name, payload.unit, habitatShades, allHabitats)}
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 3 : x + width + 3}
        y={y + height / 2 + 6}
        fill="#000"
        style={{fontSize: '14px'}}
      >
        {`${formatNumber(payload.value, 2)}${payload.unit == 'areas' ? 'ha' : 'km'} - ${name}`}
      </text>
    </Layer>
  );
}

const CustomSankeyLink = (props) => {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload, habitatShades, allHabitats } = props;

  // Get source and target habitat names from payload
  const sourceHabitat = payload.sourceHabitat;
  const targetHabitat = payload.targetHabitat;
  const unit = payload.unit;

  const sourceColor = getNodeColor(sourceHabitat, unit, habitatShades, allHabitats);
  const targetColor = getNodeColor(targetHabitat, unit, habitatShades, allHabitats);

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

export default function SiteHabitatSankeyChart ({data}) {
  const sankeyHeight = data.dynamicHeight || 900;

  // Generate habitat shades and extract all habitats
  const habitatShades = generateHabitatShades();
  const allHabitats = extractAllHabitats(data);

  // Create enhanced data with source and target habitat info for links
  const enhancedData = {
    ...data,
    links: data.links?.map(link => {
      const sourceNode = data.nodes?.[link.source];
      const targetNode = data.nodes?.[link.target];
      return {
        ...link,
        sourceHabitat: sourceNode?.name || null,
        targetHabitat: targetNode?.name || null
      };
    }) || []
  };

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#565555ff', marginBottom: '16px', fontStyle: 'italic' }}>
        This Sankey diagram shows habitat transformations from baseline (on the left) to created or enhanced (improved) habitats (on the right), using a heuristic that prioritises same-habitat maintenance and then allocates the remaining baseline habitats to improved habitats based on the trading rules.
        <br />
        The lowest distinctiveness baseline habitats are assumed to be the most likely to be improved; habitats are assumed to be improved within their broad habitat category where possible. Where not possible, a higher distinctiveness habitat is used.
        <br />
        NB: The source data for this diagram does not contain information about which baseline habitats convert to which improved habitats.
      </p>
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
          node={<CustomSankeyNode containerWidth={400} habitatShades={habitatShades} allHabitats={allHabitats} />}
          link={<CustomSankeyLink habitatShades={habitatShades} allHabitats={allHabitats} />}
        >
          <Tooltip
            isAnimationActive={false}
            formatter={(value) => `${formatNumber(value, 2)}`}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
