import { Table } from '@chakra-ui/react';

/**
 * DataTable - A compact, data-dense table component for displaying large datasets
 * Optimized for readability with tighter spacing and smaller fonts than PrimaryTable
 */
export const DataTable = {
  Root: (props) => (
    <Table.Root 
      size="sm" 
      variant="outline"
      width="100%"
      borderCollapse="collapse"
      bg="tableBg"
      fontSize="0.875rem"
      {...props} 
    />
  ),
  Header: (props) => <Table.Header {...props} />,
  Body: (props) => <Table.Body {...props} />,
  Row: (props) => (
    <Table.Row 
      cursor="pointer"
      _hover={{ bg: "tableHoverBg" }}
      {...props} 
    />
  ),
  ColumnHeader: (props) => (
    <Table.ColumnHeader 
      cursor="pointer"
      bg="brand.500"
      color="white"
      fontSize="0.95rem"
      fontWeight="600"
      position="sticky"
      top="0"
      zIndex="1"
      padding="0.5rem"
      border="1px solid"
      borderLeft="1px solid"
      borderLeftColor="subtleBorder"
      borderColor="subtleBorder"
      textAlign="center"
      verticalAlign="top"
      {...props} 
    />
  ),
  Cell: (props) => (
    <Table.Cell 
      padding="0.25rem"
      border="1px solid"
      borderLeft="1px solid"
      borderLeftColor="subtleBorder"
      borderColor="subtleBorder"
      verticalAlign="top"
      fontSize="0.9rem"
      color="tableText"
      textAlign="left"
      css={{
        "& a": {
          color: "link",
          textDecoration: "underline",
          _hover: {
            color: "linkHover"
          }
        }
      }}
      {...props} 
    />
  ),
};

export default DataTable;

