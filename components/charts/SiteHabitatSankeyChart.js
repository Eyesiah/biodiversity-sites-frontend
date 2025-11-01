import { Rectangle, Layer, Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/format'

const CustomSankeyNode = ({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth}) =>
{
  const isOut = x + width + 6 > containerWidth;

  // Define colors based on unit
  const getNodeColor = (unit) => {
    switch (unit) {
      case 'areas': return '#FF9800'; // Orange
      case 'hedgerows': return '#4CAF50'; // Green
      case 'watercourses': return '#00BCD4'; // Cyan
      default: return '#FF9800'; // Default orange
    }
  };

  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getNodeColor(payload.unit)}
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="14"
        stroke="#333"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="12"
        stroke="#333"
        strokeOpacity="0.5"
      >
        {formatNumber(payload.value, 2) + (payload.unit == 'areas' ? 'ha' : 'km')}
      </text>
    </Layer>
  );
}

const CustomSankeyLink = (props) => {
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;

  // Get gradient based on unit
  const getLinkGradient = (unit) => {
    switch (unit) {
      case 'areas': return 'url(#linkGradient-areas)';
      case 'hedgerows': return 'url(#linkGradient-hedgerows)';
      case 'watercourses': return 'url(#linkGradient-watercourses)';
      default: return 'url(#linkGradient-areas)';
    }
  };

  return (
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
      fill={getLinkGradient(payload.unit)}
      stroke="none"
    />
  );
}

export default function SiteHabitatSankeyChart ({data}) {
  const sankeyHeight = data.dynamicHeight || 900;
  return (
    <div>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontStyle: 'italic' }}>
        NOTE: The source data does not contain information about which
        specific baseline habitats convert to which improvement habitats, so flows are estimated proportionally.
        This chart shows habitat flows using a heuristic that prioritizes same-habitat maintenance,
        then allocates remaining baseline to improvements. 
      </p>
      <ResponsiveContainer width="100%" height={sankeyHeight}>
        <Sankey
          height={sankeyHeight}
          margin={{ top: 20, bottom: 20 }}
          data={data}
          sort={data.sort}
          nodeWidth={10}
          nodePadding={40}
          linkCurvature={0.61}
          iterations={64}
          node={<CustomSankeyNode containerWidth={800} />}
          link={<CustomSankeyLink />}
        >
          <defs>
            <linearGradient id="linkGradient-areas">
              <stop offset="45%" stopColor="#FF9800" />
              <stop offset="85%" stopColor="#E65100" />
            </linearGradient>
            <linearGradient id="linkGradient-hedgerows">
              <stop offset="45%" stopColor="#66BB6A" />
              <stop offset="85%" stopColor="#2E7D32" />
            </linearGradient>
            <linearGradient id="linkGradient-watercourses">
              <stop offset="45%" stopColor="#26C6DA" />
              <stop offset="85%" stopColor="#00838F" />
            </linearGradient>
          </defs>
          <Tooltip
            isAnimationActive={false}
            formatter={(value) => `${formatNumber(value, 2)}`}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
