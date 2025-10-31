import { Box } from '@chakra-ui/react';

export default function Loading() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Box className="loader"></Box>
    </Box>
  );
}
