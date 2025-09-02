import Head from 'next/head';
import ExternalLink from '../components/ExternalLink';

export default function About() {
  return (
    <div className="container">
      <Head>
        <title>About</title>
      </Head>
      <main className="main prose">
        <h1 className="title">Biodiversity Gain Sites in England</h1>

        <p>England's <ExternalLink href="https://www.google.com/search?q=Biodiversity+Net+Gain+(BNG)">Biodiversity Net Gain (BNG)</ExternalLink> requirement, which aims to leave nature in a measurably better state after a development project, means that developers must now achieve at least a 10% increase in the biodiversity of a parcel of land following its development. If this is not possible, Biodiversity Gain Sites (BGS) have been made available. These sites are locations where habitats for wildlife are created or improved. If biodiversity gains can’t be delivered within a development site - by creating or enhancing its existing habitats - they must be delivered elsewhere, by developers paying for the same types of habitat at a different location. Landowners have registered their land for this purpose and will sell <ExternalLink href="https://www.google.com/search?q=biodiversity+units">biodiversity units</ExternalLink> to developers.</p>

        <h2>How we gathered the data</h2>
        <p>The data included in the list of biodiversity gain sites given here is compiled from various sources:</p>
        
        <h3>1. The BGS Register</h3>
        <p><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">Biodiversity Gain Site (BGS) Register</ExternalLink></p>
        <p>The public register lists all the biodiversity gain sites in England, along with their location and what enhanced habitats they offer. The register can also be used to check the type and number of off-site biodiversity enhancements allocated to a particular development.</p>
        <p><ExternalLink href="https://www.legislation.gov.uk/uksi/2024/45/contents/made">The Biodiversity Gain Site Register Regulations 2024</ExternalLink></p>
        <p><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain/search">BGS Register Search</ExternalLink> This is the source of the base data. Until the data is provided publicly in computer-readable form, the data is extracted from the json files used to render the HTML website.</p>

        <h3>2. Responsible Bodies</h3>
        <p>Details of the responsible bodies are taken from the <ExternalLink href="http://gov.uk">gov.uk</ExternalLink> document but the names do not agree with those used in the BGS Register.</p>
        <p><ExternalLink href="https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies">List of Designated Responsible Bodies</ExternalLink></p>

        <h3>3. Locations</h3>
        <p>Site locations are given but the precise location of allocations has to be deduced from the address using Google’s Geocoder. This sometimes doesn’t work well, so some checking is needed. If it fails, the location falls back to the LPA's centroid.</p>

        <h3>4. Local Planning Authorities (LPAs)</h3>
        <p>Links to LPA planning portals for searching for an application have been manually gathered.</p>

        <h3>5. National Character Areas (NCAs)</h3>
        <p>Boundaries of NCAs are used to identify the NCA in which a BGS site is located.</p>
        <p><ExternalLink href="https://nationalcharacterareas.co.uk/">NCAs and their Profiles</ExternalLink></p>

        <h2>How we processed the data</h2>
        <p>We enhanced the base data extracted from the register in a number of ways:</p>

        <h3>1. Site Habitats - HU calculations</h3>
        <p>Baseline parcels are as per the standard formula – Habitat Unit (HU) = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low, 1).</p>

        <h3>2. Improvements</h3>
        <ul>
          <li>Created parcels - HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel – low, 1) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (Low, 1)</li>
          <li>Enhanced parcels - HU is not computed because no connection can be made back to the baseline habitat parcel’s value.</li>
        </ul>
        <p>The LPA, NCA and LNRS of a site or allocation is computed by lookup of the location within the area boundary - a rather slow operation without the help of a GIS index.</p>
        <p>The data is refreshed on a six-hourly basis.</p>

        <h2>Exports</h2>
        <p>The site summary is now available as a WFS map layer on the WFS service <ExternalLink href="https://bristoltrees.space/wfs/wfs-server.xq">https://bristoltrees.space/wfs/wfs-server.xq</ExternalLink>.</p>

        <h2>Development</h2>
        <p>This is a <ExternalLink href="https://nextjs.org/">Next.js</ExternalLink> project that displays Biodiversity Gain Sites data scraped from <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">https://environment.data.gov.uk/biodiversity-net-gain</ExternalLink>.</p>

        <h2>What is Biodiversity Net Gain?</h2>
        <p>Biodiversity Net Gain (BNG) represents a transformative shift in England's approach to development and environmental policy. Enacted under the Environment Act 2021, BNG is a legally binding framework designed to ensure that new developments, with limited exemptions, leave habitats for wildlife in a measurably better state than they were before construction. This is quantified through the use of a statutory biodiversity metric, which assigns a numerical value, or ‘biodiversity unit’, to habitats. Developers must achieve a minimum 10% gain in these units, a commitment that must be legally secured for at least 30 years.</p>
        <p>The BNG process is not simply a spreadsheet calculation; it is heavily dependent on the professional expertise and judgment of ecologists. Ecologists conduct a thorough assessment of a site's baseline conditions, which includes desk studies and field surveys to map and classify habitat types. They must also assess a site's strategic significance.</p>
      </main>
    </div>
  );
}