import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/hooks.js';
import { Box, Flex } from '@chakra-ui/react';
import { NAV_HEIGHT } from '@/config';

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
      minHeight={{ base: "auto", md: "100vh" }}
    >
      {!isMobile &&
        <Box
          flex="1 1 33%"
          marginRight="1rem"
          position="sticky"
          top={NAV_HEIGHT}
          alignSelf="flex-start"
          zIndex="1001"
          height={`calc(100vh - ${NAV_HEIGHT})`}
        >
          {hasMounted ? map : null}
        </Box>
      }
      <Box
        flex={{ base: "1 1 100%", md: "1 1 67%" }}
        py="1rem"
        overflowY={{ base: "visible", md: "auto" }}
      >
        {content}
      </Box>
    </Flex>
  );
};

export default MapContentLayout;
