import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/hooks.js';
import { Box, Flex } from '@chakra-ui/react';

const MapContentLayout = ({ map, content }) => {
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <Flex 
      flexDirection={{ base: "column", md: "row" }}
      width="100%"
    >
      {!isMobile &&
        <Box 
          flex="1 1 33%"
          marginRight="1rem"
          position="sticky"
          top="2rem"
          alignSelf="flex-start"
        >
          {hasMounted ? map : null}
        </Box>
      }
      <Box 
        flex={{ base: "1 1 100%", md: "1 1 67%" }}
        py="1rem"
      >
        {content}
      </Box>
    </Flex>
  );
};

export default MapContentLayout;
