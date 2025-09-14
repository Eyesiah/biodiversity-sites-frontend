import { useState, useMemo } from 'react';
import styles from '../styles/SiteDetails.module.css';

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

export const getSortClassName = (name, sortConfig) => {
  if (!sortConfig) {
    return;
  }
  return sortConfig.key === name ? styles[sortConfig.direction] : undefined;
};
