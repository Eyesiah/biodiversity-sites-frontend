'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ColorModeProvider } from './color-mode'
import system from '../../theme'

export function Provider({ children }) {
  return (
    <ColorModeProvider>
      <ChakraProvider value={system || defaultSystem}>{children}</ChakraProvider>
    </ColorModeProvider>
  )
}
