import { Button } from '@chakra-ui/react';
import { LuInfo } from "react-icons/lu";

// a button that looks like a text element with an info icon
// used for opening modals with additional information
export const InfoButton = (props) => (
  <Button
    bg="none"
    border="none"
    color="fg"
    textDecoration="none"
    padding="0"
    fontSize="inherit"
    fontFamily="inherit"
    cursor="pointer"
    minHeight="0"
    height="auto"
    lineHeight="inherit"
    verticalAlign="baseline"
    display="inline-flex"
    alignItems="center"
    gap="0.35em"
    transition="opacity 0.2s ease"
    _hover={{ 
      opacity: 0.7
    }}
    {...props}
  >
    {props.children}
    <LuInfo 
      style={{ 
        display: 'inline-block',
        fontSize: '0.85em',
        opacity: 0.6,
        flexShrink: 0
      }} 
    />
  </Button>
);

export default InfoButton;
