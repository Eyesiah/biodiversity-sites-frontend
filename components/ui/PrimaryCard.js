import { Box } from '@chakra-ui/react';

/**
 * PrimaryCard - A pre-styled card component with consistent styling
 * Used for grouping related content with a border and shadow
 */
export const PrimaryCard = (props) => (
  <Box
    as="section"
    border="1px solid"
    borderColor="border"
    borderRadius="md"
    padding="0.75rem"
    bg="cardBg"
    color="fg"
    boxShadow="0 2px 4px rgba(0,0,0,0.05)"
    display="flex"
    flexDirection="column"
    width="100%"
    {...props}
  />
);

/**
 * CardTitle - Styled heading for cards with bottom border
 */
export const CardTitle = (props) => (
  <Box
    as="h3"
    marginTop="0"
    borderBottom="1px solid"
    borderColor="border"
    paddingBottom="0.5rem"
    marginBottom="0.75rem"
    fontSize="1.17rem"
    cursor={props.onClick ? "pointer" : "default"}
    userSelect={props.onClick ? "none" : "auto"}
    {...props}
  />
);

export default PrimaryCard;

