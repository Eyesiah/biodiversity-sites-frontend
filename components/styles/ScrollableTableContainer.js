'use client';

import { useEffect, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { visibleScrollbarCss } from '@/components/styles/PrimaryCard';

const BOTTOM_GAP_PX = 16;
const MIN_HEIGHT_PX = 300;

/**
 * ScrollableTableContainer - wrapper for long tables. Fits the space between its top
 * edge and the bottom of the screen, so the horizontal scrollbar stays in view and
 * the column headers stick. The search box and summary above it vary in height, so
 * the space is measured rather than fixed.
 */
export const ScrollableTableContainer = (props) => {
  const ref = useRef(null);
  const [maxHeight, setMaxHeight] = useState('100vh');

  useEffect(() => {
    const updateHeight = () => {
      if (!ref.current) return;
      const top = ref.current.getBoundingClientRect().top + window.scrollY;
      setMaxHeight(`${Math.max(window.innerHeight - top - BOTTOM_GAP_PX, MIN_HEIGHT_PX)}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <Box ref={ref} overflow="auto" width="100%" maxHeight={maxHeight} css={visibleScrollbarCss}
      {...props}
    />
  );
};
