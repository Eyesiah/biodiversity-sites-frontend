"use client"

import { useFormStatus } from 'react-dom';
import { addSiteName } from './actions';
import { useActionState, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, Input, Text, VStack, HStack, Checkbox } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Link from 'next/link';
import ExternalLink from '@/components/ui/ExternalLink';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

const initialState = {
  apiKey: '',
  referenceNumber: '',
  siteName: '',
  message: null,
  error: null,
};

function SubmitButton({ children, ...props }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} loadingText="Processing..." colorScheme="teal" {...props}>
      {children}
    </Button>
  );
}

export default function AdminSiteNameForm({ referenceOptions }) {
  const [state, formAction] = useActionState(addSiteName, initialState);
  const [showOnlyWithoutNames, setShowOnlyWithoutNames] = useState(false);
  const [hideNotFound, setHideNotFound] = useState(false);
  const [hideNoMap, setHideNoMap] = useState(false);
  const [selectedReference, setSelectedReference] = useState('');
  const [currentSiteName, setCurrentSiteName] = useState('');

  // Apply client-side filtering with memoization
  const filteredOptions = useMemo(() => {
    let filtered = referenceOptions;
    if (showOnlyWithoutNames) {
      filtered = filtered.filter(option => !option.hasName);
    }
    if (hideNotFound) {
      filtered = filtered.filter(option => !option.isMarkedNotFound);
    }
    if (hideNoMap) { 
      filtered = filtered.filter(option => option.map != null);
    }
    return filtered;
  }, [referenceOptions, showOnlyWithoutNames, hideNotFound, hideNoMap]);

  // Convert filtered options to the format expected by SearchableDropdown (array of strings)
  const dropdownOptions = useMemo(() =>
    filteredOptions.map(option => option.label),
    [filteredOptions]
  );

  // Handle dropdown selection change
  const handleReferenceChange = (selectedValue) => {
    if (selectedValue) {
      // Extract reference number from selected value
      const referenceNumber = selectedValue.includes(' - ') ? selectedValue.split(' - ')[0] : selectedValue;

      // Find the option data to get the existing name
      const optionData = referenceOptions.find(option => option.value === referenceNumber);
      if (optionData && optionData.hasName) {
        // Find the name from the original data
        const nameData = referenceOptions.find(opt => opt.value === referenceNumber);
        setCurrentSiteName(nameData ? (nameData.hasName ? nameData.label.split(' - ')[1] : '') : '');
      } else {
        setCurrentSiteName('');
      }

      setSelectedReference(referenceNumber);
    } else {
      setSelectedReference('');
      setCurrentSiteName('');
    }
  };

  return (
    <>
      {/* Filter Controls */}
      <PrimaryCard maxWidth="1000px" margin="20px">
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" fontSize="lg">Filters</Text>
          <HStack spacing={6}>
            <Checkbox.Root
              onCheckedChange={setShowOnlyWithoutNames}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Show only sites without names</Checkbox.Label>
            </Checkbox.Root>
            <Checkbox.Root
              onCheckedChange={setHideNotFound}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Hide sites marked Not-Found</Checkbox.Label>
            </Checkbox.Root>
            <Checkbox.Root
              onCheckedChange={setHideNoMap}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Hide sites without site boundaries</Checkbox.Label>
            </Checkbox.Root>
          </HStack>
          <Text>{`Displaying ${filteredOptions.length} of ${referenceOptions.length}`}</Text>
        </VStack>
      </PrimaryCard>

      {/* Main Form */}
      <form action={formAction}>
        <PrimaryCard maxWidth="1000px" margin="20px">
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">API Key</Text>
              <Input name="apiKey" type="password" defaultValue={state.apiKey} flex="2" placeholder="Enter admin API key" required />
            </HStack>
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Reference Number</Text>
              <Box flex="2">
                <SearchableDropdown
                  name="referenceNumber"
                  options={dropdownOptions}
                  value={selectedReference || state.referenceNumber}
                  onChange={handleReferenceChange}
                  placeholder="Select reference number"
                />
              </Box>
            </HStack>
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Site Name</Text>
              <Input name="siteName" value={currentSiteName} onChange={(e) => setCurrentSiteName(e.target.value)} flex="2" placeholder="Enter site name" />
            </HStack>
            <HStack spacing={4}>
              <SubmitButton name="action" value="add">
                Add Site Name
              </SubmitButton>
              <SubmitButton name="action" value="clearSiteName" colorScheme="orange">
                Clear Site Name
              </SubmitButton>
              <SubmitButton name="action" value="markNotFound" colorScheme="orange">
                Mark as Not Found
              </SubmitButton>
              {state.message && (
                <Box flex="2" p={4} bg="green.50" borderRadius="md">
                  <Text color="green.700">{state.message}</Text>
                </Box>
              )}
              {state.error && (
                <Box flex="2" p={4} bg="red.50" borderRadius="md">
                  <Text color="red.700">{state.error}</Text>
                </Box>
              )}
            </HStack>
            {selectedReference && (
              <HStack>
                <Link href={`/sites/${selectedReference}`}><h2>Site Details</h2></Link>
                <ExternalLink href={referenceOptions.find(s => s.value == selectedReference)?.map}>Site Boundary</ExternalLink>
              </HStack>
            )}
          </VStack>
        </PrimaryCard>
      </form>
    </>
  )
}
