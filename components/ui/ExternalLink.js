// components/ExternalLink.js
import React from 'react';
import { Link as ChakraLink } from '@chakra-ui/react';
import { FiExternalLink } from 'react-icons/fi';

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
        <FiExternalLink size={12} color="inherit" />
      )}
    </ChakraLink>
  );
};

export default ExternalLink;
