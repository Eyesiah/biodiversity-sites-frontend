'use client'

import { useEffect, useState } from 'react';
import { Box, Text, VStack, Spinner, HStack } from '@chakra-ui/react';
import { FiDownload } from 'react-icons/fi';
import { parseMetricWorkbook } from '@/lib/metricFileParser';
import MetricResultsView from '@/components/metric/MetricResultsView';
import { Button } from '@/components/styles/Button';
import { triggerDownload } from '@/lib/utils';

const METRIC_FILE_MIME_TYPES = {
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export default function SiteMetricReportTab({ metricFileUrl, metricFileName }) {
  const [result, setResult] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setResult(null);
      setFileBuffer(null);
      setError(null);
      try {
        const response = await fetch(metricFileUrl);
        if (!response.ok) throw new Error(`Failed to fetch metric file (${response.status})`);
        const buffer = await response.arrayBuffer();
        const parsed = await parseMetricWorkbook(buffer);
        if (cancelled) return;
        setFileBuffer(buffer);
        setResult({
          fileName: metricFileName || 'metric-file.xlsm',
          fileSize: buffer.byteLength,
          ...parsed,
        });
      } catch (err) {
        if (cancelled) return;
        const raw = err?.message ?? 'Failed to parse the metric file.';
        setError(raw.includes('\n') ? raw.split('\n')[0] : raw);
        console.error('[SiteMetricReportTab] parse error:', err);
      }
    }

    if (metricFileUrl) load();

    return () => { cancelled = true; };
  }, [metricFileUrl, metricFileName]);

  if (error) {
    return (
      <Box p={4} bg="red.subtle" borderRadius="md" border="1px solid" borderColor="red.400">
        <HStack gap={3} alignItems="flex-start">
          <Text fontSize="xl" flexShrink={0}>⚠️</Text>
          <VStack align="start" gap={1}>
            <Text fontWeight="600" color="red.600">Failed to load metric report</Text>
            <Text fontSize="sm" color="red.600">{error}</Text>
          </VStack>
        </HStack>
      </Box>
    );
  }

  if (!result) {
    return (
      <Box textAlign="center" py={20}>
        <VStack gap={4}>
          <Spinner size="xl" color="brand.500" />
          <Text fontWeight="500">Loading metric report…</Text>
        </VStack>
      </Box>
    );
  }

  const handleDownload = () => {
    if (!fileBuffer) return;
    const filename = metricFileName || 'metric-file.xlsm';
    const ext = filename.toLowerCase().split('.').pop();
    const mimeType = METRIC_FILE_MIME_TYPES[ext] || 'application/octet-stream';
    const blob = new Blob([fileBuffer], { type: mimeType });
    triggerDownload(blob, filename);
  };

  return (
    <MetricResultsView
      result={result}
      actions={
        <Button onClick={handleDownload}>
          <FiDownload /> Download Original File
        </Button>
      }
    />
  );
}
