import { Box, Text } from '@chakra-ui/react';
import GlossaryTooltip from '../ui/GlossaryTooltip';

// Helper component for a detail row to keep the JSX clean.
export const DetailRow = ({ label, value, textColor, glossaryTerm }) => {

  const labelText = () => {
    return <Text
      as="dt"
      fontWeight="bold"
      color={textColor || "fg"}
      margin="0"
    >
      {label}
    </Text>
  }

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      padding="0.1rem 0"
      borderBottom="1px solid"
      borderColor="subtleBorder"
      _last={{ borderBottom: "none" }}
    >
      {glossaryTerm && glossaryTerm.length > 0 ? <GlossaryTooltip term={glossaryTerm}>{labelText()}</GlossaryTooltip> : labelText()}
      <Text
        as="dd"
        color={textColor || "fg"}
        margin="0"
        textAlign="right"
        flex="1"
        minWidth="0"
      >
        {value}
      </Text>
    </Box>
  );
}