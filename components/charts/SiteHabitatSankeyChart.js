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
      case 'areas': return '#2E7D32'; // Dark Green
      case 'hedgerows': return '#FFCE1B'; // Mustard Yellow
      case 'watercourses': return '#0041C2'; // Blueberry Blue
      default: return '#2E7D32'; // Dark Green
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
      <p style={{ fontSize: '14px', color: '#565555ff', marginBottom: '16px', fontStyle: 'italic' }}>
        This Sankey diagram shows habitat transformations from baseline to improved, using a heuristic that prioritises same-habitat maintenance and then allocates the remaining baseline habitats to improved habitats.
        The width of the arrows relates to the size of the transformation. 
        (NB The source data for this Sankey diagram does not contain information about which baseline habitats (on the left) convert to which improvement habitats (on the right).)
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
              <stop offset="45%" stopColor="#8bb68dff" />
              <stop offset="85%" stopColor="#507e52ff" />
            </linearGradient>
            <linearGradient id="linkGradient-hedgerows">
              <stop offset="45%" stopColor="#f4ebb8ff" />
              <stop offset="85%" stopColor="#FFCE1B" />
            </linearGradient>
            <linearGradient id="linkGradient-watercourses">
              <stop offset="45%" stopColor="#82CAFF" />
              <stop offset="85%" stopColor="#0041C2" />
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
