import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Tooltip = ({ children, text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef(null);

  const handleMouseEnter = () => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // Position above the element with a small gap
        left: rect.left + rect.width / 2, // Center horizontally
      });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <span
        ref={targetRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {isVisible && <TooltipPortal text={text} position={position} />}
    </>
  );
};

const TooltipPortal = ({ text, position }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      top: position.top,
      left: position.left,
      transform: 'translate(-50%, -100%)', // Adjust to be perfectly centered and above
      backgroundColor: 'ivory',
      color: 'black',
      padding: '8px 12px',
      borderRadius: '6px',
      zIndex: 9999, // High z-index to be on top of everything
      whiteSpace: 'normal',
      pointerEvents: 'none', // Prevent the tooltip from capturing mouse events
      maxWidth: '250px',
      border: '1px solid #2d618fff',
    }}>
      {text}
    </div>,
    document.body
  );
};

export default Tooltip;