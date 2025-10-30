"use client"

import { useFormStatus } from 'react-dom';
import { calcHU } from './actions';
import { useActionState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, Input, NativeSelect, Text, VStack, HStack, Code } from '@chakra-ui/react';
import { PrimaryCard } from '@/components/styles/PrimaryCard';

const SearchableDropdown = dynamic(() => import('@/components/ui/SearchableDropdown'), { ssr: false });

const initialState = {
  size: 0,
  habitat: '',
  condition: '',
  improvementType: 'none',
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

  return (
    <form action={formAction}>
      <PrimaryCard maxWidth="1000px" margin="20px">
        <VStack spacing={4} align="stretch">
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Size</Text>
            <Input name="size" defaultValue={state.size} flex="2" />
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Habitat</Text>
            <Box flex="2">
              <SearchableDropdown name="habitat" options={habitats} defaultValue={state.habitat} />
            </Box>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Condition</Text>
            <Box flex="2">
              <SearchableDropdown name="condition" options={conditions} defaultValue={state.condition} />
            </Box>
          </HStack>
          <HStack spacing={4}>
            <Text flex="1" fontWeight="bold">Improvement Type</Text>
            <NativeSelect.Root flex="2" size="sm">
              <NativeSelect.Field name="improvementType" defaultValue={state.improvementType} key={JSON.stringify(state.result)}>
                <option value="none">None</option>
                <option value="creation">Creation</option>
                <option value="enhanced">Improvement</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
          <HStack spacing={4}>
            <SubmitButton />
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
