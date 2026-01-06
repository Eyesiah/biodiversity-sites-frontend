'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@chakra-ui/react';

const Tooltip = ({ children, text }) => {
  const [isVisible, setIsVisible] = useState(false);
  const targetRef = useRef(null);
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useLayoutEffect(() => {
    if (isVisible && targetRef.current && tooltipRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;

      setPosition(prevPosition => {
        let newTop;
        // Position vertically
        if (targetRect.top - tooltipRect.height - 10 > 0) {
          // Position above
          newTop = targetRect.top - tooltipRect.height - 10;
        } else {
          // Position below
          newTop = targetRect.bottom + 10;
        }

        // Position horizontally
        let newLeft = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        if (newLeft < 10) {
          newLeft = 10; // Clamp to left
        } else if (newLeft + tooltipRect.width > viewportWidth - 10) {
          newLeft = viewportWidth - tooltipRect.width - 10; // Clamp to right
        }

        // Only update state if the position has actually changed
        if (newTop === prevPosition.top && newLeft === prevPosition.left) {
          return prevPosition;
        }

        return { top: newTop, left: newLeft };
      });
    }
  }, [isVisible]);

  const tooltipContent = (
    <Box
      ref={tooltipRef}
      position="fixed"
      top={position.top}
      left={position.left}
      bg="ivory"
      color="black"
      p="8px 12px"
      borderRadius="6px"
      border="1px solid #2d618fff"
      whiteSpace="normal"
      pointerEvents="none"
      maxW="300px"
      zIndex="9999"
      sx={{
        visibility: isVisible && position.top !== 0 ? 'visible' : 'hidden'
      }}
      dangerouslySetInnerHTML={{ __html: text }}
    >
    </Box>
  );

  return (
    <>
      <span
        ref={targetRef}
        style={{ textDecoration: 'underline dotted', cursor: 'help' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {isMounted && isVisible && createPortal(tooltipContent, document.body)}
    </>
  );
};

export default Tooltip;
