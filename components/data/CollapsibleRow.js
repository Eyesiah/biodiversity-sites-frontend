import { useState } from 'react';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { DataTable } from '@/components/styles/DataTable';

export const CollapsibleRow = ({ 
  mainRow, 
  collapsibleContent, 
  colSpan, 
  onToggle, 
  onMainRowClick, 
  isOpen: externalIsOpen, 
  setIsOpen: setExternalIsOpen,
  tableType = 'primary' // 'primary' or 'data'
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Select the appropriate table components based on tableType
  const Table = tableType === 'data' ? DataTable : PrimaryTable;

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
      <Table.Row
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        bg={isHovered ? "tableHoverBg" : undefined}
      >
        {mainRow}
      </Table.Row>
      {isOpen && (
        <Table.Row
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          bg={isHovered ? "tableHoverBg" : undefined}
        >
          <Table.Cell colSpan={colSpan}>
            {collapsibleContent}
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
};