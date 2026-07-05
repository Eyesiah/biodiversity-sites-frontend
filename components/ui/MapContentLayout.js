import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/hooks.js';
import { Box, Flex } from '@chakra-ui/react';
import { NAV_HEIGHT } from '@/config';

const MapContentLayout = ({ map, content, hideMap = false }) => {
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
      {!isMobile && !hideMap &&
        <Box
          flex="1 1 33%"
          marginRight="1rem"
          position="sticky"
          top={NAV_HEIGHT}
          alignSelf="flex-start"
          height={`calc(100vh - ${NAV_HEIGHT})`}
        >
          {hasMounted ? map : null}
        </Box>
      }
      <Box
        flex={{ base: "1 1 100%", md: hideMap ? "1 1 100%" : "1 1 67%" }}
        py="1rem"
        overflowY={{ base: "visible", md: "auto" }}
      >
        {content}
      </Box>
    </Flex>
  );
};

export default MapContentLayout;
