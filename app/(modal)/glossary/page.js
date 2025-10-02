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
              
            <h3>Allocation</h3>
            <dd>The planned habitat set aside by a BGS site to meet the BNG requirements of a specific development.</dd>
            <h3>Baseline habitat</h3>
            <dd>The pre-existing habitat of a site before that site is developed.</dd>
            <h3>Biodiversity Gain Site (BGS)</h3>
            <dd>An area of land or habitat designated to create or enhance habitats for wildlife, leading to a measurable increase in biodiversity. Only sites registered on the <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">BGS Register</ExternalLink> are eligible for this designation.</dd>
            <h3>Biodiversity Net Gain (BNG)</h3>
            <dd>An approach to development that aims to leave the natural environment in a measurably better state than it was beforehand.</dd>
            <h3>Condition</h3>
            <dd>The ecological health and functional status of a habitat, indicating its resilience and how well it supports its ecosystem. It's assessed using criteria for specific habitat types, often resulting in a rating (e.g. good, moderate or poor) based on factors like species presence, management and disturbance.</dd>
            <h3>Distinctiveness</h3>
            <dd>A measure of a habitat's ecological rarity and value, with higher scores given to habitats - like ancient woodland or limestone grassland - that support rare species or are scarce in the local area.</dd>
            <h3>Habitat</h3>
            <dd>An environment or area that supports living organisms, including plants, animals and fungi.</dd>
            <h3>Habitat Unit (HU)</h3>
            <dd>A quantitative measure of the value of a natural habitat, used in Biodiversity Net Gain (BNG) calculations in England. It is calculated based on a habitat's size (area or length), distinctiveness, condition and strategic significance, with higher values indicating better ecological quality and greater biodiversity.</dd>
            <h3>Improvement</h3>
            <dd>A habitat can be improved either by enhancing its condition or by creating a new habitat in a particular condition.</dd>
            <h3>IMD (Index of Multiple Deprivation) Decile</h3>
            <dd>An area's relative social deprivation ranging from 1 (the most deprived) to 10 (the least deprived).</dd>
            <h3>Local Nature Recovery Strategy (LNRS) site</h3>
            <dd>A location within an LNRS that holds significance for nature recovery. These sites can be either existing valuable areas for wildlife or opportunity areas, where habitat creation or restoration is planned to deliver the greatest environmental benefits, such as improving biodiversity, carbon sequestration or flood regulation.</dd>
            <h3>Local Planning Authority (LPA)</h3>
            <dd>A local government body, often a council department, responsible for managing land use and development in a specific area. Its functions include deciding on planning applications, preparing and implementing local plans, and enforcing planning policies to ensure that development is sustainable and balances economic, environmental and social considerations.</dd>
            <h3>Lower Layer Super Output Area (LSOA)</h3>
            <dd>The smallest geographic unit used in England and Wales for statistical purposes, typically comprising 1,000 to 3,000 residents and 400 to 1,200 households.</dd>
            <h3>National Character Area (NCA)</h3>
            <dd>A distinctive and recognisable unit of England's landscape, defined by a unique sense of place resulting from its specific natural, cultural and economic features. NCAs follow the natural lines of the landscape, rather than administrative boundaries like counties, making them a useful framework for planning and decision making for landscape and environmental projects. There are 159 NCAs in England, and each has a detailed profile outlining its characteristics and how it functions and can be sustained. See https://nationalcharacterareas.co.uk/.</dd>
            <h3>Parcel</h3>
            <dd>A discrete habitat within a larger site containing a single, consistent type of habitat in a particular condition.</dd>
            <h3>Responsible Body</h3>
            <dd>An organisation designated by Defra to hold and administer conservation covenants for BNG projects, monitoring and enforcing habitat improvement plans to ensure long-term conservation.</dd>
            <h3>Size</h3>
            <dd>Either area habitats, measured in hectares (ha), or linear habitats (hedgerows and watercourses), measured in kilometres (km).</dd>
         
        </div>
        </div>
      <Footer />
    </>
  );
}