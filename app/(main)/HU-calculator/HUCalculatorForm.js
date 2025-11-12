"use client"

import { useFormStatus } from 'react-dom';
import { calcHU } from './actions';
import { useActionState, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, Input, NativeSelect, Text, VStack, HStack, Code, Slider } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

const initialState = {
  size: 0,
  habitat: '',
  condition: '',
  improvementType: 'baseline',
  strategicSignificance: 1,
  spatialRisk: 1,
  timeToTargetOffset: 0,
  result: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} loadingText="Calculating..." colorScheme="teal">
      Calculate
    </Button>
  );
}
export default function HUCalculatorForm({ habitats, conditions }) {

  const [state, formAction] = useActionState(calcHU, initialState);
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    setFormData(state);
  }, [state]);

  return (
    <form action={formAction}>
      <PrimaryCard maxWidth="1000px" margin="20px">
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Size (ha/km)</Text>
            <Input name="size" value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} flex="2" />
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Habitat</Text>
            <Box flex="2">
              <SearchableDropdown name="habitat" options={habitats} value={formData.habitat} onChange={(value) => setFormData({...formData, habitat: value})} />
            </Box>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Condition</Text>
            <Box flex="2">
              <SearchableDropdown name="condition" options={conditions} value={formData.condition} onChange={(value) => setFormData({...formData, condition: value})} />
            </Box>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Habitat Type</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field name="improvementType" value={formData.improvementType} onChange={(e) => setFormData({...formData, improvementType: e.target.value})} key={JSON.stringify(state.result)}>
                <option value="baseline">Baseline</option>
                <option value="creation">Creation</option>                
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Strategic Significance</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field name="strategicSignificance" value={formData.strategicSignificance} onChange={(e) => setFormData({...formData, strategicSignificance: e.target.value})} key={JSON.stringify(state.result)}>
                <option value={1}>Low</option>
                <option value={1.1}>Medium</option>
                <option value={1.5}>High</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Spatial Risk</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field name="spatialRisk" value={formData.spatialRisk} onChange={(e) => setFormData({...formData, spatialRisk: e.target.value})} key={JSON.stringify(state.result)}>
                <option value={1}>Within</option>
                <option value={0.75}>Neighbouring</option>
                <option value={0.5}>Outside</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          {formData.improvementType !== 'baseline' && (
            <HStack spacing={4}>
              <Text flex="1" fontWeight="bold">Time to Target Offset</Text>
              <Box flex="2">
                <Slider.Root
                  min={-10}
                  max={10}
                  step={1}
                  value={[formData.timeToTargetOffset]}
                  onValueChange={(value) => setFormData({...formData, timeToTargetOffset: value[0]})}
                >
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumb index={0} />
                  </Slider.Control>
                  <Slider.MarkerGroup>
                    <Slider.Marker value={-10}>-10</Slider.Marker>
                    <Slider.Marker value={0}>0</Slider.Marker>
                    <Slider.Marker value={10}>10</Slider.Marker>
                  </Slider.MarkerGroup>
                </Slider.Root>
                <Text mt={2} textAlign="center">{formData.timeToTargetOffset} years</Text>
              </Box>
            </HStack>
          )}
          <input type="hidden" name="timeToTargetOffset" value={String(formData.timeToTargetOffset)} />
          <HStack spacing={4}>
            <SubmitButton />
            <Button onClick={() => setFormData(initialState)} colorScheme="gray">
              Reset
            </Button>
            {state.result && (
              <Box flex="2" p={4} bg="gray.50" borderRadius="md">
                <Code display="block" whiteSpace="pre-wrap">
                  {JSON.stringify(state.result, null, 2)}
                </Code>
              </Box>
            )}
          </HStack>
        </VStack>
      </PrimaryCard>
    </form>
  )
}
