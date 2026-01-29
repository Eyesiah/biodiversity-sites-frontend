"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { triggerDownload } from '@/lib/utils';
import { VStack, HStack, Text, NativeSelect, Code } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Button from '@/components/styles/Button';

export default function APIQueryForm({ }) {
  const [query, setQuery] = useState('sites');
  const [format, setFormat] = useState('csv');
  const [isLoading, setIsLoading] = useState(false);
  const [fullUrl, setFullUrl] = useState('');

  useEffect(() => {
    const newUrl = `${window.location.origin}/api/query/${query}/${format}`;
    setFullUrl(newUrl);
  }, [query, format]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      triggerDownload(blob, `${query}.${format}`);
    } catch (error) {
      console.error("Could not fetch or download the file:", error);
      // Handle error state in UI, maybe show a message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PrimaryCard maxWidth="1000px" margin="20px">
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Query</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field value={query} onChange={(e) => setQuery(e.currentTarget.value)}>
                <option value="sites">All BGS Sites Summary</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Format</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field value={format} onChange={(e) => setFormat(e.currentTarget.value)}>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xml">XML</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack spacing={4}>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Downloading..." : "Download"}
            </Button>
          </HStack>
          <Text>API URL: <Link href={fullUrl} target="_blank"><Code>{fullUrl}</Code></Link></Text>
        </VStack>
      </PrimaryCard>
    </form>
  )
}
