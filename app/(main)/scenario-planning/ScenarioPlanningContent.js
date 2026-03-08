"use client"

import { useActionState, useRef, useState, useEffect, startTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Box, Input, NativeSelect, Text, VStack, HStack, Heading, Code } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Button from '@/components/styles/Button';
import dynamic from 'next/dynamic';
import { calculateScenarios } from './actions';
import { TbFileTypeXml } from "react-icons/tb";
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
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
  improvementType: 'baseline',
  strategicSignificance: 1,
  spatialRisk: 1,
  timeToTargetOffset: 0,
  results: null,
  summary: null,
  habitatGroup: null,
  error: null,
};

export default function ScenarioPlanningContent({ habitats: serverHabitats, conditions: serverConditions, broadHabitats, habitatsByGroup, allCompatibleHabitats }) {
  const [state, formAction] = useActionState(calculateScenarios, initialState);
  const formRef = useRef(null);
  const [formData, setFormData] = useState(initialState);
  const [sizeInput, setSizeInput] = useState('1');
  const [baselineBroadHabitat, setBaselineBroadHabitat] = useState('');
  const [targetBroadHabitat, setTargetBroadHabitat] = useState('');

  // Get filtered habitats based on broad habitat selection
  const baselineHabitats = baselineBroadHabitat ? habitatsByGroup[baselineBroadHabitat] || [] : [];
  const targetHabitats = targetBroadHabitat ? habitatsByGroup[targetBroadHabitat] || [] : [];

  // For enhancement mode, filter target broad habitats based on baseline habitat's category (linear vs area)
  // This ensures Hedgerow baselines only show Hedgerow targets, Watercourse only show Watercourse, etc.
  let filteredTargetBroadHabitats = broadHabitats;
  const currentImprovementType = formData.improvementType;
  
  if (currentImprovementType === 'enhancement') {
    // Get the baseline habitat's broad group - check specific habitat first, then broad habitat dropdown
    let baselineGroup = null;
    
    // First try to find from specific baseline habitat selection
    const currentBaselineHabitat = formData.baselineHabitat;
    if (currentBaselineHabitat) {
      for (const [group, habitats] of Object.entries(habitatsByGroup)) {
        if (habitats.some(h => currentBaselineHabitat.toLowerCase().includes(h.toLowerCase()))) {
          baselineGroup = group;
          break;
        }
      }
    }
    
    // If not found, try using the baseline broad habitat dropdown
    if (!baselineGroup && baselineBroadHabitat) {
      baselineGroup = baselineBroadHabitat;
    }
    
    // If we found the baseline group, filter target broad habitats to only show compatible ones
    if (baselineGroup) {
      // For linear habitats (Hedgerow, Watercourses), only allow same habitat type
      // For area habitats, allow any other area habitat
      const isLinear = ['Hedgerow', 'Watercourses'].includes(baselineGroup);
      
      if (isLinear) {
        // Strict filtering: only allow the exact same broad habitat type for linear habitats
        filteredTargetBroadHabitats = [baselineGroup];
        // Clear target broad habitat if it doesn't match
        if (targetBroadHabitat && targetBroadHabitat !== baselineGroup) {
          setTargetBroadHabitat(baselineGroup);
        }
      } else {
        // For area habitats, allow any area habitat (not linear)
        filteredTargetBroadHabitats = broadHabitats.filter(group => {
          const targetIsLinear = ['Hedgerow', 'Watercourse'].includes(group);
          return !targetIsLinear;
        });
      }
    }
  }

  // For enhancement mode, also filter target specific habitats
  let filteredTargetHabitats = targetHabitats;
  if (formData.improvementType === 'enhancement' && formData.baselineHabitat && allCompatibleHabitats) {
    filteredTargetHabitats = targetHabitats.filter(h => allCompatibleHabitats.includes(h));
  }

  useEffect(() => {
    setFormData(state);
    setSizeInput(state.size !== undefined && state.size !== null ? String(state.size) : '0');
  }, [state]);

  const handleCalculate = () => {
    if (formRef.current) {
      const formDataToSubmit = new FormData(formRef.current);
      const timeToTargetOffset = formDataToSubmit.get("timeToTargetOffset");
      startTransition(() => {
        formAction(formDataToSubmit);
      });
    }
  };

  const handleImprovementTypeChange = (e) => {
    const newType = e.target.value;
    setFormData({ ...formData, improvementType: newType });
    
    // Check if data has been input and recalculate
    const hasData = formData.size > 0 || formData.habitat || formData.baselineHabitat;
    if (hasData) {
      // Create a new FormData with the updated improvement type
      const formDataToSubmit = new FormData();
      formDataToSubmit.set("improvementType", newType);
      formDataToSubmit.set("size", formData.size);
      formDataToSubmit.set("habitat", formData.habitat);
      formDataToSubmit.set("baselineHabitat", formData.baselineHabitat);
      formDataToSubmit.set("baselineCondition", formData.baselineCondition);
      formDataToSubmit.set("strategicSignificance", formData.strategicSignificance);
      formDataToSubmit.set("spatialRisk", formData.spatialRisk);
      formDataToSubmit.set("timeToTargetOffset", formData.timeToTargetOffset);
      
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
    emptyFormData.set("improvementType", "baseline");
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
  const showSpatialRisk = formData.improvementType !== 'baseline';
  const showTimeOffset = formData.improvementType !== 'baseline';

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
      xml += `      <EffectiveTimeToTarget>${result.effectiveTimeToTarget !== 'N/A' ? result.effectiveTimeToTarget : result.timeToTarget}</EffectiveTimeToTarget>\n`;
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
                  onChange={handleImprovementTypeChange}
                >
                  <option value="baseline">Baseline</option>
                  <option value="creation">Creation</option>
                  <option value="enhancement">Enhancement</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Size (ha/km)</Text>
              <Box flex="2">
                <Input 
                  name="size" 
                  value={sizeInput}
                  onChange={(e) => {
                    setSizeInput(e.target.value);
                    setFormData({ ...formData, size: e.target.value });
                  }}
                  width="100%" 
                  type="number"
                  min="0.01"
                  step="0.01"
                />
              </Box>
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
                  {filteredTargetBroadHabitats.map(group => (
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
                  options={targetBroadHabitat ? filteredTargetHabitats : serverHabitats} 
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

            {showSpatialRisk && (
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
            )}

            {showTimeOffset && (
              <HStack spacing={4}>
                <Text flex="1" fontWeight="bold">Time to Target Offset (years)</Text>
                <NativeSelect.Root flex="2" size="sm">
                  <NativeSelect.Field 
                    name="timeToTargetOffset"
                    value={formData.timeToTargetOffset}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      setFormData({ ...formData, timeToTargetOffset: newValue });
                      
                      // Auto-calculate when time offset changes
                      if (formRef.current && (formData.size > 0 || formData.habitat)) {
                        const formDataToSubmit = new FormData(formRef.current);
                        formDataToSubmit.set("timeToTargetOffset", String(newValue));
                        startTransition(() => {
                          formAction(formDataToSubmit);
                        });
                      }
                    }}
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
            )}


            {state.baselineDistinctiveness && state.improvementType === 'enhancement' && (
              <Text fontSize="sm" color="gray.500">
                Baseline Habitat Distinctiveness: {state.baselineDistinctiveness}
              </Text>
            )}

            <HStack spacing={4} justify="flex-end" mt={4}>
              <SubmitButton onReset={handleReset} />
              {state.results && (
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
              )}
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
          <VStack spacing={1} align="stretch">
            <Heading as="h3" size="lg" mb={0}>
              {state.habitat ? (
                state.improvementType === 'enhancement' && state.baselineHabitat ? (
                  <>
                    Results for <em>&apos;{state.baselineHabitat}&apos;</em> habitat enhanced to <em>&apos;{state.habitat}&apos;</em> habitat.
                  </>
                ) : (
                  <>
                    Results for {state.improvementType === 'baseline' ? 'baseline' : state.improvementType === 'creation' ? 'created' : 'enhanced'} <em>&apos;{state.habitat}&apos;</em> habitat.
                  </>
                )
              ) : 'Results'}
            </Heading>

            <HStack spacing={2} mb={2}>
              <Heading as="h4" size="md" fontWeight="bold">
                Formula used:
              </Heading>
              <Text fontSize="sm" color="gray.600" fontStyle="italic">
                {state.improvementType === 'baseline' 
                  ? `Habitat Unit (HU) = Size × Distinctiveness × Condition × Strategic Significance`
                  : state.improvementType === 'creation'
                  ? `Habitat Unit (HU) = Size × Distinctiveness × Condition × Strategic Significance × Temporal Risk × Difficulty Factor × Spatial Risk`
                  : `Habitat Unit (HU) = (((Enhanced Size × Enhanced Distinctiveness × Enhanced Condition) - (Enhanced Size × Baseline Distinctiveness × Baseline Condition)) × (Temporal Risk × Difficulty Factor) + (Enhanced Size × Baseline Distinctiveness × Baseline Condition)) × Strategic Significance × Spatial Risk`
                }
              </Text>
            </HStack>

            <Box overflowX="auto" display="flex" justifyContent="center">
              <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
                <thead>
                  {state.improvementType === 'baseline' ? (
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Condition</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Size ({targetBroadHabitat === 'Hedgerow' || targetBroadHabitat === 'Watercourses' ? 'km' : 'ha'})</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Distinctiveness</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Condition Score</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Strategic Significance</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>HUs</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Baseline Condition</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Target Condition</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Size ({targetBroadHabitat === 'Hedgerow' || targetBroadHabitat === 'Watercourses' ? 'km' : 'ha'})</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Distinctiveness</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Condition Score</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Strategic Significance</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Spatial Risk</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Time to Target (years)</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Temporal Multiplier</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>HUs</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {state.results.map((result, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {state.improvementType === 'baseline' ? (
                        <>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.condition}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{state.size}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.distinctivenessScore}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.conditionScore}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{state.strategicSignificance}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>
                            {result.HUs.toFixed(2)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.baselineCondition}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.targetCondition}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>{state.size}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.distinctivenessScore}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.conditionScore}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{state.strategicSignificance}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{state.spatialRisk}</td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            {result.effectiveTimeToTarget !== 'N/A' ? result.effectiveTimeToTarget : result.timeToTarget}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>
                            {result.temporalRisk !== undefined ? result.temporalRisk.toFixed(3) : 'N/A'}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace' }}>
                            {result.HUs.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            <Box mt={2}>
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
