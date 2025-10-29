import { Tabs as ChakraTabs } from "@chakra-ui/react"

export const Tabs = {
  Root: (props) => (
    <ChakraTabs.Root
      lazyMount
      defaultValue={0}
      width="100%"
      {...props}
    />
  ),
  List: (props) => (
    <ChakraTabs.List
      width="100%"
      zIndex="docked" // Chakra's theme value for sticky elements (often 10)
      bg="bg"
      {...props}
    />
  ),
  Trigger: (props) => (
    <ChakraTabs.Trigger
      _selected={{ color: 'fg', borderColor: 'link', borderBottomWidth: '2px' }}
      color="#aaa"
      {...props}
    />
  ),
  Content: (props) => (
    < ChakraTabs.Content
      {...props}
    />
  ),
}

export default Tabs;