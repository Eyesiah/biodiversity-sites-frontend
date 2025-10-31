import ExternalLink from '@/components/ui/ExternalLink';
import { Heading, Text } from "@chakra-ui/react";
import ProseContainer from '@/components/styles/ProseContainer';

export const metadata = {
  title: 'Glossary',
};

export default function Glossary() {
  return (
    <>
      <ProseContainer>
        <Heading as="h3" size="md">Allocation</Heading>
        <Text>The planned habitat set aside by a BGS site to meet the offsite BNG requirements of a specific development.</Text>

        <Heading as="h3" size="md">API</Heading>
        <Text>An Application Programming Interface is a set of rules and protocols that allows different software systems to communicate and exchange data with each other in a standardized way, without users needing to know the intricate details of how each system is built.</Text>

        <Heading as="h3" size="md">Baseline habitat</Heading>
        <Text>The pre-existing habitat of a site before that site is developed.</Text>

        <Heading as="h3" size="md">Biodiversity Gain Site (BGS)</Heading>
        <Text>An area of land or habitat designated to create or enhance habitats for wildlife, leading to a measurable increase in biodiversity. Only sites listed on the <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">BGS Register</ExternalLink> are eligible for this designation.</Text>
        <Text><ExternalLink href="https://www.legislation.gov.uk/uksi/2024/45/contents/made">The Biodiversity Gain Site Register Regulations 2024</ExternalLink></Text>

        <Heading as="h3" size="md">Condition</Heading>
        <Text>The ecological health and functional status of a habitat, indicating its resilience and how well it supports its ecosystem. It&apos;s assessed using criteria for specific habitat types, often resulting in a rating - good, moderate or poor - which is based on factors like species presence, management and disturbance.</Text>

        <Heading as="h3" size="md">Decile</Heading>
        <text>A decile is calculated by ranking the 33,755 neighbourhoods in England from most deprived to least deprived and dividing them into 10 equal groups (i.e. each containing 3,375 or 3,376 neighbourhoods). These deciles range from the most deprived 10 per cent of neighbourhoods nationally to the least deprived 10 per cent of neighbourhoods nationally.</text>
        
        <Heading as="h3" size="md">Deprivation</Heading>
        <Text>Deprivation refers to people&apos;s unmet needs, a lack of access to opportunities and resources which we might expect in our society.</Text>
        
        <Heading as="h3" size="md">Habitat</Heading>
        <Text>An environment or area that supports living organisms, including plants, animals and fungi.</Text>

        <Heading as="h3" size="md">Habitat Unit (HU)</Heading>
        <Text>A quantitative measure of the value of a natural habitat, used in Biodiversity Net Gain calculations. It is calculated based on a habitat&apos;s size (area or length), distinctiveness, condition and strategic significance, with higher values indicating better ecological quality and greater biodiversity.</Text>

        <Heading as="h3" size="md">Local Nature Recovery Strategy (LNRS) site</Heading>
        <Text>An England-wide system of spatial strategies required by the Environment Act 2021 that identifies priorities and maps proposals for nature recovery at the local level. These strategies are designed to map existing important habitats, identify areas for new or improved habitats, set out priorities for action, and integrate with the planning system to support wider environmental benefits like biodiversity, flood management, carbon storage, and water quality. See <ExternalLink href="https://www.gov.uk/government/publications/local-nature-recovery-strategies/local-nature-recovery-strategies">Local nature recovery strategies policy paper</ExternalLink>.</Text>

        <Heading as="h3" size="md">Local Planning Authority (LPA)</Heading>
        <Text>A local government body, often a council department, responsible for managing land use and development in a specific area. Its functions include deciding on planning applications, preparing and implementing local plans, and enforcing planning policies to ensure that development is sustainable and balances economic, environmental and social considerations.</Text>

        <Heading as="h3" size="md">Lower Layer Super Output Areas (LSOAs)</Heading>
        <Text>LSOAs are small areas designed to be of a similar population size, with an average of approximately 1,600 residents or 650 households. There are 33,755 LSOAs in England. They are a standard statistical geography and were produced by the Office for National Statistics for the reporting of small area statistics. LSOAs are referred to as &apos;neighbourhoods&apos; .</Text>
        <Text><ExternalLink href="https://deprivation.communities.gov.uk/">Deprivation in England (2025).</ExternalLink>.</Text>

        <Heading as="h3" size="md">National Character Area (NCA)</Heading>
        <Text>A distinctive and recognisable unit of England&apos;s landscape, defined by a unique sense of place resulting from its specific natural, cultural and economic features. NCAs follow the natural lines of the landscape, rather than administrative boundaries like counties, making them a useful framework for planning and decision making for landscape and environmental projects. There are 159 NCAs in England, and each has a detailed profile outlining its characteristics and how it functions and can be sustained. See <ExternalLink href="https://nationalcharacterareas.co.uk/">National Character Area Profiles</ExternalLink>.</Text>

        <Heading as="h3" size="md">Parcel</Heading>
        <Text>A discrete habitat within a larger site containing a single, consistent type of habitat in a particular condition.</Text>

        <Heading as="h3" size="md">Responsible Body</Heading>
        <Text>An organisation designated by Defra to hold and administer conservation covenants for BNG projects, monitoring and enforcing habitat improvement plans to ensure long-term conservation. See <ExternalLink href="https://www.gov.uk/government/publications/conservation-covenants-apply-to-become-a-responsible-body/conservation-covenants-criteria-for-being-a-responsible-body">Conservation covenants: criteria for being a responsible body guidance</ExternalLink>.</Text>

        <Heading as="h3" size="md">Size</Heading>
        <Text>The size of area habitats is measured in hectares (ha). Linear habitats - hedgerows and watercourses - are measured in kilometres (km).</Text>

        <Heading as="h3" size="md">SRM</Heading>
        <Text>The spatial risk multiplier is a factor used in the statutory BNG metric to reduce the measured ecological value of off-site habitat compensation based on its distance from the development site.</Text>

      </ProseContainer>
    </>
  );
}