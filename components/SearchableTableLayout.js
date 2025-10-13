'use client';

import { useSearchAndSort } from '@/lib/hooks';
import styles from '@/styles/SiteDetails.module.css';
import { Tabs } from "@chakra-ui/react"

// A flexible component for handling different export buttons
const ExportButtons = ({ exportConfig, items }) => {
  if (!exportConfig) return null;

  return (
    <div className={styles.buttonGroup}>
      {exportConfig.onExportXml && <button onClick={() => exportConfig.onExportXml(items)} className={styles.exportButton}>Export to XML</button>}
      {exportConfig.onExportJson && <button onClick={() => exportConfig.onExportJson(items)} className={styles.exportButton}>Export to JSON</button>}
      {exportConfig.onExportCsv && 
        <button onClick={() => exportConfig.onExportCsv(items)} className="linkButton" style={{ fontSize: '1rem', padding: '0.75rem 1rem', border: '1px solid #27ae60', borderRadius: '5px' }}>
          Export to CSV
        </button>
      }
    </div>
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
  children // Original render prop for non-tabbed content
}) {
  const {
    inputValue,
    setInputValue,
    sortedItems,
    requestSort,
    getSortIndicator
  } = useSearchAndSort(initialItems, filterPredicate, initialSortConfig);

  const renderProps = { sortedItems, requestSort, getSortIndicator, inputValue };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }} className="sticky-search">
        <div className="search-container" style={{ margin: 0 }}>
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            style={{ width: '480px' }}
          />
          {inputValue && (
            <button onClick={() => setInputValue('')} className="clear-search-button" aria-label="Clear search">&times;</button>
          )}
        </div>
        <ExportButtons exportConfig={exportConfig} items={sortedItems} />
      </div>

      {summary && summary(sortedItems.length, initialItems.length)}

      {tabs && tabs.length > 0 ? (
        <Tabs.Root lazyMount defaultValue={0}>
          <Tabs.List>
            {tabs.map((tab, index) => (
              <Tabs.Trigger key={index} value={index}>{tab.title}</Tabs.Trigger>
            ))}
            <Tabs.Indicator/>
          </Tabs.List>
          {tabs.map((tab, index) => (
            <Tabs.Content key={index} value={index}>
              {tab.content(renderProps)}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      ) : (
        <div className="table-container">
          {children && children(renderProps)}
        </div>
      )}
    </>
  );
}