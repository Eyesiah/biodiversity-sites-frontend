import ExternalLink from '@/components/ui/ExternalLink';
import Footer from '@/components/core/Footer';
import { WFS_URL } from '@/config'
import { Heading, Text, List } from "@chakra-ui/react";
import ProseContainer from '@/components/styles/ProseContainer';

export const metadata = {
  title: 'About',
};

export default function About() {
  return (
    <>
      <ProseContainer>
        <Heading as="h1" size="xl">Biodiversity Gain Sites in England</Heading>

        <Text>Biodiversity gain sites in England are locations where new or improved habitats are created to achieve England&apos;s <ExternalLink href="https://www.google.com/search?q=Biodiversity+Net+Gain+(BNG)">Biodiversity Net Gain (BNG)</ExternalLink> requirement. Developers must now achieve at least a 10% increase in the biodiversity of a parcel of land following its development. If this is not possible within the development site itself - by creating or enhancing its existing habitats - the biodiversity gain must be delivered elsewhere, by developers paying for the same types of habitat at a different location. For this purpose, Biodiversity Gain Sites (BGS) have been made available by landowners, who will sell <ExternalLink href="https://www.google.com/search?q=biodiversity+units">biodiversity units</ExternalLink> to developers.</Text>
        <Text>You can search the list of sites here in various ways to find the most appropriate one for your needs.</Text>

        <Heading as="h2" size="lg">How we gathered the data</Heading>
        <Text>The data included in the list of biodiversity gain sites given here is compiled from various sources:</Text>

        <Heading as="h3" size="md">1. The BGS Register</Heading>
        <Text><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">Biodiversity Gain Site (BGS) Register</ExternalLink></Text>
        <Text><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain/search">BGS Register Search</ExternalLink> This is the source of the base data. Until the data is provided publicly in computer-readable form, the data is extracted from the json files used to render the HTML website.</Text>

        <Heading as="h3" size="md">2. Responsible Bodies</Heading>
        <Text>Details of the responsible bodies are taken from the .GOV list <ExternalLink href="https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies">Conservation covenants: list of designated responsible bodies</ExternalLink>.</Text>

        <Heading as="h3" size="md">3. Locations</Heading>
        <Text>BGS Site locations are given but the precise location of allocations addresses has to be deduced using the Google Geocoder. Where the address is incomplete or missing, the location falls back to the centre point of the LPA.</Text>

        <Heading as="h3" size="md">4. Local Planning Authorities (LPAs)</Heading>
        <Text>The boundaries of all the English LPAs are used to identify the LPA in which a development site or BGS site is located</Text>
        <Text><ExternalLink href="https://geoportal.statistics.gov.uk/datasets/local-planning-authorities-april-2023-names-and-codes-in-the-uk/explore">All LPAs</ExternalLink>.</Text>

        <Heading as="h3" size="md">5. National Character Areas (NCAs)</Heading>
        <Text>The boundaries of NCAs are used to identify the NCA in which a development site or BGS site is located.</Text>
        <Text><ExternalLink href="https://nationalcharacterareas.co.uk/">NCAs and their Profiles</ExternalLink>.</Text>

        <Heading as="h3" size="md">6. Local Nature Recovery Strategy (LNRS)</Heading>
        <Text>The boundaries of LNRS sites are used to identify the LNRS in which a development site or BGS site is located</Text>
        <Text><ExternalLink href="https://www.gov.uk/government/publications/local-nature-recovery-strategies-areas-and-responsible-authorities">LNRSs and their Profiles</ExternalLink>.</Text>

        <Heading as="h3" size="md">7. Deprivation</Heading>
        <Text>Deprivation refers to people&apos;s unmet needs, a lack of access to opportunities and resources which we might expect in our society.</Text>
        
        <Heading as="h3" size="md">7 a). Lower Layer Super Output Areas (LSOAs)</Heading>
        <Text>LSOAs are small areas designed to be of a similar population size, with an average of approximately 1,600 residents or 650 households. There are 33,755 LSOAs in England. They are a standard statistical geography and were produced by the Office for National Statistics for the reporting of small area statistics. LSOAs are referred to as &apos;neighbourhoods&apos; .</Text>
        <Text><ExternalLink href="https://deprivation.communities.gov.uk/">Deprivation in England (2025).</ExternalLink>.</Text>

        <Heading as="h3" size="md">7 b). Decile</Heading>
        <Text>A decile is calculated by ranking the 33,755 neighbourhoods in England from most deprived to least deprived and dividing them into 10 equal groups (i.e. each containing 3,375 or 3,376 neighbourhoods). These deciles range from the most deprived 10 per cent of neighbourhoods nationally to the least deprived 10 per cent of neighbourhoods nationally.</Text>
        
        <Heading as="h2" size="lg">How we processed the data</Heading>
        <Text>We enhanced the base data extracted from the BGS register in a number of ways:</Text>

        <Heading as="h3" size="md">1. Site Habitats - HU calculations</Heading>
        <Text><ExternalLink href="https://bristoltreeforum.org/2024/10/28/biodiversity-gain-metric-calculating-habitat-units">Habitat Units explained</ExternalLink></Text>
        <Text>Baseline parcels are as per the standard formula – Habitat Unit (HU) = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low, 1).</Text>

        <Heading as="h3" size="md">2. Improvements</Heading>
        <Text>Created parcels - HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel – low, 1) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (Low, 1)</Text>
        <Text>We are unable to deduct the value of baseline habitats from the value of those being created because this level of detail is not provided.</Text>
        <Text>Enhanced parcels - HU is not computed because no connection can be made back to the baseline habitat parcel&apos;s value.</Text>

        <Heading as="h2" size="lg">Refreshing the data</Heading>
        <Text>We refresh Defra&apos;s BGS data hourly.</Text>

        <Heading as="h2" size="lg">Acknowledgements</Heading>
        <Text>Digital boundaries and reference maps:</Text>
        <Text>© Natural England 2023. Contains OS data © Crown Copyright [and database right] 2023</Text>
        <Text>Contains GeoPlace data © Local Government Information House Limited copyright and database right 2023</Text>

        <Heading as="h2" size="lg">Exports</Heading>
        <Text>The site summary is now available as a WFS map layer on the WFS service <ExternalLink href={WFS_URL}>{WFS_URL}</ExternalLink>.</Text>

        <Heading as="h2" size="lg">Development</Heading>
        <Text>This is an open-source project designed and built by <ExternalLink href="https://bristoltreeforum.org/">Bristol Tree Forum</ExternalLink> using <ExternalLink href="https://nextjs.org/">Next.js</ExternalLink>.</Text>
        <Text>It is based on data sourced from Natural England&apos;s <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">Biodiversity gain sites register</ExternalLink>.</Text>
        <Text>You can view the source code at <ExternalLink href="https://github.com/Eyesiah/biodiversity-sites-frontend">GitHub</ExternalLink>.</Text>
        
        <Heading id="privacy-policy" as="h2" size="lg">Privacy Policy (last updated 5 Oct 2025)</Heading>
        <Heading as="h3" size="md">1. Data Controller</Heading>
        <Text>
          The data controller responsible for this website is:
          <br />
          Mark Ashdown, Acting Chair, Bristol Tree Forum
          <br />
          Email: BGS_Enquiries@bristoltreeforum.org
        </Text>

        <Heading as="h3" size="md">2. Data we collect</Heading>
        <Text>We collect information in the following ways:</Text>
        <Text>
          <b>Anonymous Website Analytics</b>: We use Umami, a privacy-focused web analytics software, to understand our website traffic. We use this information to improve our content and user experience. Umami is designed to be privacy-friendly and operates without the use of cookies. It collects the following anonymous data:
        </Text>
        <List.Root>
          <List.Item>Pages viewed on our website</List.Item>
          <List.Item>The website that referred you to us (e.g., Google, Twitter)</List.Item>
          <List.Item>The browser and operating system you are using</List.Item>
          <List.Item>The country you are visiting from (based on an anonymized IP address)</List.Item>
          <List.Item>Time of visit and session duration</List.Item>
        </List.Root>
        <Text>Crucially, Umami does not collect any personally identifiable information (PII). Your IP address is not stored, and no user profile is created. All data is aggregated and anonymized.</Text>

        <Heading as="h3" size="md">3. How we use your data</Heading>
        <Text>
          We use the information we collect for the following purposes:
          <br />
          <b>To Improve Our Website:</b> To analyze aggregated, anonymous traffic data to understand what content is popular and how we can improve our website&apos;s functionality and user experience.
        </Text>

        <Heading as="h3" size="md">4. Legal basis for processing (GDPR)</Heading>
        <Text>
          Our legal basis for collecting and using the information described above depends on the specific context:
          <br />
          <b>Legitimate Interest:</b> For processing anonymous analytics data with Umami, we rely on our legitimate interest to monitor and improve our website. Because we use a privacy-preserving tool that does not collect personal data or use cookies, we have determined that our interest does not override your fundamental rights to privacy.
        </Text>

        <Heading as="h3" size="md">5. Cookies and tracking technologies</Heading>
        <Text>This website does not use cookies for analytics tracking. Our analytics provider, Umami, is a cookie-less solution.</Text>

        <Heading as="h3" size="md">6. Data sharing and third parties</Heading>
        <Text>
          We do not sell, trade, or rent your personal information to others.
          <br />
          Our Umami analytics instance is hosted by AWS, and the data is stored in the UK. The data remains anonymous and is processed solely for our analytics purposes.
        </Text>

        <Heading as="h3" size="md">7. Your data protection rights under GDPR</Heading>
        <Text>Under the UK GDPR and the Data Protection Act 2018, you have rights over your personal data. These include:</Text>
        <List.Root>
          <List.Item><b>Your right of access:</b> You have the right to ask us for copies of your personal information.</List.Item>
          <List.Item><b>Your right to rectification:</b> You have the right to ask us to rectify information you think is inaccurate or complete information you think is incomplete.</List.Item>
          <List.Item><b>Your right to erasure:</b> You have the right to ask us to erase your personal information in certain circumstances.</List.Item>
          <List.Item><b>Your right to restriction of processing:</b> You have the right to ask us to restrict the processing of your information in certain circumstances.</List.Item>
          <List.Item><b>Your right to object to processing:</b> You have the right to object to the processing of your personal data in certain circumstances.</List.Item>
          <List.Item><b>Your right to data portability:</b> You have the right to ask that we transfer the information you gave us to another organisation, or to you, in certain circumstances.</List.Item>
        </List.Root>
        <Text>You are not required to pay any charge for exercising your rights. If you make a request, we have one month to respond to you. To exercise any of these rights, please contact us at BGS_Enquiries@bristoltreeforum.org.</Text>
        <Text>You also have the right to lodge a complaint with the UK&apos;s supervisory authority, the Information Commissioner&apos;s Office (ICO). You can find their contact details at ico.org.uk.</Text>

        <Heading as="h3" size="md">8. Data security</Heading>
        <Text>We take reasonable technical and organizational precautions to prevent the loss, misuse, or alteration of your personal information.</Text>

        <Heading as="h3" size="md">9. Changes to this Privacy Policy</Heading>
        <Text>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &apos;Last Updated&apos; date at the top.</Text>

        <Heading as="h3" size="md">10. Contact us</Heading>
        <Text>
          If you have any questions about this Privacy Policy, please contact us at:
          <br />
          BGS_Enquiries@bristoltreeforum.org
        </Text>
      </ProseContainer>
      <Footer />
    </>
  );
}