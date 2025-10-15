// components/ExternalLink.js
import React from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';

const ExternalLink = ({ href, children, className }) => {
  return (
    <ChakraLink 
      href={href} 
      className={className}
      target="_blank" 
      rel="noopener noreferrer"
      color="link"
      textDecoration="underline"
      _hover={{ color: "linkHover" }}
    >
      {children}
    </ChakraLink>
  );
};

export default ExternalLink;