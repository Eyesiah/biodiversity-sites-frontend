
import { formatNumber } from '@/lib/format';
import { DataTable } from '@/components/styles/DataTable';
import { Text } from '@chakra-ui/react';

// component to display the habitats within an allocation
export const AllocationHabitats = ({ habitats }) => {

  if (habitats == null || habitats.length === 0) {
    return <Text>No habitat details for this allocation.</Text>;
  }

  return (
    <DataTable.Root width="auto" margin="1rem auto">
      <DataTable.Header>
        <DataTable.Row>
          <DataTable.ColumnHeader>Module</DataTable.ColumnHeader>
          <DataTable.ColumnHeader>Habitat</DataTable.ColumnHeader>
          <DataTable.ColumnHeader>Distinctiveness</DataTable.ColumnHeader>
          <DataTable.ColumnHeader>Condition</DataTable.ColumnHeader>
          <DataTable.ColumnHeader>Size</DataTable.ColumnHeader>
        </DataTable.Row>
      </DataTable.Header>
      <DataTable.Body>
        {habitats.map((habitat, index) => (
          <DataTable.Row key={index}>
            <DataTable.Cell>{habitat.module}</DataTable.Cell>
            <DataTable.Cell>{habitat.type}</DataTable.Cell>
            <DataTable.Cell>{habitat.distinctiveness}</DataTable.Cell>
            <DataTable.Cell>{habitat.condition}</DataTable.Cell>
            <DataTable.NumericCell>{formatNumber(habitat.size, 4)}</DataTable.NumericCell>
          </DataTable.Row>
        ))}
      </DataTable.Body>
    </DataTable.Root>
  );
};
