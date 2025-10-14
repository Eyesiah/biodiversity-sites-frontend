'use client'

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ColorModeProvider } from './color-mode'
import system from '../../theme'

export function Provider(props) {
  return (
    <ChakraProvider value={system || defaultSystem}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
