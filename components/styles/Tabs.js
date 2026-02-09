import { Tabs as ChakraTabs } from "@chakra-ui/react"

export const Tabs = {
  Root: (props) => (
    <ChakraTabs.Root
      lazyMount
      defaultValue={0}
      width="100%"
      overflow="hidden"
      {...props}
    />
  ),
  List: (props) => (
    <ChakraTabs.List
      width="100%"
      zIndex="docked" // Chakra's theme value for sticky elements (often 10)
      bg="bg"
      overflowX="auto"
      pb="4px"
      sx={{
        '&::-webkit-scrollbar': {
          height: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'border',
          borderRadius: '24px',
        },
      }}
      {...props}
    />
  ),
  Trigger: (props) => (
    <ChakraTabs.Trigger
      _selected={{ color: 'fg', borderColor: 'link', borderBottomWidth: '0px' }}
      color="gray.500"
      whiteSpace="normal"
      textAlign="center"
      lineHeight="1.2"
      minHeight="48px"
      maxWidth="150px"
      py="8px"
      px="12px"
      {...props}
    />
  ),
  Content: (props) => (
    <ChakraTabs.Content
      {...props}
    />
  ),
}

export default Tabs;