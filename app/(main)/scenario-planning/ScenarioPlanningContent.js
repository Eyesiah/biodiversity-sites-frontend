'use client'

import { useActionState, useRef, useState, useEffect, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Box, Input, NativeSelect, Text, VStack, HStack, Heading } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Button from '@/components/styles/Button';
import dynamic from 'next/dynamic';
import { calculateScenarios } from './actions';
import { getHabitatDistinctiveness } from '@/lib/habitat';
import { TbFileTypeXml } from "react-icons/tb";
import Tooltip from '@/components/ui/Tooltip';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

function SubmitButton({ onReset }) {
  const { pending } = useFormStatus();
  return (
    <>
      <Button 
        onClick={onReset}
        disabled={pending}
      >
        Reset
      </Button>
      <Button 
        type="submit"
        disabled={pending}
      >
        {pending ? "Calculating..." : "Calculate"}
      </Button>
    </>
  );
}

const initialState = {
  size: 0,
  habitat: '',
  baselineHabitat: '',
  baselineCondition: '',
  improvementType: 'creation',
  strategicSignificance: 1,
  spatialRisk: 1,
  timeToTargetOffset: 0,
  results: null,
  summary: null,
  habitatGroup: null,
  error: null,
};

export default function ScenarioPlanningContent({ habitats: serverHabitats, conditions: serverConditions, broadHabitats, habitatsByGroup }) {
  const [state, formAction] = useActionState(calculateScenarios, initialState);
  const formRef = useRef(null);
  const [formData, setFormData] = useState(initialState);
  const [sizeInput, setSizeInput] = useState('1');
  const [baselineBroadHabitat, setBaselineBroadHabitat] = useState('');
  const [targetBroadHabitat, setTargetBroadHabitat] = useState('');

  // Get filtered habitats based on broad habitat selection
  const baselineHabitats = baselineBroadHabitat ? habitatsByGroup[baselineBroadHabitat] || [] : [];
  const targetHabitats = targetBroadHabitat ? habitatsByGroup[targetBroadHabitat] || [] : [];

  useEffect(() => {
    setFormData(state);
    setSizeInput(state.size !== undefined && state.size !== null ? String(state.size) : '0');
  }, [state]);

  const handleCalculate = () => {
    if (formRef.current) {
      const formDataToSubmit = new FormData(formRef.current);
      startTransition(() => {
        formAction(formDataToSubmit);
      });
    }
  };

  const handleReset = () => {
    setFormData(initialState);
    setSizeInput('0');
    setBaselineBroadHabitat('');
    setTargetBroadHabitat('');
    // Clear results by calling formAction with minimal data
    const emptyFormData = new FormData();
    emptyFormData.set("habitat", "");
    emptyFormData.set("isReset", "true");
    emptyFormData.set("size", "0");
    emptyFormData.set("improvementType", "creation");
    emptyFormData.set("strategicSignificance", "1");
    emptyFormData.set("spatialRisk", "1");
    emptyFormData.set("timeToTargetOffset", "0");
    startTransition(() => {
      formAction(emptyFormData);
    });
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const showBaselineFields = formData.improvementType === 'enhancement';

  const handleExportXML = () => {
    if (!state.results || state.results.length === 0) return;

    // Build XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ScenarioPlanning>\n';
    xml += '  <Inputs>\n';
    xml += `    <ImprovementType>${state.improvementType}</ImprovementType>\n`;
    xml += `    <Size unit="ha">${state.size}</Size>\n`;
    xml += `    <BaselineHabitat>${state.baselineHabitat || 'N/A'}</BaselineHabitat>\n`;
    xml += `    <BaselineCondition>${state.baselineCondition || 'N/A'}</BaselineCondition>\n`;
    xml += `    <BaselineDistinctiveness>${state.baselineDistinctiveness || 'N/A'}</BaselineDistinctiveness>\n`;
    xml += `    <TargetHabitat>${state.habitat}</TargetHabitat>\n`;
    xml += `    <TargetDistinctiveness>${state.targetDistinctiveness || 'N/A'}</TargetDistinctiveness>\n`;
    xml += `    <StrategicSignificance>${state.strategicSignificance || 1}</StrategicSignificance>\n`;
    xml += `    <SpatialRisk>${state.spatialRisk || 1}</SpatialRisk>\n`;
    xml += `    <TimeToTargetOffset>${state.timeToTargetOffset || 0}</TimeToTargetOffset>\n`;
    xml += '  </Inputs>\n';
    xml += '  <Results>\n';
    
    state.results.forEach((result, index) => {
      xml += `    <Result index="${index}">\n`;
      xml += `      <BaselineHabitat>${result.baselineHabitat}</BaselineHabitat>\n`;
      xml += `      <BaselineCondition>${result.baselineCondition}</BaselineCondition>\n`;
      xml += `      <TargetCondition>${result.targetCondition}</TargetCondition>\n`;
      xml += `      <TimeToTarget>${result.timeToTarget}</TimeToTarget>\n`;
      xml += `      <HUs>${result.HUs.toFixed(2)}</HUs>\n`;
      xml += '    </Result>\n';
    });
    
    xml += '  </Results>\n';
    xml += '</ScenarioPlanning>';

    // Create and trigger download
    const blob = new Blob([xml], { type: 'text/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scenario-planning-${new Date().toISOString().split('T')[0]}.xml`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={4}>
        Scenario Planning: Habitat Unit Outcomes
      </Heading>
      
      <Text mb={6} color="gray.600">
        Explore potential Habitat Unit (HU) outcomes across different baseline and target conditions.
      </Text>

      <form ref={formRef} action={formAction}>
        <PrimaryCard maxWidth="1000px" margin="20px">
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Improvement Type</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field 
                  name="improvementType"
                  value={formData.improvementType}
                  onChange={(e) => setFormData({ ...formData, improvementType: e.target.value })}
                >
                  <option value="creation">Creation</option>
                  <option value="enhancement">Enhancement</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Size (ha/km)</Text>
              <Input 
                name="size" 
                value={sizeInput}
                onChange={(e) => {
                  setSizeInput(e.target.value);
                  setFormData({ ...formData, size: e.target.value });
                }}
                flex="2" 
                type="number"
                min="0.01"
                step="0.01"
              />
            </HStack>

            {showBaselineFields && (
              <>
                <HStack spacing={4}>
                  <Text flex="1" fontWeight="bold">Baseline Broad Habitat</Text>
                  <NativeSelect.Root flex="2" size="sm">
                    <NativeSelect.Field 
                      value={baselineBroadHabitat}
                      onChange={(e) => {
                        setBaselineBroadHabitat(e.target.value);
                        setFormData({ ...formData, baselineHabitat: '' });
                      }}
                    >
                      <option value="">Select Broad Habitat</option>
                      {broadHabitats.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </HStack>
                <HStack spacing={4}>
                  <Text flex="1" fontWeight="bold">Baseline Habitat</Text>
                  <Box flex="2">
                    <SearchableDropdown 
                      options={baselineHabitats} 
                      name="baselineHabitat"
                      value={formData.baselineHabitat}
                      onChange={(value) => setFormData({ ...formData, baselineHabitat: value })}
                      disabled={!baselineBroadHabitat}
                    />
                  </Box>
                </HStack>
                
                <HStack spacing={4}>
                  <Text flex="1" fontWeight="bold">Baseline Condition</Text>
                  <Box flex="2">
                    <SearchableDropdown 
                      options={serverConditions} 
                      name="baselineCondition"
                      value={formData.baselineCondition}
                      onChange={(value) => setFormData({ ...formData, baselineCondition: value })}
                    />
                  </Box>
                </HStack>
              </>
            )}

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Target Broad Habitat</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field 
                  value={targetBroadHabitat}
                  onChange={(e) => {
                    setTargetBroadHabitat(e.target.value);
                    setFormData({ ...formData, habitat: '' });
                  }}
                >
                  <option value="">Select Broad Habitat</option>
                  {broadHabitats.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Target Habitat</Text>
              <Box flex="2">
                <SearchableDropdown 
                  options={targetBroadHabitat ? targetHabitats : serverHabitats} 
                  name="habitat"
                  value={formData.habitat}
                  onChange={(value) => setFormData({ ...formData, habitat: value })}
                  disabled={!targetBroadHabitat}
                />
              </Box>
            </HStack>            
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Strategic Significance</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field 
                  name="strategicSignificance"
                  value={formData.strategicSignificance}
                  onChange={(e) => setFormData({ ...formData, strategicSignificance: e.target.value })}
                >
                  <option value="1">Low (1.0)</option>
                  <option value="1.5">Medium (1.5)</option>
                  <option value="2">High (2.0)</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Spatial Risk</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field 
                  name="spatialRisk"
                  value={formData.spatialRisk}
                  onChange={(e) => setFormData({ ...formData, spatialRisk: e.target.value })}
                >
                  <option value="1">Within (1.0)</option>
                  <option value="1.2">Adjacent (1.2)</option>
                  <option value="1.5">Isolated (1.5)</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Time to Target Offset (years)</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field 
                  name="timeToTargetOffset"
                  value={formData.timeToTargetOffset}
                  onChange={(e) => setFormData({ ...formData, timeToTargetOffset: Number(e.target.value) })}
                >
                  {Array.from({ length: 63 }, (_, i) => i - 31).map(offset => (
                    <option key={offset} value={offset}>
                      {offset > 0 ? `+${offset}` : offset} years
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            {state.targetDistinctiveness && (
              <Text fontSize="sm" color="gray.500">
                Target Habitat Distinctiveness: {state.targetDistinctiveness}
              </Text>
            )}

            {state.baselineDistinctiveness && state.improvementType === 'enhancement' && (
              <Text fontSize="sm" color="gray.500">
                Baseline Habitat Distinctiveness: {state.baselineDistinctiveness}
              </Text>
            )}

            <HStack spacing={4} justify="flex-end" mt={4}>
              <SubmitButton onReset={handleReset} />
            </HStack>
          </VStack>
        </PrimaryCard>
      </form>

      {state.error && (
        <PrimaryCard maxWidth="1000px" margin="20px" mt={6}>
          <Text color="red.500">{state.error}</Text>
        </PrimaryCard>
      )}

      {state.results && (
        <PrimaryCard maxWidth="1000px" margin="20px" mt={6}>
          <VStack spacing={4} align="stretch">
            <Heading as="h3" size="md">
              Results
            </Heading>
            
            {state.summary && (
              <Box bg="gray.50" p={4} borderRadius="md">
                <HStack spacing={8}>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Min HUs</Text>
                    <Text fontSize="xl">{state.summary.minHUs.toFixed(2)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Max HUs</Text>
                    <Text fontSize="xl">{state.summary.maxHUs.toFixed(2)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Average HUs</Text>
                    <Text fontSize="xl">{state.summary.avgHUs.toFixed(2)}</Text>
                  </Box>
                </HStack>
              </Box>
            )}

            <HStack justify="flex-end" mt={2}>
              <Tooltip text="Click to download data as a .XML file">
                <Button 
                  onClick={handleExportXML}
                  padding="4px"
                  border="0px solid"
                  size="15"
                >
                  <TbFileTypeXml size={25} padding={0} />
                </Button>
              </Tooltip>
            </HStack>

            <Box overflowX="auto">
              <table>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Baseline Habitat</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Baseline Condition</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Target Condition</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Time to Target (years)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>HUs</th>
                  </tr>
                </thead>
                <tbody>
                  {state.results.map((result, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px' }}>{result.baselineHabitat}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{result.baselineCondition}</td>
                      <td style={{ padding: '8px' }}>{result.targetCondition}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{result.timeToTarget}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {result.HUs.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            <Box mt={4}>
              <Text fontSize="sm" color="gray.600">
                <strong>Note:</strong> HUs shown are the total for the given size. 
                Enhancement scenarios only show combinations where the target condition is better than or equal to baseline.
              </Text>
            </Box>
          </VStack>
        </PrimaryCard>
      )}
    </Box>
  );
}
