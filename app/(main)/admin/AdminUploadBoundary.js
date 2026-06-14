"use client"

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, Input, Text, VStack, HStack, Alert } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import ExternalLink from '@/components/ui/ExternalLink';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

export default function AdminUploadBoundary({ referenceOptions }) {
  const [apiKey, setApiKey] = useState('');
  const [selectedReference, setSelectedReference] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(null);

  const selectedOption = useMemo(() => {
    if (!selectedReference) return null;
    return referenceOptions.find(opt => opt.value === selectedReference) || null;
  }, [selectedReference, referenceOptions]);

  // Compute the current boundary map source for display
  const boundaryInfo = useMemo(() => {
    if (!selectedOption) return { registerUrl: null, blobUrl: null };
    return {
      registerUrl: selectedOption.map || null,
      blobUrl: null // We don't have blobUrl in the options; will be set after upload/check
    };
  }, [selectedOption]);

  const handleReferenceChange = (selectedValue) => {
    if (selectedValue) {
      const referenceNumber = selectedValue.includes(' - ') ? selectedValue.split(' - ')[0] : selectedValue;
      setSelectedReference(referenceNumber);
      setCurrentUrl(null);
      setMessage(null);
      setError(null);
      setFile(null);
    } else {
      setSelectedReference('');
      setCurrentUrl(null);
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
      setError('Please select a PDF file.');
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

      const response = await fetch('/api/upload-boundary', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Upload failed.');
        return;
      }

      setCurrentUrl(data.url);
      setMessage(`Boundary map uploaded successfully for site ${selectedReference}`);
      setFile(null);
      // Reset file input
      document.getElementById('boundary-file-input') && (document.getElementById('boundary-file-input').value = '');
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
      const response = await fetch('/api/delete-boundary', {
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
      setMessage(`Boundary map deleted successfully for site ${selectedReference}`);
    } catch (e) {
      setError('Failed to delete boundary map. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PrimaryCard maxWidth="1000px" margin="20px">
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="lg">Upload Boundary Maps</Text>
        <Text fontSize="sm" color="gray.600">
          Upload a PDF boundary map for a site that doesn't have one from the BGS register.
          Only sites without a register-provided boundary map will use the uploaded PDF.
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

        {/* Current boundary map status */}
        {selectedReference && (
          <Box p={3} bg="gray.50" borderRadius="md">
            <Text fontWeight="bold" mb={1}>Current Boundary Map Status:</Text>
            {boundaryInfo.registerUrl ? (
              <Text>
                <Text as="span" color="green.600" fontWeight="semibold">BGS Register:</Text>{' '}
                <ExternalLink href={boundaryInfo.registerUrl}>View Register Boundary Map</ExternalLink>
                <Text as="span" ml={2} fontSize="sm" color="gray.500">(Register map will be used)</Text>
              </Text>
            ) : (
              <Text>
                <Text as="span" color="orange.600" fontWeight="semibold">BGS Register:</Text> No boundary map available
              </Text>
            )}
            {currentUrl ? (
              <Text mt={1}>
                <Text as="span" color="blue.600" fontWeight="semibold">Uploaded PDF:</Text>{' '}
                <ExternalLink href={currentUrl}>View Uploaded Boundary Map</ExternalLink>
                <Text as="span" ml={2} fontSize="sm" color="gray.500">(This will be used as fallback)</Text>
              </Text>
            ) : (
              <Text mt={1} color="gray.500">
                <Text as="span" fontWeight="semibold">Uploaded PDF:</Text> None
              </Text>
            )}
          </Box>
        )}

        {/* File input */}
        <HStack spacing={4}>
          <Text w="240px" flexShrink={0} fontWeight="bold">PDF File</Text>
          <Input
            id="boundary-file-input"
            type="file"
            accept=".pdf,application/pdf"
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
            Upload Boundary Map
          </Button>
          <Button
            colorScheme="red"
            variant="outline"
            onClick={handleDelete}
            isLoading={deleting}
            loadingText="Deleting..."
            isDisabled={!selectedReference || !apiKey}
          >
            Delete Uploaded Map
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