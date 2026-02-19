"use client"

import { useFormStatus } from 'react-dom';
import { calcHU } from './actions';
import { useActionState, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Box, Input, NativeSelect, Text, VStack, HStack, Code } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';
import Button from '@/components/styles/Button';
import { TbFileTypeXml } from "react-icons/tb";
import { exportToXml } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

const initialState = {
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Calculating..." : "Calculate"}
    </Button>
  );
}
export default function HUCalculatorForm({ habitats, conditions, broadHabitats, habitatsByGroup }) {

  const [state, formAction] = useActionState(calcHU, initialState);
  const [formData, setFormData] = useState(initialState);
  const [broadHabitat, setBroadHabitat] = useState('');
  const [baselineBroadHabitat, setBaselineBroadHabitat] = useState('');

  // Get filtered habitats based on broad habitat selection
  const filteredHabitats = broadHabitat ? habitatsByGroup[broadHabitat] || [] : habitats;
  const filteredBaselineHabitats = baselineBroadHabitat ? habitatsByGroup[baselineBroadHabitat] || [] : habitats;

  useEffect(() => {
    setFormData(state);
  }, [state]);

  // Show error message from state
  const error = state?.error;

  return (
    <form action={formAction}>
      <PrimaryCard maxWidth="1000px" margin="20px">
        {error && (
          <Box mb={4} p={3} bg="red.50" borderRadius="md">
            <Text color="red.500">{error}</Text>
          </Box>
        )}
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Habitat Type</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field name="improvementType" value={formData.improvementType} onChange={(e) => setFormData({ ...formData, improvementType: e.target.value })} key={JSON.stringify(state.result)}>
                <option value="baseline">Baseline</option>
                <option value="creation">Creation</option>
                <option value="enhanced">Enhanced</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Size (ha/km)</Text>
            <Input name="size" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} flex="2" />
          </HStack>
          {formData.improvementType === 'enhanced' && (
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
                  <SearchableDropdown name="baselineHabitat" options={filteredBaselineHabitats} value={formData.baselineHabitat} onChange={(value) => setFormData({ ...formData, baselineHabitat: value })} disabled={!baselineBroadHabitat} />
                </Box>
              </HStack>
              <HStack spacing={4}>
                <Text flex="1" fontWeight="bold">Baseline Condition</Text>
                <Box flex="2">
                  <SearchableDropdown name="baselineCondition" options={conditions} value={formData.baselineCondition} onChange={(value) => setFormData({ ...formData, baselineCondition: value })} />
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
              <SearchableDropdown name="habitat" options={filteredHabitats} value={formData.habitat} onChange={(value) => setFormData({ ...formData, habitat: value })} disabled={!broadHabitat} />
            </Box>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Target Condition</Text>
            <Box flex="2">
              <SearchableDropdown name="condition" options={conditions} value={formData.condition} onChange={(value) => setFormData({ ...formData, condition: value })} />
            </Box>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Strategic Significance</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field name="strategicSignificance" value={formData.strategicSignificance} onChange={(e) => setFormData({ ...formData, strategicSignificance: e.target.value })} key={JSON.stringify(state.result)}>
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
              <NativeSelect.Root flex="2" size="sm">
                <NativeSelect.Field name="spatialRisk" value={formData.spatialRisk} onChange={(e) => setFormData({ ...formData, spatialRisk: e.target.value })} key={JSON.stringify(state.result)}>
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
            <SubmitButton />
            <Button onClick={() => {
              setFormData(initialState);
              setBroadHabitat('');
              setBaselineBroadHabitat('');
            }}>
              Reset
            </Button>
            {formData.result && (
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
                      const exportData = {
                        inputs: inputData,
                        result: formData.result,
                      };
                      exportToXml(exportData, 'HabitatUnitCalculation', 'calculation', 'hu-calculation.xml');
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
  )
}
