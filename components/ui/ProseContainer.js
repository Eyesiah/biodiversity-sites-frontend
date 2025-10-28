'use client'

import { Center, Container, Stack } from "@chakra-ui/react"

export const ProseContainer = ({ children }) => {
  return (
    <Center py={2} px={3}>
      <Container maxW="container.md" px={0}>
        <Stack spacing={4} textAlign="left">
          {children}
        </Stack>
      </Container>
    </Center>
  )
}

export default ProseContainer


