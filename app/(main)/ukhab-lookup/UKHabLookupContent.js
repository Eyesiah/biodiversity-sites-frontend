"use client"

import { useState, useEffect } from 'react';
import { Box, VStack, Heading, Text, Button, Link } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import ExternalLink from '@/components/ui/ExternalLink';
import { getUKHabData, getUKHabCodesForHabitatAction, getBroadHabitatsAction, getSpecificHabitatsAction } from './actions';

export default function UKHabLookupContent() {
  const [selectedBroadHabitat, setSelectedBroadHabitat] = useState('');
  const [selectedSpecificHabitat, setSelectedSpecificHabitat] = useState('');
  const [broadHabitats, setBroadHabitats] = useState([]);
  const [specificHabitats, setSpecificHabitats] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load broad habitats on component mount
    async function loadBroadHabitats() {
      try {
        const broadHabData = await getBroadHabitatsAction();
        setBroadHabitats(broadHabData);
      } catch (error) {
        console.error('Error loading broad habitats:', error);
      }
    }
    loadBroadHabitats();
  }, []);

  useEffect(() => {
    // Load specific habitats when broad habitat is selected
    async function loadSpecificHabitats() {
      if (selectedBroadHabitat) {
        try {
          const specificHabData = await getSpecificHabitatsAction(selectedBroadHabitat);
          setSpecificHabitats(specificHabData);
          // Reset specific habitat selection when broad habitat changes
          setSelectedSpecificHabitat('');
          setResults([]);
        } catch (error) {
          console.error('Error loading specific habitats:', error);
          setSpecificHabitats([]);
          setSelectedSpecificHabitat('');
          setResults([]);
        }
      } else {
        setSpecificHabitats([]);
        setSelectedSpecificHabitat('');
        setResults([]);
      }
    }
    loadSpecificHabitats();
  }, [selectedBroadHabitat]);

  useEffect(() => {
    // Load results when specific habitat is selected
    async function loadResults() {
      if (selectedSpecificHabitat) {
        setIsLoading(true);
        try {
          const codes = await getUKHabCodesForHabitatAction(selectedSpecificHabitat);
          setResults(codes);
        } catch (error) {
          console.error('Error loading UKHab codes:', error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }
    loadResults();
  }, [selectedSpecificHabitat]);

  const handleBroadHabitatChange = (broadHabitat) => {
    setSelectedBroadHabitat(broadHabitat);
  };

  const handleSpecificHabitatChange = (specificHabitat) => {
    setSelectedSpecificHabitat(specificHabitat);
  };

  const handleClearSelection = () => {
    setSelectedBroadHabitat('');
    setSelectedSpecificHabitat('');
    setResults([]);
  };

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={4}>
        UKHab Classification Lookup
      </Heading>
      
      <Text mb={6} color="gray.600">
        Cross-reference BNG habitats with the UK Habitat Classification - UKHab Ltd (2023). UK Habitat Classification Version 2.0.
      </Text>

      <PrimaryCard maxWidth="1000px" margin="20px">
        <VStack spacing={4} align="stretch">
          <Heading as="h3" size="md">
            Select BNG Habitat
          </Heading>
          
          <SearchableDropdown
            options={broadHabitats}
            value={selectedBroadHabitat}
            onChange={handleBroadHabitatChange}
            placeholder="Select broad habitat category..."
          />
          
          {selectedBroadHabitat && (
            <SearchableDropdown
              options={specificHabitats.map(habitat => {
                const parts = habitat.split(' - ');
                // For habitats with dash format, show text after first dash
                // For habitats without dash (like some hedgerows), show the full name
                return parts.length > 1 ? parts.slice(1).join(' - ').trim() : habitat.trim();
              })}
              value={selectedSpecificHabitat ? (() => {
                const parts = selectedSpecificHabitat.split(' - ');
                return parts.length > 1 ? parts.slice(1).join(' - ').trim() : selectedSpecificHabitat.trim();
              })() : ''}
              onChange={(selected) => {
                // Find the full habitat name from the original specificHabitats array
                const fullHabitat = specificHabitats.find(habitat => {
                  const parts = habitat.split(' - ');
                  const displayText = parts.length > 1 ? parts.slice(1).join(' - ').trim() : habitat.trim();
                  return displayText === selected;
                });
                handleSpecificHabitatChange(fullHabitat || '');
              }}
              placeholder={`Select specific habitat within "${selectedBroadHabitat}"...`}
            />
          )}
          
          {(selectedBroadHabitat || selectedSpecificHabitat) && (
            <Button onClick={handleClearSelection} variant="outline" fontWeight="bold">
              Clear Selection
            </Button>
          )}
        </VStack>
      </PrimaryCard>

      {isLoading && (
        <PrimaryCard maxWidth="1000px" margin="20px" mt={6}>
          <Text>Loading UKHab codes...</Text>
        </PrimaryCard>
      )}

      {results.length > 0 && (
        <PrimaryCard maxWidth="1000px" margin="20px" mt={6}>
          <VStack spacing={4} align="stretch">
            <Heading as="h3" size="md">
              UKHab Classification for &quot;{selectedSpecificHabitat}&quot; habitat.
            </Heading>
            
            <Box overflowX="auto" display="flex" justifyContent="center">
              <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>UKHAB Code</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Level 1</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Level 2</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Level 3</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Level 4</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Pdf Page No.</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {result.ukhabCode}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {result.level1}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {result.level2Label} <span style={{ color: '#666', fontSize: '0.9em' }}>({result.level2Code})</span>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {result.level3Label} <span style={{ color: '#666', fontSize: '0.9em' }}>({result.level3Code})</span>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        {result.level4Label} <span style={{ color: '#666', fontSize: '0.9em' }}>({result.level4Code})</span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        {result.definitionPage && (
                          (() => {
                            // Check if definitionPage is a URL (contains http/https)
                            if (result.definitionPage.startsWith('http://') || result.definitionPage.startsWith('https://')) {
                              return (
                                <ExternalLink 
                                  href={result.definitionPage}
                                  showIcon={true}
                                  isExternal={true}
                                >
                                  View Source
                                </ExternalLink>
                              );
                            } else {
                              // Handle page numbers
                              return (
                                <ExternalLink 
                                  href={`https://bristoltreeforum.org/wp-content/uploads/2026/03/ukhab-v2.01-july-2023-final-2.pdf#page=${result.definitionPage}`}
                                  showIcon={true}
                                  isExternal={true}
                                >
                                  Page {result.definitionPage}
                                </ExternalLink>
                              );
                            }
                          })()
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            <Box mt={4}>
              <Text fontSize="sm" color="gray.600">
                <strong>Note:</strong> This lookup shows the cross-mapping between BNG habitats and UK Habitat Classification codes. It uses the UKHab codes published in the Statutory Metric calculator.
                Click on Pdf Page No. to view the corresponding definitions in the UKHab document. Not all BNG habitats have a corresponding UKHab entry.
              </Text>
            </Box>
          </VStack>
        </PrimaryCard>
      )}

      {!selectedSpecificHabitat && !isLoading && (
        <PrimaryCard maxWidth="1000px" margin="20px" mt={6}>
          <Text color="gray.600">
            Select a broad habitat category, then choose a specific habitat to view its corresponding UKHab classification codes.
          </Text>
        </PrimaryCard>
      )}

      <PrimaryCard maxWidth="1000px" margin="20px" mt={6}>
        <VStack spacing={4} align="stretch">
          <Heading as="h3" size="md">
            UK Habitat Classification Document
          </Heading>
          <Text>
            For detailed definitions and descriptions of all UKHab codes, refer to the official document:
          </Text>
          <ExternalLink 
            href="https://bristoltreeforum.org/wp-content/uploads/2026/03/ukhab-v2.01-july-2023-final-2.pdf"
            showIcon={true}
            isExternal={true}
          >
            UK Habitat Classification Version 2.0 (PDF)
          </ExternalLink>
        </VStack>
      </PrimaryCard>
    </Box>
  );
}