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

  let name = payload.name;
  if (name.length > 50) {
    name = name.slice(0, 50) + '...';
  }

  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y-0.5}
        width={width}
        height={height +1}
        fill={getNodeColor(payload.unit)}
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
  const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;

  // Get colors based on unit for better readability
  const getLinkColors = (unit) => {
    switch (unit) {
      case 'areas': return { fill: '#8bb68d', stroke: '#2E7D32' };
      case 'hedgerows': return { fill: '#f4ebb8', stroke: '#D4A017' };
      case 'watercourses': return { fill: '#82CAFF', stroke: '#0041C2' };
      default: return { fill: '#8bb68d', stroke: '#2E7D32' };
    }
  };

  const colors = getLinkColors(payload.unit);

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
      fill={colors.fill}
      fillOpacity="0.7"
      stroke={colors.stroke}
      strokeWidth="1"
      strokeOpacity="0.8"
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
          nodeWidth={30}
          nodePadding={20}
          linkCurvature={0.61}
          iterations={64}
          node={<CustomSankeyNode containerWidth={400} />}
          link={<CustomSankeyLink />}
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
