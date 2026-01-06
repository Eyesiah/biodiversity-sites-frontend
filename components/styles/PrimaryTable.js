import { Table } from '@chakra-ui/react';

export const PrimaryTable = {
  Root: (props) => (
    <Table.Root 
      size="sm" 
      variant="outline"
      width="auto"      
      borderCollapse="collapse"
      bg="tableBg"
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
      _hover={{ bg: "tableHoverBg" }}
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
      borderColor="subtleBorder"
      textAlign="center"
      verticalAlign="top"
      {...props} 
    />
  ),
  Cell: (props) => (
    <Table.Cell 
      padding="1rem"
      borderBottom="1px solid"
      borderColor="subtleBorder"
      verticalAlign="top"
      fontSize="0.9rem"
      color="tableText"
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
  NumericCell: (props) => (
    <PrimaryTable.Cell
      textAlign="right"
      fontFamily="mono"
      {...props}
    />
  ),
  CenteredNumericCell: (props) => (
    <PrimaryTable.NumericCell
      textAlign="center"
      {...props}
    />
  ),
};

export default PrimaryTable;
