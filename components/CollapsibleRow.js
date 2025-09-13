import { useState } from 'react';
import styles from '../styles/SiteDetails.module.css';

export const CollapsibleRow = ({ mainRow, collapsibleContent, colSpan, onToggle, onMainRowClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = (e) => {
    // If a specific main row click handler is provided, let it control logic.
    if (onMainRowClick) {
      onMainRowClick(e);
    }
    // Default behavior is to toggle.
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);    
    if (onToggle) {
      onToggle(newIsOpen);
    }
  };

  return (
    <>
      <tr
        onClick={handleToggle}
        className={`${styles.clickableRow} ${isHovered ? styles.subTableHovered : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {mainRow}
      </tr>
      {isOpen && (
        <tr
          className={`${isHovered ? styles.subTableHovered : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <td colSpan={colSpan}>
            {collapsibleContent}
          </td>
        </tr>
      )}
    </>
  );
};