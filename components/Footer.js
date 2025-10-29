import ExternalLink from '@/components/ExternalLink';
import Link from 'next/link';
import { Box, Text } from '@chakra-ui/react';

export default function Footer({ lastUpdated }) {
  return (
    <Box as="footer" textAlign="center" padding="1rem" fontSize="0.8rem" color="lightGray" bg="charcoal">
      <Text>
        Designed and built by <ExternalLink href="https://bristoltreeforum.org/"><Text as="b">Bristol Tree Forum</Text></ExternalLink> | <Link href="/about#privacy-policy" target="_blank">Privacy Policy</Link>
      </Text>

      {lastUpdated && (  
        <Text>
          Page last updated: {new Date(lastUpdated).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
        </Text>
      )}
      <Text>
        Version: {process.env.APP_VERSION}-{process.env.GIT_COMMIT_HASH}
      </Text>
    </Box>
  );
}
