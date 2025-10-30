import { Box, Text } from '@chakra-ui/react';

// Helper component for a detail row to keep the JSX clean.
export const DetailRow = ({ label, value, labelColor, valueColor }) => (
  <Box 
    display="flex" 
    justifyContent="space-between" 
    padding="0.1rem 0"
    borderBottom="1px solid"
    borderColor="subtleBorder"
    _last={{ borderBottom: "none" }}
  >
    <Text 
      as="dt" 
      fontWeight="bold" 
      color={labelColor || "fg"} 
      margin="0"
      paddingRight="1rem"
    >
      {label}
    </Text>
    <Text 
      as="dd" 
      color={valueColor || "fg"} 
      margin="0"
      textAlign="right"
      flex="1"
      minWidth="0"
    >
      {value}
    </Text>
  </Box>
);