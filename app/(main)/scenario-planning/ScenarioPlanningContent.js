"use client"

import { useActionState, useRef, useState, useTransition } from 'react';
import { Box, Input, NativeSelect, Text, VStack, HStack, Heading } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Button from '@/components/styles/Button';
import dynamic from 'next/dynamic';
import { calculateScenarios } from './actions';
import { TbFileTypeXml } from "react-icons/tb";
import Tooltip from '@/components/ui/Tooltip';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

function SubmitButton({ onReset, isPending }) {
  return (
    <>
      <Button 
        onClick={onReset}
        disabled={isPending}
      >
        Reset
      </Button>
      <Button 
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Calculating..." : "Calculate"}
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

export default function ScenarioPlanningContent({ habitats: serverHabitats, conditions: serverConditions, broadHabitats, habitatsByGroup, allCompatibleHabitats, originalHabitatNamesMap, distinctivenessScoresMap }) {
  const [state, formAction] = useActionState(calculateScenarios, initialState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const [sizeInput, setSizeInput] = useState('1');
  const [baselineBroadHabitat, setBaselineBroadHabitat] = useState('');
  const [baselineHabitat, setBaselineHabitat] = useState('');
  const [baselineCondition, setBaselineCondition] = useState('');
  const [targetBroadHabitat, setTargetBroadHabitat] = useState('');
  const [targetHabitat, setTargetHabitat] = useState('');
  const [treeCount, setTreeCount] = useState('');
  const [currentImprovementType, setCurrentImprovementType] = useState('baseline');
  const [timeToTargetOffset, setTimeToTargetOffset] = useState('0');

  // Get filtered habitats based on broad habitat selection
  const baselineHabitats = baselineBroadHabitat ? habitatsByGroup[baselineBroadHabitat] || [] : [];
  const targetHabitats = targetBroadHabitat ? habitatsByGroup[targetBroadHabitat] || [] : [];

  // For enhancement mode, filter target broad habitats based on baseline habitat's category (linear vs area).
  // Use local baselineHabitat state so filtering reacts immediately to user selections.
  let filteredTargetBroadHabitats = broadHabitats;
  if (currentImprovementType === 'enhancement' && baselineHabitat) {
    // Get the baseline habitat's broad group
    let baselineGroup = null;
    for (const [group, habitats] of Object.entries(habitatsByGroup)) {
      if (habitats.some(h => baselineHabitat.toLowerCase().includes(h.toLowerCase()))) {
        baselineGroup = group;
        break;
      }
    }
    
    if (baselineGroup) {
      const isLinear = ['Hedgerow', 'Watercourse'].includes(baselineGroup);
      if (isLinear) {
        // Strict filtering: only allow the exact same broad habitat type for linear habitats
        filteredTargetBroadHabitats = [baselineGroup];
      } else {
        // For area habitats, allow any area habitat (not linear)
        filteredTargetBroadHabitats = broadHabitats.filter(group => {
          const targetIsLinear = ['Hedgerow', 'Watercourse'].includes(group);
          return !targetIsLinear;
        });
      }
    }
  }

  // For enhancement mode, also filter target specific habitats.
  // Use local baselineHabitat state so filtering reacts immediately to user selections.
  let filteredTargetHabitats = targetHabitats;
  if (currentImprovementType === 'enhancement' && baselineHabitat && allCompatibleHabitats) {
    filteredTargetHabitats = targetHabitats.filter(h => allCompatibleHabitats.includes(h));
  }


  const handleSubmit = (e) => {
    // Prevent native form submission which would cause React to reset the form DOM,
    // clearing all controlled field values after the server action completes.
    e.preventDefault();
    const formData = new FormData(e.target);
    startTransition(() => {
      formAction(formData);
    });
  };

  const handleReset = () => {
    // Reset all local state variables
    setBaselineBroadHabitat('');
    setBaselineHabitat('');
    setBaselineCondition('');
    setTargetBroadHabitat('');
    setTargetHabitat('');
    setTreeCount('');
    setSizeInput('0');
    setCurrentImprovementType('baseline');
    setTimeToTargetOffset('0');
    
    // Clear the server state via the action
    const resetFormData = new FormData();
    resetFormData.set("isReset", "true");
    resetFormData.set("size", "0");
    resetFormData.set("improvementType", "baseline");
    resetFormData.set("strategicSignificance", "1");
    resetFormData.set("spatialRisk", "1");
    resetFormData.set("timeToTargetOffset", "0");
    
    startTransition(() => {
      formAction(resetFormData);
    });
    
    // Reset uncontrolled native inputs (Strategic Significance, Spatial Risk)
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const showBaselineFields = currentImprovementType === 'enhancement';
  const showSpatialRisk = currentImprovementType !== 'baseline';
  const showTimeOffset = currentImprovementType !== 'baseline';

  // Filter baseline conditions based on habitat distinctiveness.
  // Use local baselineHabitat state (not server state) so filtering reacts immediately
  // to the user's selection rather than waiting for a server round-trip.
  const filteredBaselineConditions = serverConditions.filter(condition => {
    if (!showBaselineFields || !baselineHabitat) {
      return true;
    }
    
    // Get distinctiveness score from the passed map
    const distinctiveness = distinctivenessScoresMap?.get(baselineHabitat.toLowerCase()) || 0;
    const validConditions = ['Good', 'Fairly Good', 'Moderate', 'Fairly Poor', 'Poor'];
    const nAOptions = ['Condition Assessment N/A', 'N/A - Other'];
    
    if (distinctiveness > 0) {
      return validConditions.includes(condition);
    } else {
      return nAOptions.includes(condition);
    }
  });

  const handleExportXML = () => {
    if (!state.results || state.results.length === 0) return;

    const sizeUnit = targetBroadHabitat === 'Hedgerow' || targetBroadHabitat === 'Watercourses' ? 'km' : 'ha';

    // Build XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ScenarioPlanning>\n';
    xml += '  <Inputs>\n';
    xml += `    <ImprovementType>${state.improvementType}</ImprovementType>\n`;
    xml += `    <Size unit="${sizeUnit}">${state.size}</Size>\n`;
    xml += `    <TargetBroadHabitat>${targetBroadHabitat || 'N/A'}</TargetBroadHabitat>\n`;
    xml += `    <TargetHabitat>${state.habitat || 'N/A'}</TargetHabitat>\n`;
    xml += `    <TargetDistinctiveness>${state.targetDistinctiveness || 'N/A'}</TargetDistinctiveness>\n`;
    xml += `    <HabitatGroup>${state.habitatGroup || 'N/A'}</HabitatGroup>\n`;
    xml += `    <BaselineBroadHabitat>${baselineBroadHabitat || 'N/A'}</BaselineBroadHabitat>\n`;
    xml += `    <BaselineHabitat>${state.baselineHabitat || 'N/A'}</BaselineHabitat>\n`;
    xml += `    <BaselineCondition>${state.baselineCondition || 'N/A'}</BaselineCondition>\n`;
    xml += `    <BaselineDistinctiveness>${state.baselineDistinctiveness || 'N/A'}</BaselineDistinctiveness>\n`;
    xml += `    <StrategicSignificance>${state.strategicSignificance || 1}</StrategicSignificance>\n`;
    xml += `    <SpatialRisk>${state.spatialRisk || 1}</SpatialRisk>\n`;
    xml += `    <TimeToTargetOffset>${state.timeToTargetOffset || 0}</TimeToTargetOffset>\n`;
    xml += '  </Inputs>\n';
    xml += '  <Results>\n';
    
    state.results.forEach((result, index) => {
      const effectiveTtT = result.effectiveTimeToTarget !== 'N/A' ? result.effectiveTimeToTarget : result.timeToTarget;
      xml += `    <Result index="${index + 1}">\n`;
      if (state.improvementType === 'baseline') {
        xml += `      <Condition>${result.condition}</Condition>\n`;
        xml += `      <ConditionScore>${result.conditionScore}</ConditionScore>\n`;
      } else {
        xml += `      <BaselineHabitat>${result.baselineHabitat}</BaselineHabitat>\n`;
        xml += `      <BaselineCondition>${result.baselineCondition}</BaselineCondition>\n`;
        xml += `      <BaselineConditionScore>${result.baselineConditionScore}</BaselineConditionScore>\n`;
        xml += `      <BaselineHUs>${result.baselineHUs !== undefined ? result.baselineHUs.toFixed(2) : 'N/A'}</BaselineHUs>\n`;
        xml += `      <TargetCondition>${result.targetCondition}</TargetCondition>\n`;
        xml += `      <TargetConditionScore>${result.conditionScore}</TargetConditionScore>\n`;
        xml += `      <TimeToTarget>${result.timeToTarget}</TimeToTarget>\n`;
        xml += `      <EffectiveTimeToTarget>${effectiveTtT}</EffectiveTimeToTarget>\n`;
        xml += `      <TemporalMultiplier>${result.temporalRisk !== undefined ? result.temporalRisk.toFixed(3) : 'N/A'}</TemporalMultiplier>\n`;
      }
      xml += `      <DistinctivenessScore>${result.distinctivenessScore}</DistinctivenessScore>\n`;
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

      <form ref={formRef} onSubmit={handleSubmit}>
        <PrimaryCard maxWidth="1000px" margin="20px">
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Improvement Type</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field 
                  name="improvementType"
                  value={currentImprovementType}
                  onChange={(e) => setCurrentImprovementType(e.target.value)}
                >
                  <option value="baseline">Baseline</option>
                  <option value="creation">Creation</option>
                  <option value="enhancement">Enhancement</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>

            {showBaselineFields && (
              <>
                <HStack spacing={4}>
                  <Text flex="1" fontWeight="bold">Baseline Broad Habitat</Text>
                  <NativeSelect.Root flex="2" size="sm">
                    <NativeSelect.Field 
                      name="baselineBroadHabitat"
                      value={baselineBroadHabitat}
                      onChange={(e) => {
                        setBaselineBroadHabitat(e.target.value);
                        setBaselineHabitat('');
                        setBaselineCondition('');
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
                      value={baselineHabitat}
                      onChange={(value) => setBaselineHabitat(value)}
                    />
                  </Box>
                </HStack>

                <HStack spacing={4}>
                  <Text flex="1" fontWeight="bold">Baseline Condition</Text>
                  <Box flex="2">
                    <SearchableDropdown 
                      options={filteredBaselineConditions} 
                      name="baselineCondition"
                      value={baselineCondition}
                      onChange={(value) => setBaselineCondition(value)}
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
                    setTargetHabitat('');
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
              <Text flex="1" fontWeight="bold" textTransform="capitalize">Target Habitat</Text>
              <Box flex="2">
                <SearchableDropdown 
                  options={targetBroadHabitat ? filteredTargetHabitats : serverHabitats} 
                  name="habitat"
                  value={targetHabitat}
                  onChange={(value) => setTargetHabitat(value)}
                  disabled={!targetBroadHabitat}
                />
              </Box>
            </HStack>

            {/* Tree Count field for Individual trees habitat */}
            {targetBroadHabitat === 'Individual trees' && (
              <HStack spacing={4}>
                <Text flex="1" fontWeight="bold">Tree Count (0.0041 ha per Small tree)</Text>
                <Box flex="2">
                  <Input 
                    value={treeCount} 
                    onChange={(e) => {
                      const count = e.target.value;
                      setTreeCount(count);
                      if (count && !isNaN(count) && parseInt(count) > 0) {
                        const calculatedSize = (parseInt(count) * 0.0041).toFixed(4);
                        setSizeInput(calculatedSize);
                      } else {
                        setSizeInput('');
                      }
                    }}
                    width="100%" 
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter number of trees"
                  />
                </Box>
              </HStack>
            )}

            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Size (ha/km)</Text>
              <Box flex="2">
                <Input 
                  name="size" 
                  value={sizeInput}
                  onChange={(e) => {
                    const size = e.target.value;
                    setSizeInput(size);
                    if (targetBroadHabitat === 'Individual trees' && size && !isNaN(size) && parseFloat(size) > 0) {
                      const calculatedTreeCount = Math.round(parseFloat(size) / 0.0041);
                      setTreeCount(calculatedTreeCount.toString());
                    } else if (!size) {
                      setTreeCount('');
                    }
                  }}
                  width="100%" 
                  type="number"
                  min="0"
                  step="any"
                />
              </Box>
            </HStack>
            
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Strategic Significance</Text>
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field name="strategicSignificance">
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
                  <NativeSelect.Field name="spatialRisk">
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
                <Tooltip text="A negative value represents the the credit given for prior habitat improvement. A positive value represents the delay before this habitat is improved.">
                  <NativeSelect.Root flex="2" size="sm">
                    <NativeSelect.Field 
                      name="timeToTargetOffset" 
                      value={timeToTargetOffset}
                      onChange={(e) => {
                        // Update client state immediately for UI responsiveness
                        setTimeToTargetOffset(e.target.value);
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
                </Tooltip>
              </HStack>
            )}

            {state.baselineDistinctiveness && state.improvementType === 'enhancement' && (
              <VStack spacing={1} align="stretch">
                <Text fontSize="m" color="gray.500">
                  Baseline Habitat Distinctiveness: {state.baselineDistinctiveness}.
                </Text>
                <Text fontSize="m" color="gray.500">
                  Target Habitat Distinctiveness: {state.targetDistinctiveness}.
                </Text>
              </VStack>
            )}

            <HStack spacing={4} justify="flex-end" mt={4}>
              <SubmitButton onReset={handleReset} isPending={isPending} />
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
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Condition Score</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Size ({targetBroadHabitat === 'Hedgerow' || targetBroadHabitat === 'Watercourses' ? 'km' : 'ha'})</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Distinctiveness</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Condition Score</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Strategic Significance</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>HUs</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Baseline Condition Score</th>
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
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.conditionScore}</td>
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
                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{result.baselineCondition === 'N/A (Creation)' ? 'N/A' : result.baselineConditionScore}</td>
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
