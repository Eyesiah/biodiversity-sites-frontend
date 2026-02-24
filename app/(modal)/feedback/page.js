import ExternalLink from '@/components/ui/ExternalLink';
import ProseContainer from '@/components/styles/ProseContainer';
import { Heading, Text } from "@chakra-ui/react";

export const metadata = {
  title: 'Feedback',
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/feedback',
  },
};

export default function Feedback() {
  return (
    <>
      <ProseContainer>
        <Heading as="h3" size="md">Feedback</Heading>

        <Text>This website is still in beta, so we&apos;re interested to receive any feedback from users in the BNG/BGS community about what works for you.</Text>
        <Text>Please send your feedback to: BGS_Suggestions@bristoltreeforum.org.</Text>
        <Text>If you have a bug to report or new feature suggestion, please email us or create a new issue on our <ExternalLink href="https://github.com/Eyesiah/biodiversity-sites-frontend/issues">GitHub page</ExternalLink>.</Text>
      </ProseContainer>
    </>
  );
}
