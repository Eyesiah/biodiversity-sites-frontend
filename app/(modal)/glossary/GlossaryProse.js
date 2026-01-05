'use client'

import { Heading, Text } from "@chakra-ui/react";
import ProseContainer from '@/components/styles/ProseContainer';
import ExternalLink from "@/components/ui/ExternalLink";

export default function GlossaryProse({ glossaryData }) {

  if (glossaryData == null) {
    return <Text>Glossary Data not found</Text>;
  }

  return (
    <ProseContainer>
      {glossaryData.map(entry => {
        return (
          <div key={entry.term}>
            <Heading as="h3" size="md">{entry.term}</Heading>
            <Text>{entry.definition}</Text>
            {entry.link && entry.link.length > 0 && <Text>See <ExternalLink href={entry.link}>{entry.linkText || entry.link}</ExternalLink>.</Text>}
          </div>
        )
      })}

    </ProseContainer>
  );
}