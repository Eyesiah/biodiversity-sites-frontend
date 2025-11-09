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

const labelFontSize = 12;

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

// Function to wrap text into multiple lines with word boundaries respected
const wrapTextToWidth = (text, maxWidth, fontSize = 12, maxLines = 3) => {
  if (!text) return text;

  const fontStyle = `${fontSize}px sans-serif`;

  // If the width is too narrow to fit even a single character, don't show any label
  const minCharWidth = getTextWidth('AA', fontStyle);
  if (maxWidth < minCharWidth) {
    return '';
  }

  // Split text into words (split on spaces and preserve them)
  const words = text.split(/(\s+)/);
  const lines = [];
  let currentLine = '';
  let currentLineWidth = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordWidth = getTextWidth(word, fontStyle);
    const testLine = currentLine + word;
    const testLineWidth = currentLineWidth + wordWidth;

    // If this word fits on the current line
    if (testLineWidth <= maxWidth) {
      currentLine = testLine;
      currentLineWidth = testLineWidth;
    } else {
      // Word doesn't fit on current line

      // If we have a current line, save it and start a new one
      if (currentLine.trim()) {
        lines.push(currentLine.trim());

        // Check if we've reached max lines
        if (lines.length >= maxLines) {
          // We've reached max lines, but we still have more content
          // Add ellipsis to the last line if there's space, or create a new truncated line
          const ellipsis = '...';
          const ellipsisWidth = getTextWidth(ellipsis, fontStyle);

          if (currentLineWidth + ellipsisWidth <= maxWidth) {
            lines[lines.length - 1] = currentLine.trim() + ellipsis;
          } else {
            // Try to fit ellipsis on a new line
            lines.push(ellipsis);
          }
          return lines.join('<br>');
        }
      }

      // Start new line with this word
      if (wordWidth <= maxWidth) {
        // Word fits on a line by itself
        currentLine = word;
        currentLineWidth = wordWidth;
      } else {
        // Word is too long even for its own line - truncate it
        let truncatedWord = word;
        while (truncatedWord.length > 0) {
          const testWidth = getTextWidth(truncatedWord + '...', fontStyle);
          if (testWidth <= maxWidth) {
            lines.push(truncatedWord + '...');
            return lines.join('<br>');
          }
          truncatedWord = truncatedWord.slice(0, -1);
        }
        // If we can't even fit '...', just return empty
        return '';
      }
    }
  }

  // Add the final line if it has content
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // If we have too many lines, truncate the last one
  if (lines.length > maxLines) {
    const lastLineIndex = maxLines - 1;
    const lastLine = lines[lastLineIndex];
    const ellipsis = '...';
    const ellipsisWidth = getTextWidth(ellipsis, fontStyle);

    // Try to fit ellipsis on the last line
    let truncatedLastLine = lastLine;
    while (truncatedLastLine.length > 0) {
      const testWidth = getTextWidth(truncatedLastLine + ellipsis, fontStyle);
      if (testWidth <= maxWidth) {
        lines[lastLineIndex] = truncatedLastLine + ellipsis;
        break;
      }
      truncatedLastLine = truncatedLastLine.slice(0, -1);
    }

    // Keep only the allowed number of lines
    lines.splice(maxLines);
  }

  return lines.join('<br>');
};

export default function SiteHabitatSankeyChart({ data, habitatType }) {
  const [modalState, setModalState] = useState(false);
  const [nodeLabels, setNodeLabels] = useState([]);

  const sankeyHeight = 400; // Default height since Plotly handles sizing differently

  const showModal = () => {
    setModalState(true);
  };

  // Truncate labels based on proportional width calculation for vertical Sankey
  useEffect(() => {
    if (data && data._originalNodes) {
      const labels = data._originalNodes.map((node) => {
        const fullLabel = node.condition.length > 0 ? `${node.name} [${node.condition}]` : node.name;
        return fullLabel;
      });
      setNodeLabels(labels);
    }
  }, [data]);

  // Create chart data with truncated labels and custom tooltips
  const chartData = React.useMemo(() => {
    if (!data || !nodeLabels.length) return data;

    // Create hover text arrays that match the original Recharts logic
    const nodeHoverText = data._originalNodes.map(node => {
      if (node.name === '[CREATION]') {
        return node.name;
      }
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

      // Special handling for CREATED nodes
      if (sourceNode.name === '[CREATION]') {
        return `<b>${sourceNode.name}</b> → <b>${targetNode.name}</b><br>Condition: ${targetNode.condition}<br>Distinctiveness: ${reverseDistinctivenessLookup[targetNode.distinctivenessScore]}<br>Area: ${formatNumber(value, 2)} ${unit === 'areas' || unit === 'trees' ? 'ha' : 'km'}`;
      } else {
        // Regular link tooltip
        return `<b>${link.enhancement.toUpperCase()}</b><br><b>${sourceNode.name}</b> → <b>${targetNode.name}</b><br>Condition: ${sourceNode.condition} → ${targetNode.condition}<br>Distinctiveness: ${reverseDistinctivenessLookup[sourceNode.distinctivenessScore]} → ${reverseDistinctivenessLookup[targetNode.distinctivenessScore]}<br>Area: ${formatNumber(value, 2)} ${unit === 'areas' || unit === 'trees' ? 'ha' : 'km'}`;
      }
    });

    return {
      type: "sankey",
      orientation: "v",
      arrangement: "fixed",
      ...data,
      node: {
        ...data.node,
        label: nodeLabels,
        labelFormatter: function (label, nodeWidth, nodeHeight, fontSize, nodeIndex) {
          // Your truncation logic
          return wrapTextToWidth(label, nodeHeight * 0.8, fontSize, 3);
        },
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
  }, [data, nodeLabels]);

  return (
    <Stack>
      <InfoButton onClick={() => showModal()}>
        <Heading as="h2" size="lg" textAlign="center">{habitatType} Improvement Chart</Heading>
      </InfoButton>

      <HStack spacing={4} alignItems="stretch" width="100%">
        <VStack justifyContent="space-between" alignItems="flex-end" minHeight={sankeyHeight} flexShrink={0}>
          <Text textAlign='right' fontSize={12} fontWeight='bold' writingMode='vertical-rl' marginTop={3}>Baseline</Text>
          <Text textAlign='right' fontSize={12} fontWeight='bold' writingMode='vertical-rl' marginBottom={2}>Improved</Text>
        </VStack>

        <Box flex={1} minWidth={0}>
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
      <Modal show={modalState} onClose={() => setModalState(false)} title='About this chart' size='lg'>
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
        <Text><b>Constraint Rules</b>: We base our allocation on the BNG Statutory Metric definitions: &apos;Enhanced&apos; requires either an increase in Condition of the same habitat, or an increase in Distinctiveness within the same broad habitat type. &apos;Creation&apos; generally requires a change in broad habitat type, though we treat a large distinctiveness increase from a Low/Very Low baseline as &apos;Creation&apos; to align with the data.</Text>
        <br />
        <Text>Despite the limitations of the source data, we think this way of viewing the data gives you a good overview of how a site has become a biodiversity gain site.</Text>
        <br />
        <Text>Please tell us how you think this chart might be improved, using the Feedback button at the top of the page. You can view the open source code for the algorithm on our <ExternalLink href='https://github.com/Eyesiah/biodiversity-sites-frontend/blob/master/lib/habitat.js'>github repository</ExternalLink>.</Text>
      </Modal>
    </Stack>
  );
}
