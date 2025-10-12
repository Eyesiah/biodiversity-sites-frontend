import ExternalLink from '@/components/ExternalLink';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Glossary',
};

export default function Glossary() {
  return (
    <>
      <div className="container">
        <div className="main prose">
              
            <h3>Allocation</h3><p>The planned habitat set aside by a BGS site to meet the offsite BNG requirements of a specific development.</p>
            <h3>API</h3><p>An Application Programming Interface is a set of rules and protocols that allows different software systems to communicate and exchange data with each other in a standardized way, without users needing to know the intricate details of how each system is built.</p>
            <h3>Baseline habitat</h3><p>The pre-existing habitat of a site before that site is developed.</p>
            <h3>Biodiversity Gain Site (BGS)</h3><p>An area of land or habitat designated to create or enhance habitats for wildlife, leading to a measurable increase in biodiversity. Only sites listed on the <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">BGS Register</ExternalLink> are eligible for this designation.</p>
            <p><ExternalLink href="https://www.legislation.gov.uk/uksi/2024/45/contents/made">The Biodiversity Gain Site Register Regulations 2024</ExternalLink></p>
            <h3>Condition</h3><p>The ecological health and functional status of a habitat, indicating its resilience and how well it supports its ecosystem. It&apos;s assessed using criteria for specific habitat types, often resulting in a rating - good, moderate or poor - which is based on factors like species presence, management and disturbance.</p>
            <h3>Habitat</h3><p>An environment or area that supports living organisms, including plants, animals and fungi.</p>
            <h3>Habitat Unit (HU)</h3><p>A quantitative measure of the value of a natural habitat, used in Biodiversity Net Gain calculations. It is calculated based on a habitat&apos;s size (area or length), distinctiveness, condition and strategic significance, with higher values indicating better ecological quality and greater biodiversity.</p>
            <h3>IMD (Index of Multiple Deprivation) Decile/Score</h3><p>An official measure used in England to assess relative deprivation in small geographic areas by combining data from seven different domains: Income, Employment, Education, Skills and Training, Health Deprivation and Disability, Crime, Barriers to Housing and Services, and Living Environment. The IMD helps identify areas with high concentrations of different types of deprivation, allowing users to understand and compare levels of disadvantage across the country.</p>
            <p>The IMD decile score ranges from 1 (the most deprived) to 10 (the least deprived). See <ExternalLink href="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019">IMDs and their Profiles</ExternalLink></p>
            <h3>Local Nature Recovery Strategy (LNRS) site</h3><p>An England-wide system of spatial strategies required by the Environment Act 2021 that identifies priorities and maps proposals for nature recovery at the local level. These strategies are designed to map existing important habitats, identify areas for new or improved habitats, set out priorities for action, and integrate with the planning system to support wider environmental benefits like biodiversity, flood management, carbon storage, and water quality. See <ExternalLink href="https://www.gov.uk/government/publications/local-nature-recovery-strategies/local-nature-recovery-strategies">Local nature recovery strategies policy paper</ExternalLink>.</p>
            <h3>Local Planning Authority (LPA)</h3><p>A local government body, often a council department, responsible for managing land use and development in a specific area. Its functions include deciding on planning applications, preparing and implementing local plans, and enforcing planning policies to ensure that development is sustainable and balances economic, environmental and social considerations.</p>
            <h3>Lower Layer Super Output Area (LSOA)</h3><p>The smallest geographic unit used in England and Wales for statistical purposes, typically comprising 1,000 to 3,000 residents and 400 to 1,200 households. See <ExternalLink href="https://www.ons.gov.uk/methodology/geography/ukgeographies/statisticalgeographies">ONS - Statistical geographies</ExternalLink>.</p>
            <h3>National Character Area (NCA)</h3><p>A distinctive and recognisable unit of England&apos;s landscape, defined by a unique sense of place resulting from its specific natural, cultural and economic features. NCAs follow the natural lines of the landscape, rather than administrative boundaries like counties, making them a useful framework for planning and decision making for landscape and environmental projects. There are 159 NCAs in England, and each has a detailed profile outlining its characteristics and how it functions and can be sustained. See <ExternalLink href="https://nationalcharacterareas.co.uk/">National Character Area Profiles</ExternalLink>.</p>
            <h3>Parcel</h3><p>A discrete habitat within a larger site containing a single, consistent type of habitat in a particular condition.</p>
            <h3>Responsible Body</h3><p>An organisation designated by Defra to hold and administer conservation covenants for BNG projects, monitoring and enforcing habitat improvement plans to ensure long-term conservation. See <ExternalLink href="https://www.gov.uk/government/publications/conservation-covenants-apply-to-become-a-responsible-body/conservation-covenants-criteria-for-being-a-responsible-body">Conservation covenants: criteria for being a responsible body guidance</ExternalLink>.</p>
            <h3>Size</h3><p>The size of area habitats is measured in hectares (ha). Linear habitats - hedgerows and watercourses - are measured in kilometres (km).</p>
            <h3>SRM</h3><p>The spatial risk multiplier is a factor used in the statutory BNG metric to reduce the measured ecological value of off-site habitat compensation based on its distance from the development site.</p>
         
        </div>
        </div>
      <Footer />
    </>
  );
}