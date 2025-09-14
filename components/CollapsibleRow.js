import { useState } from 'react';
import styles from 'styles/SiteDetails.module.css';

export const CollapsibleRow = ({ mainRow, collapsibleContent, colSpan, onToggle, onMainRowClick, isOpen: externalIsOpen, setIsOpen: setExternalIsOpen }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // If isOpen is controlled externally, use that value. Otherwise, use internal state.
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleToggle = (e) => {
    if (onMainRowClick) {
      onMainRowClick(e);
    }
    const newIsOpen = !isOpen;
    // If not controlled externally, update internal state.
    if (setExternalIsOpen) {
      setExternalIsOpen(newIsOpen);
    } else {
      setInternalIsOpen(newIsOpen);
    }
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