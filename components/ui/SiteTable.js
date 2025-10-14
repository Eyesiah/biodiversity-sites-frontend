import { Table } from '@chakra-ui/react';

export const SiteTable = {
  Root: (props) => (
    <Table.Root 
      size="sm" 
      variant="outline"
      width="auto"
      margin="1rem auto"
      borderCollapse="collapse"
      bg="white"
      color="black"
      borderRadius="md"
      boxShadow="0 4px 8px rgba(0, 0, 0, 0.1)"
      {...props} 
    />
  ),
  Header: (props) => <Table.Header {...props} />,
  Body: (props) => <Table.Body {...props} />,
  Row: (props) => (
    <Table.Row 
      cursor="pointer"
      _hover={{ bg: "clouds" }}
      {...props} 
    />
  ),
  ColumnHeader: (props) => (
    <Table.ColumnHeader 
      cursor="pointer"
      bg="tableHeaderBg"
      color="white"
      fontSize="1rem"
      fontWeight="600"
      position="sticky"
      top="0"
      zIndex="1"
      padding="1rem"
      borderBottom="1px solid"
      borderColor="border"
      textAlign="center"
      verticalAlign="top"
      {...props} 
    />
  ),
  Cell: (props) => (
    <Table.Cell 
      padding="1rem"
      borderBottom="1px solid"
      borderColor="border"
      verticalAlign="top"
      fontSize="0.9rem"
      {...props} 
    />
  ),
};

export default SiteTable;
