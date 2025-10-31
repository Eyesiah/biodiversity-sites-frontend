import { Button as ChakraButton } from '@chakra-ui/react';

export const Button = (props) => (
  <ChakraButton
    fontSize="0.9rem"
    padding="0.5rem 1rem"
    border="1px solid"
    borderColor="border"
    borderRadius="5px"
    bg="cardBg"
    color="fg"
    cursor="pointer"
    transition="all 0.2s"
    _hover={{
      bg: "brand.500",
      color: "white",
      borderColor: "brand.500",
    }}
    _disabled={{
      opacity: 0.6,
      cursor: "not-allowed",
    }}
    {...props}
  />
);

export default Button;

