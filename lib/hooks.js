import { useState, useMemo, useEffect } from 'react';

export const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // Function to access nested properties
        const getNestedValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

        let keyA = getNestedValue(a, sortConfig.key);
        let keyB = getNestedValue(b, sortConfig.key);

        // Handle numeric sorting for IMD Decile
        if (sortConfig.key === 'imdDecile') {
          keyA = (keyA === 'N/A' || keyA === null) ? -1 : Number(keyA);
          keyB = (keyB === 'N/A' || keyB === null) ? -1 : Number(keyB);
        }
        if (sortConfig.key === 'id') {
          // Try to extract numbers from the ID for sorting, falling back to the original string
          const numA = parseInt((keyA || '').replace(/[^0-9]/g, ''), 10);
          const numB = parseInt((keyB || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            keyA = numA;
            keyB = numB;
          }
        }

        // Handle percentage fields (ensure they are treated as numbers)
        if (['baselineShare', 'improvementShare', 'allocationShare', 'improvementAllocation'].includes(sortConfig.key)) {
          keyA = Number(keyA) || 0;
          keyB = Number(keyB) || 0;
        }

        if (keyA < keyB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (keyA > keyB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (name) => {
    if (!sortConfig || sortConfig.key !== name) {
      return '';
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  return { items: sortedItems, requestSort, sortConfig, getSortIndicator };
};

export const useSearchAndSort = (initialItems, filterPredicate, initialSortConfig, debounceMs = 300) => {
    const [inputValue, setInputValue] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
    useEffect(() => {
      const timerId = setTimeout(() => {
        setDebouncedSearchTerm(inputValue);
      }, debounceMs);
      return () => clearTimeout(timerId);
    }, [inputValue, debounceMs]);
  
    const filteredItems = useMemo(() => {
      let filtered = [...initialItems];
      if (debouncedSearchTerm) {
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        if (typeof filterPredicate === 'function') {
          filtered = filtered.filter(item => filterPredicate(item, lowercasedTerm));
        }
      }
      return filtered;
    }, [initialItems, debouncedSearchTerm, filterPredicate]);
  
    const { items: sortedItems, requestSort, getSortIndicator, sortConfig } = useSortableData(filteredItems, initialSortConfig);
  
    return {
      inputValue,
      setInputValue,
      sortedItems,
      requestSort,
      getSortIndicator,
      sortConfig
    };
  }

export const getSortProps = (name, sortConfig) => {
  if (!sortConfig || sortConfig.key !== name) {
    return {};
  }
  
  // Return Chakra UI compatible props for sorting indicators
  return {
    _after: {
      content: sortConfig.direction === 'ascending' ? '" ▲"' : '" ▼"',
      ml: 1
    }
  };
};

export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Guard for server-side rendering
    if (typeof window === 'undefined') {
      return;
    }

    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [breakpoint]);

  return isMobile;
};
