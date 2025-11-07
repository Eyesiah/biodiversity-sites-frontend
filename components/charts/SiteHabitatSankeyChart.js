import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { VStack, Heading, Text, Stack, List, HStack, Box } from '@chakra-ui/react';
import { formatNumber } from '@/lib/format';
import InfoButton from '@/components/styles/InfoButton'
import Modal from '@/components/ui/Modal';
import ExternalLink from '@/components/ui/ExternalLink';

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const reverseDistinctivenessLookup = {
  0: 'Very Low',
  1: 'Very Low',
  2: 'Low',
  4: 'Medium',
  6: 'High',
  8: 'Very High'
};

const labelFontSize = 14;

/**
 * A cached canvas context for measuring text widths.
 * This avoids creating a new canvas for every label.
 */
let canvasContext;
function getTextWidth(text, font) {
  if (!canvasContext) {
    const canvas = document.createElement('canvas');
    canvasContext = canvas.getContext('2d');
  }
  canvasContext.font = font;
  return canvasContext.measureText(text).width;
}

// Function to wrap text into multiple lines with truncation
const wrapTextToWidth = (text, maxWidth, fontSize = 12, maxLines = 3) => {
  if (!text) return text;

  const fontStyle = `${fontSize}px sans-serif`;

  // If the width is too narrow to fit even a single character, don't show any label
  const minCharWidth = getTextWidth('AA', fontStyle);
  if (maxWidth < minCharWidth) {
    return '';
  }

  const lines = [];
  let currentLine = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    const testWidth = getTextWidth(testLine, fontStyle);

    if (testWidth <= maxWidth) {
      // Character fits on current line
      currentLine = testLine;
    } else {
      // Character doesn't fit - start new line
      if (currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        // Single character doesn't fit - skip this character
        continue;
      }
    }
  }

  // Add the last line
  if (currentLine) {
    lines.push(currentLine);
  }

  // If we have too many lines, truncate the last one and add ellipsis
  if (lines.length > maxLines) {
    const lastLineIndex = maxLines - 1;
    const lastLine = lines[lastLineIndex];
    const ELLIPSIS = '...';

    // Try to fit ellipsis on the last line
    let truncatedLastLine = lastLine;
    while (truncatedLastLine.length > 0) {
      const testWidth = getTextWidth(`${truncatedLastLine}${ELLIPSIS}`, fontStyle);
      if (testWidth <= maxWidth) break;
      truncatedLastLine = truncatedLastLine.slice(0, -1);
    }

    lines[lastLineIndex] = truncatedLastLine.length > 1 ? `${truncatedLastLine}${ELLIPSIS}` : '';
    lines.splice(maxLines); // Remove any extra lines
  }

  // Join lines with HTML line breaks
  return lines.join('<br>');
};

