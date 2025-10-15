import { Box } from '@chakra-ui/react';

/**
 * DataSection - A collapsible section component for nested data tables
 * Lighter weight than PrimaryCard, designed to be nested within cards
 */
export const DataSection = (props) => (
  <Box
    as="section"
    border="1px solid"
    borderColor="border"
    borderRadius="md"
    padding="0.75rem"
    bg="cardBg"
    color="fg"
    boxShadow="0 1px 2px rgba(0,0,0,0.03)"
    display="flex"
    flexDirection="column"
    width="100%"
    {...props}
  />
);

/**
 * SectionTitle - Styled heading for data sections
 * Smaller and lighter than CardTitle
 */
export const SectionTitle = (props) => (
  <Box
    as="h4"
    margin="0"
    paddingBottom="0.5rem"
    fontSize="1rem"
    fontWeight="600"
    cursor={props.onClick ? "pointer" : "default"}
    userSelect={props.onClick ? "none" : "auto"}
    {...props}
  />
);

export default DataSection;

