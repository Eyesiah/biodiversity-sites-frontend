import { useState } from 'react';
import styles from '@/styles/SiteDetails.module.css';
import { PrimaryTable } from '@/components/ui/PrimaryTable';

export const CollapsibleRow = ({ mainRow, collapsibleContent, colSpan, onToggle, onMainRowClick, isOpen: externalIsOpen, setIsOpen: setExternalIsOpen }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // If isOpen is controlled externally, use that value. Otherwise, use internal state.
  const isOpen = externalIsOpen != null ? externalIsOpen : internalIsOpen;

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
      <PrimaryTable.Row
        onClick={handleToggle}
        className={`${styles.clickableRow} ${isHovered ? styles.subTableHovered : ''}`}
        onMouseEnter={() => setIsHovered(PrimaryTable.Row)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {mainRow}
      </PrimaryTable.Row>
      {isOpen && (
        <PrimaryTable.Row
          className={`${isHovered ? styles.subTableHovered : ''}`}
          onMouseEnter={() => setIsHovered(PrimaryTable.Row)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <PrimaryTable.Cell colSpan={colSpan}>
            {collapsibleContent}
          </PrimaryTable.Cell>
        </PrimaryTable.Row>
      )}
    </>
  );
};