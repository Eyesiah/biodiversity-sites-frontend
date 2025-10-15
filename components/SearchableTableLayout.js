'use client';

import { useEffect } from 'react';
import { useSearchAndSort } from '@/lib/hooks';
import { Tabs, Box, InputGroup, Input, Flex, Button } from "@chakra-ui/react"

// A flexible component for handling different export buttons
const ExportButtons = ({ exportConfig, items }) => {
  if (!exportConfig) return null;

  return (
    <Flex gap="0.5rem">
      {exportConfig.onExportXml && <Button onClick={() => exportConfig.onExportXml(items)}>Export to XML</Button>}
      {exportConfig.onExportJson && <Button onClick={() => exportConfig.onExportJson(items)}>Export to JSON</Button>}
      {exportConfig.onExportCsv && <Button onClick={() => exportConfig.onExportCsv(items)}>Export to CSV</Button>}
    </Flex>
  );
};

export default function SearchableTableLayout({
  initialItems,
  filterPredicate,
  initialSortConfig,
  placeholder,
  exportConfig,
  summary, // Optional summary component/text
  tabs, // New prop for tabbed content: [{ title: string, content: (props) => JSX }, ...]
  children, // Original render prop for non-tabbed content
  onSortedItemsChange
}) {
  const {
    inputValue,
    setInputValue,
    sortedItems,
    requestSort,
    getSortIndicator,
    sortConfig
  } = useSearchAndSort(initialItems, filterPredicate, initialSortConfig);

  useEffect(() => {
    if (onSortedItemsChange) {
      onSortedItemsChange(sortedItems);
    }
  }, [sortedItems, onSortedItemsChange]);

  const renderProps = { sortedItems, requestSort, getSortIndicator, inputValue, sortConfig };

  return (
    <Box width="100%">
      <Flex
        justifyContent="center"
        alignItems="center"
        position="sticky"
        top="0px"
        padding="0"
        zIndex="999"
      >
        <Flex
          gap="1rem"
          alignItems="center"
          width="90%"
          margin="1rem auto 0.5rem"
        >
          <Box position="relative" flex="1">
            <InputGroup
              endElement={
                inputValue ? (
                  <Button
                    onClick={() => setInputValue('')}
                    position="absolute"
                    right="0.5rem"
                    top="50%"
                    transform="translateY(-50%)"
                    bg="transparent"
                    border="none"
                    padding="0.25rem"
                    color="#666"
                    fontSize="1.5rem"
                    lineHeight="1"
                    _hover={{
                      color: "black"
                    }}
                    aria-label="Clear search"
                  >
                    &times;
                  </Button>
                ) : undefined
              }
            >
              <Input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
                width="100%"
                padding="0.75rem"
                paddingRight="2.5rem"
                fontSize="1rem"
                borderRadius="5px"
                border="1px solid #ccc"
                bg="ivory"
                color="#333"
                _placeholder={{
                  color: "#888",
                  fontWeight: "bold"
                }}
                _focus={{
                  outline: "none",
                  borderColor: "brand.default",
                  boxShadow: "0 0 0 1px {colors.brand.default}"
                }}
              />
            </InputGroup>
          </Box>
          <ExportButtons exportConfig={exportConfig} items={sortedItems} />
        </Flex>
      </Flex>

      {summary && (
        <Box textAlign="center" marginBottom="1rem">
          {summary(sortedItems.length, initialItems.length)}
        </Box>
      )}

      {tabs && tabs.length > 0 ? (
        <Tabs.Root lazyMount defaultValue={0} width="100%">
          <Tabs.List
            position="sticky"
            // The search bar is ~60px high, and this provides a little extra space
            top="3rem"
            zIndex="docked" // Chakra's theme value for sticky elements (often 10)
            bg="#F9F6EE" // Match the background from globals.css
            width="100%"
          >
            {tabs.map((tab, index) => (
              <Tabs.Trigger
                key={index}
                value={index}
                _selected={{ color: '#333', borderColor: '#2980b9', borderBottomWidth: '2px' }}
                color="#aaa"
              >
                {tab.title}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {tabs.map((tab, index) => (
            <Tabs.Content key={index} value={index}>
              {tab.content(renderProps)}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      ) : (
        <Box>
          {children && children(renderProps)}
        </Box>
      )}
    </Box>
  );
}