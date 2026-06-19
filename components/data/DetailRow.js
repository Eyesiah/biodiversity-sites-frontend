import GlossaryTooltip from '../ui/GlossaryTooltip';
import Tooltip from '../ui/Tooltip';
import { Box, Text, Checkbox, Flex } from '@chakra-ui/react';
import { lsoaStyle, lnrsStyle, ncaStyle, lpaStyle } from '@/components/map/MapStyles'

// Helper component for a detail row to keep the JSX clean.
export const DetailRow = ({ label, value, textColor, glossaryTerm, tooltipText }) => {

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

  const wrappedLabel = () => {
    if (glossaryTerm && glossaryTerm.length > 0) return <GlossaryTooltip term={glossaryTerm}>{labelText()}</GlossaryTooltip>;
    if (tooltipText) return <Tooltip text={tooltipText}>{labelText()}</Tooltip>;
    return labelText();
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      padding="0.1rem 0"
      borderBottom="1px solid"
      borderColor="subtleBorder"
      _last={{ borderBottom: "none" }}
    >
      {wrappedLabel()}
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

const bodyDetailTypes = {
  'lpa': {
    style: lpaStyle,
    label: 'LPA'
  },
  'lnrs': {
    style: lnrsStyle,
    label: 'LNRS'
  },
  'lsoa': {
    style: lsoaStyle,
    label: 'LSOA'
  },
  'nca': {
    style: ncaStyle,
    label: 'NCA'
  }
}

export const BodyDetailRow = ({ bodyType, children, hasData, isChecked, setIsChecked, glossaryTerm }) => {

  const bodyInfo = bodyDetailTypes[bodyType];
  if (bodyInfo == null) {
    return <p>{`Unknown body type ${bodyType}`}</p>
  }

  return (
    <DetailRow
      label={bodyInfo.label}
      glossaryTerm={glossaryTerm}
      value={
        <Box textAlign="right">
          {children}
          {hasData && setIsChecked && (
            <Checkbox.Root
              checked={isChecked}
              onCheckedChange={() => setIsChecked(!isChecked)}
              size="sm"
              marginLeft={2}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Flex align="center" gap={1}>
                  <Text fontSize="sm">Show</Text>
                  <Box
                    w="12px"
                    h="12px"
                    bg={bodyInfo.style.color}
                    border="1px solid #555"
                    borderRadius="2px"
                  />
                </Flex>
              </Checkbox.Label>
            </Checkbox.Root>
          )}
        </Box>
      }
    />
  );
}
