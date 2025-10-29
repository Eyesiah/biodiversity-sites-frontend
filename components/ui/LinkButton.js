import { Button } from '@chakra-ui/react';

// a button that looks like a link
export const LinkButton = (props) => (
  <Button
    bg="none"
    border="none"
    color="linkButton"
    textDecoration="underline"
    padding="0"
    fontSize="inherit"
    fontFamily="inherit"
    cursor="pointer"
    minHeight="0"
    height="auto"
    lineHeight="inherit"
    verticalAlign="baseline"
    _hover={{ color: "brand.emphasis" }}  
    {...props}
  />
);

export default LinkButton;