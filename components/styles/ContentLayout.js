import { Box } from '@chakra-ui/react';

/**
 * ContentLayout - A re-usable container that pushes footer to bottom of viewport
 * Used for pages with footer to ensure footer is at bottom on short pages
 * Without this, footer appears immediately below content, not at viewport base
 */
export const ContentLayout = ({ children, footer }) => (
  <Box display="flex" flexDirection="column" minHeight="100%">
    <Box flex="1" pb={4}>
      {children}
    </Box>
    {footer}
  </Box>
);
