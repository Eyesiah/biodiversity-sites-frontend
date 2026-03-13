"use client"

import { useFormStatus } from 'react-dom';
import { useActionState, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Box, Input, NativeSelect, Text, VStack, HStack, Code } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Button from '@/components/styles/Button';
import { TbFileTypeXml } from "react-icons/tb";
import { exportToXml } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { getDistinctivenessScore } from '@/lib/habitat';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

// Initial state for the calculator form
export const calculatorInitialState = {
  size: 0,
  habitat: '',
  condition: '',
  improvementType: 'baseline',
  strategicSignificance: 1,
  spatialRisk: 1,
  timeToTargetOffset: 0,
  baselineHabitat: '',
  baselineCondition: '',
  result: null,
  error: null,
};

function SubmitButton({ label = "Calculate" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Calculating..." : label}
    </Button>
  );
}

/**
 * Habitat Unit calculator form component.
 *
 * NOTE: This component is currently not imported by any page. ScenarioPlanningContent
 * maintains its own inline form. This component targets the HU calculator use-case only.
 */
export default function HabitatForm({
  formAction,
  initialState,
  habitats,
  conditions,
  broadHabitats,
  habitatsByGroup,
  allCompatibleHabitats,
  submitButtonLabel = "Calculate",
  showResults = true
}) {
  const [state, formActionInternal] = useActionState(formAction, initialState);
  const [formData, setFormData] = useState(initialState);
  const [broadHabitat, setBroadHabitat] = useState('');
  const [baselineBroadHabitat, setBaselineBroadHabitat] = useState('');

  // Increment this counter whenever the result changes to reset controlled selects
  // (avoids serialising the entire result object as a React key)
  const resultRevision = useRef(0);
  const prevResult = useRef(state.result);
  if (state.result !== prevResult.current) {
    resultRevision.current += 1;
    prevResult.current = state.result;
  }

  // Get filtered habitats based on broad habitat selection
  const filteredHabitats = broadHabitat ? habitatsByGroup[broadHabitat] || [] : habitats;
  const filteredBaselineHabitats = baselineBroadHabitat ? habitatsByGroup[baselineBroadHabitat] || [] : habitats;

  const isEnhancement = formData.improvementType === 'enhanced';

  // For enhancement mode, filter target broad habitats based on baseline habitat's category
  // (linear habitats can only enhance to same linear type; area habitats stay within area)
  let filteredTargetBroadHabitats = broadHabitats;
  if (isEnhancement) {
    // Derive baseline group from the habitatsByGroup map using strict equality
    let baselineGroup = null;
    if (formData.baselineHabitat) {
      for (const [group, habs] of Object.entries(habitatsByGroup)) {
        if (habs.some(h => h.toLowerCase() === formData.baselineHabitat.toLowerCase())) {
          baselineGroup = group;
          break;
        }
      }
    }
    if (!baselineGroup && baselineBroadHabitat) {
      baselineGroup = baselineBroadHabitat;
    }

    if (baselineGroup) {
      const isLinear = ['Hedgerow', 'Watercourses'].includes(baselineGroup);
      if (isLinear) {
        filteredTargetBroadHabitats = [baselineGroup];
        if (broadHabitat && broadHabitat !== baselineGroup) {
          setBroadHabitat(baselineGroup);
        }
      } else {
        filteredTargetBroadHabitats = broadHabitats.filter(g => !['Hedgerow', 'Watercourses'].includes(g));
      }
    }
  }

  // For enhancement mode, filter specific target habitats by compatibility
  const targetHabitatsForEnhancement =
    isEnhancement && formData.baselineHabitat && allCompatibleHabitats
      ? filteredHabitats.filter(h => allCompatibleHabitats.includes(h))
      : filteredHabitats;

  // Filter baseline conditions by the baseline habitat's distinctiveness score.
  // For habitats with score > 0: show the five graded conditions only.
  // For Very Low (score 0): show only N/A options.
  const filteredBaselineConditions = conditions.filter(condition => {
    if (!isEnhancement || !formData.baselineHabitat) {
      return true;
    }
    const distinctiveness = getDistinctivenessScore(formData.baselineHabitat);
    const validConditions = ['Good', 'Fairly Good', 'Moderate', 'Fairly Poor', 'Poor'];
    const nAOptions = ['Condition Assessment N/A', 'N/A - Other'];
    return distinctiveness > 0 ? validConditions.includes(condition) : nAOptions.includes(condition);
  });

  useEffect(() => {
    setFormData(state);
  }, [state]);

  const showBaselineFields = isEnhancement;
  const error = state?.error;

  return (
    <form action={formActionInternal}>
      <PrimaryCard maxWidth="1000px" margin="20px">
        {error && (
          <Box mb={4} p={3} bg="red.50" borderRadius="md">
            <Text color="red.500">{error}</Text>
          </Box>
        )}
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Improvement Type</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field
                name="improvementType"
                value={formData.improvementType}
                onChange={(e) => setFormData({ ...formData, improvementType: e.target.value })}
                key={resultRevision.current}
              >
                <option value="baseline">Baseline</option>
                <option value="creation">Creation</option>
                <option value="enhanced">Enhanced</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>

          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Size (ha/km)</Text>
            <Box flex="2">
              <Input
                name="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
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
                    name="baselineHabitat"
                    options={filteredBaselineHabitats}
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
                    name="baselineCondition"
                    options={filteredBaselineConditions}
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
                value={broadHabitat}
                onChange={(e) => {
                  setBroadHabitat(e.target.value);
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
                name="habitat"
                options={targetHabitatsForEnhancement}
                value={formData.habitat}
                onChange={(value) => setFormData({ ...formData, habitat: value })}
                disabled={!broadHabitat}
              />
            </Box>
          </HStack>

          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Target Condition</Text>
            <Box flex="2">
              <SearchableDropdown
                name="condition"
                options={conditions}
                value={formData.condition}
                onChange={(value) => setFormData({ ...formData, condition: value })}
              />
            </Box>
          </HStack>

          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Strategic Significance</Text>
            <NativeSelect.Root flex="2" size="sm">
              {/* Low=1, Medium=1.1, High=1.5 as per BNG metric calculator */}
              <NativeSelect.Field
                name="strategicSignificance"
                value={formData.strategicSignificance}
                onChange={(e) => setFormData({ ...formData, strategicSignificance: e.target.value })}
                key={resultRevision.current}
              >
                <option value={1}>Low</option>
                <option value={1.1}>Medium</option>
                <option value={1.5}>High</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>

          {formData.improvementType !== 'baseline' && (
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Spatial Risk</Text>
              {/* Within=1, Neighbouring=0.75, Outside=0.5 as per BNG metric calculator */}
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field
                  name="spatialRisk"
                  value={formData.spatialRisk}
                  onChange={(e) => setFormData({ ...formData, spatialRisk: e.target.value })}
                  key={resultRevision.current}
                >
                  <option value={1}>Within</option>
                  <option value={0.75}>Neighbouring</option>
                  <option value={0.5}>Outside</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </HStack>
          )}

          {(formData.improvementType === 'creation' || formData.improvementType === 'enhanced') && (
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
          )}

          <HStack spacing={4}>
            <SubmitButton label={submitButtonLabel} />
            <Button onClick={() => {
              setFormData(initialState);
              setBroadHabitat('');
              setBaselineBroadHabitat('');
            }}>
              Reset
            </Button>

            {showResults && formData.result && (
              <>
                <Tooltip text="Click to download data as a .XML file">
                  <Button
                    padding="4px"
                    border="0px solid"
                    size={15}
                    onClick={() => {
                      const strategicSignificanceMap = {
                        1: 'Low',
                        1.1: 'Medium',
                        1.5: 'High'
                      };
                      const inputData = {
                        improvementType: formData.improvementType,
                        size: formData.size,
                        habitat: formData.habitat,
                        condition: formData.condition,
                        strategicSignificance: strategicSignificanceMap[formData.strategicSignificance] || formData.strategicSignificance,
                        ...(formData.improvementType === 'enhanced' && {
                          baselineHabitat: formData.baselineHabitat,
                          baselineCondition: formData.baselineCondition,
                        }),
                        ...(formData.improvementType !== 'baseline' && {
                          spatialRisk: formData.spatialRisk,
                        }),
                        ...((formData.improvementType === 'creation' || formData.improvementType === 'enhanced') && {
                          timeToTargetOffset: formData.timeToTargetOffset,
                        }),
                      };
                      exportToXml(
                        { inputs: inputData, result: formData.result },
                        'HabitatUnitCalculation',
                        'calculation',
                        'hu-calculation.xml'
                      );
                    }}
                  >
                    <TbFileTypeXml size={25} padding={0} />
                  </Button>
                </Tooltip>
                <Box flex="2" p={4} bg="gray.50" borderRadius="md">
                  <Code display="block" whiteSpace="pre-wrap">
                    {JSON.stringify(formData.result, null, 2)}
                  </Code>
                </Box>
              </>
            )}
          </HStack>
        </VStack>
      </PrimaryCard>
    </form>
  );
}
