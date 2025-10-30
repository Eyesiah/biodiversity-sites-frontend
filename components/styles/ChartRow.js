import { Flex } from '@chakra-ui/react';

export const ChartRow = (props) => (
  <Flex
    direction={{ base: 'column', md: 'row' }}
    width="100%"
    mb="5px"
    {...props}
  />
);

export default ChartRow;