export default function SiteHabitatSankeyChart({ data }) {
  const [modalState, setModalState] = useState(false);
  const [truncatedLabels, setTruncatedLabels] = useState([]);
  const [chartWidth, setChartWidth] = useState(600); // Default fallback
  const chartRef = useRef(null);

  const sankeyHeight = 400; // Default height since Plotly handles sizing differently

  // Measure the chart container width
  useEffect(() => {
    const updateWidth = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    };

    // Measure initially
    updateWidth();

    // Update on window resize
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const showModal = () => {
    setModalState(true);
  };

  // Truncate labels based on proportional width calculation for vertical Sankey
  useEffect(() => {
    if (data && data._originalNodes && data.link && data.link.source && data.link.target) {
      // Parse link source/target arrays to determine which nodes are on each side
      const baselineNodeIds = new Set(data.link.source);
      const improvementNodeIds = new Set(data.link.target);

      // Get nodes for each side
      const baselineNodes = data._originalNodes.filter((_, index) => baselineNodeIds.has(index));
      const improvementNodes = data._originalNodes.filter((_, index) => improvementNodeIds.has(index));

      const availableWidth = chartWidth || 600; // Use measured width or fallback
      const nodePad = data.node?.pad || 20; // Gap between nodes

      // Calculate metrics for each side
      const baselineTotalValue = baselineNodes.reduce((sum, node) => sum + (node.value || 0), 0);
      const improvementTotalValue = improvementNodes.reduce((sum, node) => sum + (node.value || 0), 0);

      // Use the side with more nodes for width calculation (Plotly makes both sides consistent)
      const sideWithMoreNodes = baselineNodes.length >= improvementNodes.length ? 'baseline' : 'improvement';
      const nodesInDominantGroup = sideWithMoreNodes === 'baseline' ? baselineNodes : improvementNodes;
      const totalValueInDominantGroup = sideWithMoreNodes === 'baseline' ? baselineTotalValue : improvementTotalValue;

      const gapSpace = nodePad * (nodesInDominantGroup.length - 1);
      const availableChartWidth = Math.max(100, chartWidth - gapSpace);

      const truncated = data._originalNodes.map((node, nodeIndex) => {
        const isOnDominantSide = (sideWithMoreNodes === 'baseline' && baselineNodeIds.has(nodeIndex)) ||
                                (sideWithMoreNodes === 'improvement' && improvementNodeIds.has(nodeIndex));

        let nodeWidth;
        if (isOnDominantSide) {
          // Calculate proportional width for nodes on the dominant side
          const proportion = totalValueInDominantGroup > 0 ? (node.value || 0) / totalValueInDominantGroup : 1 / nodesInDominantGroup.length;
          nodeWidth = Math.max(20, availableChartWidth * proportion);
        } else {
          // For nodes on the other side, use the same proportional calculation
          // (Plotly ensures both sides have consistent widths)
          const proportion = totalValueInDominantGroup > 0 ? (node.value || 0) / totalValueInDominantGroup : 1 / nodesInDominantGroup.length;
          nodeWidth = Math.max(20, availableChartWidth * proportion);
        }

        const fullLabel = node.condition.length > 0 ? `${node.name} [${node.condition}]` : node.name;
        return wrapTextToWidth(fullLabel, nodeWidth * 0.9, labelFontSize, 3);
      });
      setTruncatedLabels(truncated);
    }
  }, [data, chartWidth]);

  // Create chart data with truncated labels and custom tooltips
  const chartData = React.useMemo(() => {
    if (!data || !truncatedLabels.length) return data;

    // Create hover text arrays that match the original Recharts logic
    const nodeHoverText = data._originalNodes.map(node => {
      const condition = node.condition ? `<br>Condition: ${node.condition}` : '';
      const distinctiveness = `<br>Distinctiveness: ${reverseDistinctivenessLookup[node.distinctivenessScore]}`;
      const area = `<br>Area: ${formatNumber(node.value || 0, 2)} ${node.unit === 'areas' || node.unit === 'trees' ? 'ha' : 'km'}`;
      return `<b>${node.name}</b>${condition}${distinctiveness}${area}`;
    });

    const linkHoverText = data._originalLinks.map(link => {
      const sourceNode = link.sourceNode;
      const targetNode = link.targetNode;
      const value = link.value;
      const unit = link.unit;

      // Special handling for CREATED/RETAINED nodes (same logic as original)
      if (sourceNode.name === '[CREATED]' || targetNode.name === '[RETAINED]') {
        const node = sourceNode.name === '[CREATED]' ? targetNode : sourceNode;
        return `<b>${sourceNode.name}</b> → <b>${targetNode.name}</b><br>Condition: ${node.condition}<br>Distinctiveness: ${reverseDistinctivenessLookup[node.distinctivenessScore]}<br>Area: ${formatNumber(value, 2)} ${unit === 'areas' || unit === 'trees' ? 'ha' : 'km'}`;
      } else {
        // Regular link tooltip
        return `<b>${sourceNode.name}</b> → <b>${targetNode.name}</b><br>Condition: ${sourceNode.condition} → ${targetNode.condition}<br>Distinctiveness: ${reverseDistinctivenessLookup[sourceNode.distinctivenessScore]} → ${reverseDistinctivenessLookup[targetNode.distinctivenessScore]}<br>Area: ${formatNumber(value, 2)} ${unit === 'areas' || unit === 'trees' ? 'ha' : 'km'}`;
      }
    });

    return {
      type: "sankey",
      orientation: "v",
      arrangement: "fixed",
      ...data,
      node: {
        ...data.node,
        label: truncatedLabels,
        customdata: nodeHoverText,
        hovertemplate: '%{customdata}<extra></extra>',
        pad: 10,
        thickness: 70,
        line: { color: "black", width: 0.5 }
      },
      link: {
        ...data.link,
        customdata: linkHoverText,
        hovertemplate: '%{customdata}<extra></extra>'
      }
    };
  }, [data, truncatedLabels]);

  return (
    <Stack>
      <InfoButton onClick={() => showModal()}>
        <Heading as="h2" size="lg" textAlign="center">Habitat Improvement Chart</Heading>
      </InfoButton>

      <HStack spacing={4} alignItems="stretch" width="100%">
        <VStack justifyContent="space-between" alignItems="flex-end" minHeight={sankeyHeight} flexShrink={0}>
          <Text textAlign='right' fontSize={12} fontWeight='bold'>Baseline<br />Habitats</Text>
          <Text textAlign='right' fontSize={12} fontWeight='bold'>...<br />which<br />are<br />becoming<br />...</Text>
          <Text textAlign='right' fontSize={12} fontWeight='bold'>Improved<br />Habitats</Text>
        </VStack>

        <Box ref={chartRef} flex={1} minWidth={0}>
          <Plot
            data={[chartData]}
            layout={{
              width: undefined, // Let Plotly handle responsive width
              height: sankeyHeight,
              margin: { t: 0, b: 0, l: 0, r: 0 },
              font: { size: labelFontSize, color: 'white' }
            }}
            config={{
              responsive: true,
              displayModeBar: false
            }}
            style={{ width: '100%', height: sankeyHeight }}
          />
        </Box>
      </HStack>
      <Modal show={modalState} onClose={() => setModalState(false)} title='About this chart' size='md'>
        <Text>The BGS Register contains information about a site&apos;s habitat before and after improvement works. Habitats are improved by being either created or enhanced, but the Register does not specify the way in which a particular habitat has been created.</Text>
        <br />
        <Text>This Sankey chart shows what these improvements might plausibly be. Higher distinctiveness habitats are higher up on the chart, so you can follow the flow of the bars to see how improvements were made. The data is processed using a heuristic (i.e. an informed guess based on the BNG trading rules) that we have developed as follows:</Text>
        <br />
        <List.Root as="ol" ml="6">
          <List.Item>First, habitats that have been enhanced (i.e. where the condition score is better) are assigned to their new condition.</List.Item>
          <List.Item>Low and very low distinctiveness baseline habitats are assumed to be converted to higher distinctiveness habitats.</List.Item>
          <List.Item>Then, medium distinctiveness baseline habitats are improved within the same broad category, where possible.</List.Item>
          <List.Item>Remaining habitats are improved, prioritising the lowest distinctiveness habitats.</List.Item>
          <List.Item>Finally, any remaining habitats that cannot be assigned to an improvement are treated as &apos;retained&apos;.</List.Item>
        </List.Root>
        <br />
        <Text>Despite the limitations of the source data, we think this way of viewing the data gives you a good overview of how a site has become a biodiversity gain site.</Text>
        <br />
        <Text>Please tell us how you think this chart might be improved, using the Feedback button at the top of the page. You can view the open source code for the algorithm on our <ExternalLink href='https://github.com/Eyesiah/biodiversity-sites-frontend/blob/master/lib/habitat.js'>github repository</ExternalLink>.</Text>
      </Modal>
    </Stack>
  );
}
