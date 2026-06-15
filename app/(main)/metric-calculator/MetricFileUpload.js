'use client'

import { useState, useCallback, useRef } from 'react';
import {
  Box, Text, VStack, HStack, Heading, Spinner,
} from '@chakra-ui/react';
import { parseMetricWorkbook } from '@/lib/metricFileParser';
import MetricResultsView from '@/components/metric/MetricResultsView';
import Image from 'next/image';

// ============================================================
// UPLOAD DROP ZONE
// ============================================================

function UploadZone({
  isDragging,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  error,
}) {
  return (
    <Box>
      <Box
        border="2px dashed"
        borderColor={isDragging ? 'brand.500' : error ? 'red.400' : 'border'}
        borderRadius="xl"
        p={{ base: 8, md: 14 }}
        textAlign="center"
        bg={isDragging ? 'rgba(34,139,34,0.05)' : 'cardBg'}
        cursor="pointer"
        transition="all 0.2s"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        _hover={{ borderColor: 'brand.500', bg: 'rgba(34,139,34,0.04)' }}
        role="button"
        aria-label="Upload metric file"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm"
          style={{ display: 'none' }}
          onChange={onFileChange}
          aria-label="Select metric file"
        />
        <VStack gap={4}>
          <Text fontSize="4xl" lineHeight="1">
            📊
          </Text>
          <VStack gap={1}>
            <Text fontSize="lg" fontWeight="600" color="fg">
              {isDragging
                ? 'Drop your metric file here'
                : 'Drag & drop your metric file here'}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              or click to browse for a file
            </Text>
          </VStack>
          <Text
            fontSize="xs"
            color="fg.muted"
            bg="bg.muted"
            px={3}
            py={1}
            borderRadius="full"
            border="1px solid"
            borderColor="border"
          >
            Accepts .xlsm and .xlsx statutory metric files
          </Text>
        </VStack>
      </Box>

      {error && (
        <Box
          mt={4}
          p={4}
          bg="red.subtle"
          borderRadius="md"
          border="1px solid"
          borderColor="red.400"
        >
          <HStack gap={3} alignItems="flex-start">
            <Text fontSize="xl" flexShrink={0}>
              ⚠️
            </Text>
            <VStack align="start" gap={1}>
              <Text fontWeight="600" color="red.600">
                Failed to parse file
              </Text>
              <Text fontSize="sm" color="red.600">
                {error}
              </Text>
              <Text fontSize="xs" color="red.500" mt={1}>
                Please ensure the file is a valid statutory biodiversity metric
                (.xlsm or .xlsx) and try again.
              </Text>
            </VStack>
          </HStack>
        </Box>
      )}
    </Box>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function MetricFileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xlsm'].includes(ext)) {
      setError(
        `Unsupported file type ".${ext}". Please upload a .xlsm or .xlsx statutory metric file.`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseMetricWorkbook(buffer);

      setResult({
        fileName: file.name,
        fileSize: file.size,
        ...parsed,
      });
    } catch (err) {
      const raw = err?.message ?? 'Failed to parse the metric file.';
      // Keep only the first line for brevity — full detail is in the console
      setError(raw.includes('\n') ? raw.split('\n')[0] : raw);
      console.error('[MetricFileUpload] parse error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
        // Reset so the same file can be re-selected after a reset
        e.target.value = '';
      }
    },
    [processFile]
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <Box px={{ base: 3, md: 6 }} py={6} maxWidth="1600px" mx="auto">
      {/* Page header */}
      <HStack justifyContent="space-between" alignItems="flex-start" mb={6}>
        <VStack align="start" gap={1}>
          <Heading as="h2" size="xl">
            Statutory Metric Viewer
          </Heading>
          <Text color="fg.muted" maxWidth="780px">
            Upload your statutory biodiversity metric calculation file (.xlsm or
            .xlsx) to view its project information and all parsed habitat,
            hedgerow, and watercourse data rows. All processing happens entirely
            in your browser so no data is sent to any server.
          </Text>
        </VStack>
        <Box flexShrink={0} pt={1}>
          <a href="https://intel.abitat.dev/" target="_blank" rel="noopener noreferrer">
            <Image
              src="https://assets.intel.abitat.dev/built-with-abitat-intel-light.svg"
              alt="Built with Abitat Intel"
              width={300}
              height={112}
              unoptimized
              style={{ height: '7rem', width: 'auto' }}
            />
          </a>
        </Box>
      </HStack>

      {/* Upload zone (hidden once a result is loaded) */}
      {!result && !isProcessing && (
        <UploadZone
          isDragging={isDragging}
          fileInputRef={fileInputRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          error={error}
        />
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <Box textAlign="center" py={20}>
          <VStack gap={4}>
            <Spinner size="xl" color="brand.500" />
            <Text fontWeight="500">Parsing metric file…</Text>
            <Text fontSize="sm" color="fg.muted">
              This may take a moment for large files
            </Text>
          </VStack>
        </Box>
      )}

      {/* Results */}
      {result && <MetricResultsView result={result} onReset={handleReset} />}
    </Box>
  );
}
