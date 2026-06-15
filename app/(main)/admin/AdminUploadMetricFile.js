"use client"

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, Input, Text, VStack, HStack } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import ExternalLink from '@/components/ui/ExternalLink';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

export default function AdminUploadMetricFile({ referenceOptions }) {
  const [apiKey, setApiKey] = useState('');
  const [selectedReference, setSelectedReference] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [currentFileName, setCurrentFileName] = useState(null);

  const selectedOption = useMemo(() => {
    if (!selectedReference) return null;
    return referenceOptions.find(opt => opt.value === selectedReference) || null;
  }, [selectedReference, referenceOptions]);

  const handleReferenceChange = (selectedValue) => {
    if (selectedValue) {
      const referenceNumber = selectedValue.includes(' - ') ? selectedValue.split(' - ')[0] : selectedValue;
      setSelectedReference(referenceNumber);
      const option = referenceOptions.find(opt => opt.value === referenceNumber);
      setCurrentUrl(option?.metricFileUrl || null);
      setCurrentFileName(option?.metricFileName || null);
      setMessage(null);
      setError(null);
      setFile(null);
    } else {
      setSelectedReference('');
      setCurrentUrl(null);
      setCurrentFileName(null);
      setMessage(null);
      setError(null);
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!apiKey) {
      setError('API key is required.');
      return;
    }
    if (!selectedReference) {
      setError('Please select a site reference number.');
      return;
    }
    if (!file) {
      setError('Please select a metric file.');
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('apiKey', apiKey);
      formData.append('referenceNumber', selectedReference);
      formData.append('file', file);

      const response = await fetch('/api/upload-metric-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Upload failed.');
        return;
      }

      setCurrentUrl(data.url);
      setCurrentFileName(file.name);
      setMessage(`Metric file uploaded successfully for site ${selectedReference}`);
      setFile(null);
      // Reset file input
      document.getElementById('metric-file-input') && (document.getElementById('metric-file-input').value = '');
    } catch (e) {
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!apiKey) {
      setError('API key is required.');
      return;
    }
    if (!selectedReference) {
      setError('Please select a site reference number.');
      return;
    }

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/delete-metric-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          referenceNumber: selectedReference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Delete failed.');
        return;
      }

      setCurrentUrl(null);
      setCurrentFileName(null);
      setMessage(`Metric file deleted successfully for site ${selectedReference}`);
    } catch (e) {
      setError('Failed to delete metric file. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PrimaryCard maxWidth="1000px" margin="20px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="lg">Upload Statutory Metric Files</Text>
        <Text fontSize="sm" color="gray.600">
          Upload a statutory biodiversity metric file (.xlsm or .xlsx, max 5MB) for a site.
          Once uploaded, a &quot;Statutory Metric Report&quot; tab will appear on the site&apos;s detail page.
        </Text>

        <HStack spacing={4}>
          <Text w="240px" flexShrink={0} fontWeight="bold">API Key</Text>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            flex="1"
            placeholder="Enter admin API key"
          />
        </HStack>

        <HStack spacing={4}>
          <Text w="240px" flexShrink={0} fontWeight="bold">Reference Number</Text>
          <Box flex="1">
            <SearchableDropdown
              name="referenceNumber"
              options={referenceOptions.map(opt => opt.label)}
              value={selectedReference}
              onChange={handleReferenceChange}
              placeholder="Select reference number"
            />
          </Box>
        </HStack>

        {/* Current metric file status */}
        {selectedReference && (
          <Box p={3} bg="gray.50" borderRadius="md">
            <Text fontWeight="bold" mb={1}>Current Metric File Status:</Text>
            {currentUrl ? (
              <Text>
                <Text as="span" color="blue.600" fontWeight="semibold">Uploaded File:</Text>{' '}
                <ExternalLink href={currentUrl}>{currentFileName || 'View Metric File'}</ExternalLink>
              </Text>
            ) : (
              <Text color="gray.500">
                <Text as="span" fontWeight="semibold">Uploaded File:</Text> None
              </Text>
            )}
          </Box>
        )}

        {/* File input */}
        <HStack spacing={4}>
          <Text w="240px" flexShrink={0} fontWeight="bold">Metric File</Text>
          <Input
            id="metric-file-input"
            type="file"
            accept=".xlsm,.xlsx"
            onChange={(e) => setFile(e.target.files[0] || null)}
            flex="1"
            padding={2}
          />
        </HStack>

        {/* Action buttons */}
        <HStack spacing={4}>
          <Button
            colorScheme="teal"
            onClick={handleUpload}
            isLoading={uploading}
            loadingText="Uploading..."
            isDisabled={!selectedReference || !file || !apiKey}
          >
            Upload Metric File
          </Button>
          <Button
            colorScheme="red"
            variant="outline"
            onClick={handleDelete}
            isLoading={deleting}
            loadingText="Deleting..."
            isDisabled={!selectedReference || !apiKey}
          >
            Delete Uploaded File
          </Button>
        </HStack>

        {/* Status messages */}
        {message && (
          <Box p={4} bg="green.50" borderRadius="md">
            <Text color="green.700">{message}</Text>
          </Box>
        )}
        {error && (
          <Box p={4} bg="red.50" borderRadius="md">
            <Text color="red.700">{error}</Text>
          </Box>
        )}
      </VStack>
    </PrimaryCard>
  );
}
