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
              
            <h3>Allocation</h3>The planned habitat set aside by a BGS site to meet the offsite BNG requirements of a specific development.
            <h3>Baseline habitat</h3>The pre-existing habitat of a site before that site is developed.
            <h3>Biodiversity Gain Site (BGS)</h3>An area of land or habitat designated to create or enhance habitats for wildlife, leading to a measurable increase in biodiversity. Only sites registered on the <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">BGS Register</ExternalLink> are eligible for this designation.
            <h3>Biodiversity Net Gain (BNG)</h3>An approach that requires that most new developments leave the natural environment in a measurably better state than before. An increase of at least 10% in biodiversity through habitat retention, creation and/or enhancement is required.
            <h3>Condition</h3>The ecological health and functional status of a habitat, indicating its resilience and how well it supports its ecosystem. It's assessed using criteria for specific habitat types, often resulting in a rating (e.g. good, moderate or poor) based on factors like species presence, management and disturbance.
            <h3>Habitat</h3>An environment or area that supports living organisms, including plants, animals and fungi.
            <h3>Habitat Unit (HU)</h3>A quantitative measure of the value of a natural habitat, used in Biodiversity Net Gain calculations. It is calculated based on a habitat's size (area or length), distinctiveness, condition and strategic significance, with higher values indicating better ecological quality and greater biodiversity.
            <h3>IMD (Index of Multiple Deprivation) Decile</h3>An area's relative social deprivation ranging from 1 (the most deprived) to 10 (the least deprived).
            <h3>Local Nature Recovery Strategy (LNRS) site</h3>An England-wide system of spatial strategies required by the Environment Act 2021 that identifies priorities and maps proposals for nature recovery at the local level. These strategies are designed to map existing important habitats, identify areas for new or improved habitats, set out priorities for action, and integrate with the planning system to support wider environmental benefits like biodiversity, flood management, carbon storage, and water quality.
            <h3>Local Planning Authority (LPA)</h3>A local government body, often a council department, responsible for managing land use and development in a specific area. Its functions include deciding on planning applications, preparing and implementing local plans, and enforcing planning policies to ensure that development is sustainable and balances economic, environmental and social considerations.
            <h3>Lower Layer Super Output Area (LSOA)</h3>The smallest geographic unit used in England and Wales for statistical purposes, typically comprising 1,000 to 3,000 residents and 400 to 1,200 households.
            <h3>National Character Area (NCA)</h3>A distinctive and recognisable unit of England's landscape, defined by a unique sense of place resulting from its specific natural, cultural and economic features. NCAs follow the natural lines of the landscape, rather than administrative boundaries like counties, making them a useful framework for planning and decision making for landscape and environmental projects. There are 159 NCAs in England, and each has a detailed profile outlining its characteristics and how it functions and can be sustained. See https://nationalcharacterareas.co.uk/.
            <h3>Parcel</h3>A discrete habitat within a larger site containing a single, consistent type of habitat in a particular condition.
            <h3>Responsible Body</h3>An organisation designated by Defra to hold and administer conservation covenants for BNG projects, monitoring and enforcing habitat improvement plans to ensure long-term conservation.
            <h3>Size</h3>Either area habitats, measured in hectares (ha), or linear habitats (hedgerows and watercourses), measured in kilometres (km).
         
        </div>
        </div>
      <Footer />
    </>
  );
}