// components/ExternalLink.js
import React from 'react';
import { Link as ChakraLink, Box } from '@chakra-ui/react';

const ExternalLink = ({ href, children, className, showIcon = true }) => {
  return (
    <ChakraLink 
      href={href} 
      className={className}
      target="_blank" 
      rel="noopener noreferrer"
      color="link"
      textDecoration={showIcon ? "underline" : "none"}
      _hover={{ color: "linkHover" }}
      display="inline-flex"
      alignItems="center"
      gap="0.25rem"
    >
      {children}
      {showIcon && (
        <Box
          as="span"
          display="inline-block"
          width="12px"
          height="12px"
          marginLeft="0.25rem"
          backgroundImage="url('/icons/external-link.svg')"
          backgroundSize="contain"
          backgroundRepeat="no-repeat"
          backgroundPosition="center"
          verticalAlign="middle"
        />
      )}
    </ChakraLink>
  );
};

export default ExternalLink;