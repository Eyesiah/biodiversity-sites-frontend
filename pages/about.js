import Head from 'next/head';
import ExternalLink from '@/components/ExternalLink';
import Image from 'next/image';

export default function About() {
  return (
    <div className="container">
      <Head>
        <title>About</title>
      </Head>
      <main className="main prose">
        <h1 className="title">Biodiversity Gain Sites in England</h1>

        <p>Biodiversity gain sites in England are locations where new or improved habitats are created to achieve England&apos;s <ExternalLink href="https://www.google.com/search?q=Biodiversity+Net+Gain+(BNG)">Biodiversity Net Gain (BNG)</ExternalLink> requirement. Developers must now achieve at least a 10% increase in the biodiversity of a parcel of land following its development. If this is not possible within the development site itself - by creating or enhancing its existing habitats - the biodiversity gain must be delivered elsewhere, by developers paying for the same types of habitat at a different location. For this purpose, Biodiversity Gain Sites (BGS) have been made available by landowners, who will sell <ExternalLink href="https://www.google.com/search?q=biodiversity+units">biodiversity units</ExternalLink> to developers.</p>
        <p>You can search the list of sites here in various ways to find the most appropriate one for your needs.</p>
        <h2>How we gathered the data</h2>
        <p>The data included in the list of biodiversity gain sites given here is compiled from various sources:</p>
        
        <h3>1. The BGS Register</h3>
        <p><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">Biodiversity Gain Site (BGS) Register</ExternalLink></p>
        <p>The public register lists all the biodiversity gain sites in England, along with their location and what enhanced habitats they offer. The register can also be used to check the type and number of off-site biodiversity enhancements allocated to a particular development.</p>
        <p><ExternalLink href="https://www.legislation.gov.uk/uksi/2024/45/contents/made">The Biodiversity Gain Site Register Regulations 2024</ExternalLink></p>
        <p><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain/search">BGS Register Search</ExternalLink> This is the source of the base data. Until the data is provided publicly in computer-readable form, the data is extracted from the json files used to render the HTML website.</p>

        <h3>2. Responsible Bodies</h3>
        <p>Details of the responsible bodies are taken from the .GOV list <ExternalLink href="https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies">Conservation covenants: list of designated responsible bodies</ExternalLink>.</p>

        <h3>3. Locations</h3>
        <p>BGS Site locations are given but the precise location of allocations addresses has to be deduced using the Google Geocoder. Where the address is incomplete or missing, the location falls back to the centre point of the LPA.</p>

        <h3>4. Local Planning Authorities (LPAs)</h3>
        <p>Links to the government list of LPA.</p>
        <p><ExternalLink href="https://geoportal.statistics.gov.uk/datasets/local-planning-authorities-april-2023-names-and-codes-in-the-uk/explore"> List of all LPAs.</ExternalLink></p>

        <h3>5. National Character Areas (NCAs)</h3>
        <p>Boundaries of NCAs are used to identify the NCA in which a BGS site is located.</p>
        <p><ExternalLink href="https://nationalcharacterareas.co.uk/">NCAs and their Profiles.</ExternalLink></p>

        <h3>6. Local Nature Recovery Strategy (LNRS)</h3>
        <p>LNRS stands for Local Nature Recovery Strategy, a legally required system of spatial strategies in England, mandated by the Environment Act 2021. Each region creates an LNRS to identify and map important habitats, set priorities for habitat creation and improvement, and coordinate actions to restore, create, and connect habitats to support nature&apos;s recovery.</p>
        <p><ExternalLink href="https://www.gov.uk/government/publications/local-nature-recovery-strategies-areas-and-responsible-authorities">LNRSs and their Profiles.</ExternalLink></p>

        <h3>7. Lower Layer Super Output Areas (LSOAs)</h3>
        <p>A Lower Layer Super Output Area (LSOA) is a geographic statistical unit in the UK, used for the publication of small-area statistics. Each LSOA comprises between 4 and 5 Output Areas (OAs) and contains 1,000 to 3,000 people (between 400 and 1,200 households).</p>
        <p><ExternalLink href="https://www.data.gov.uk/dataset/c481f2d3-91fc-4767-ae10-2efdf6d58996/lower-layer-super-output-areas-lsoas">LSOAs and their Profiles.</ExternalLink></p>
        
        <h3>8. Index of Multiple Deprivation (IMD)</h3>
        <p>An official measure used in England to assess relative deprivation in small geographic areas by combining data from seven different domains: Income, Employment, Education, Skills and Training, Health Deprivation and Disability, Crime, Barriers to Housing and Services, and Living Environment. The IMD helps identify areas with high concentrations of different types of deprivation, allowing users to understand and compare levels of disadvantage across the country.</p>
        <p>Levels of deprivation are shown in deciles - between 1 to 10 - with band 1 being within the most deprived 10% areas of the country and band 10 being within the least deprived 10% of the country.</p>
        <p><ExternalLink href="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019">IMDs and their Profiles</ExternalLink></p>
        
        <h2>How we processed the data</h2>
        <p>We enhanced the base data extracted from the BGS register in a number of ways:</p>

        <h3>1. Site Habitats - HU calculations</h3>
        <p>Baseline parcels are as per the standard formula – Habitat Unit (HU) = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low, 1).</p>

        <h3>2. Improvements</h3>
        <p>Created parcels - HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel – low, 1) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (Low, 1)</p>
        <p>Enhanced parcels - HU is not computed because no connection can be made back to the baseline habitat parcel&apos;s value.</p>
        <p>The LPA, NCA and LNRS of a site or allocation is computed by lookup of the location within the area boundary - a rather slow operation without the help of a GIS index.</p>
        <p>The data is refreshed on a six-hourly basis.</p>

        <h2>Acknowledgements</h2>
        <p>Digital boundaries and reference maps:</p>     
        <p>© Natural England 2023. Contains OS data © Crown Copyright [and database right] 2023</p>
        <p>Contains GeoPlace data © Local Government Information House Limited copyright and database right 2023</p>

        <h2>Exports</h2>
        <p>The site summary is now available as a WFS map layer on the WFS service <ExternalLink href="https://bristoltrees.space/wfs/wfs-server.xq">https://bristoltrees.space/wfs/wfs-server.xq</ExternalLink>.</p>

        <h2>Development</h2>
        <p>This is a <ExternalLink href="https://nextjs.org/">Next.js</ExternalLink> project that displays Biodiversity Gain Sites data scraped from <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">https://environment.data.gov.uk/biodiversity-net-gain</ExternalLink>.</p>
  
      </main>
    </div>
  );
}