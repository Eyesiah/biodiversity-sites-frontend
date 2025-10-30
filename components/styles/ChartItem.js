import { Box } from '@chakra-ui/react';

export const ChartItem = (props) => (
  <Box
    flex="1"
    mr={{ base: 0, md: "20px" }}
    mb={{ base: "5px", md: 0 }}
    sx={{
      '&:last-of-type': {
        mr: 0,
      },
    }}
    {...props}
  />
);

export default ChartItem;
