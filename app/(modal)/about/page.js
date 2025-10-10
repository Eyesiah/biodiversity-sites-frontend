import ExternalLink from '@/components/ExternalLink';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'About',
};

export default function About() {
  return (
    <>
      <div className="container">
        <div className="main prose">
          <h1 className="title">Biodiversity Gain Sites in England</h1>

          <p>Biodiversity gain sites in England are locations where new or improved habitats are created to achieve England&apos;s <ExternalLink href="https://www.google.com/search?q=Biodiversity+Net+Gain+(BNG)">Biodiversity Net Gain (BNG)</ExternalLink> requirement. Developers must now achieve at least a 10% increase in the biodiversity of a parcel of land following its development. If this is not possible within the development site itself - by creating or enhancing its existing habitats - the biodiversity gain must be delivered elsewhere, by developers paying for the same types of habitat at a different location. For this purpose, Biodiversity Gain Sites (BGS) have been made available by landowners, who will sell <ExternalLink href="https://www.google.com/search?q=biodiversity+units">biodiversity units</ExternalLink> to developers.</p>
          <p>You can search the list of sites here in various ways to find the most appropriate one for your needs.</p>
          <h2>How we gathered the data</h2>
          <p>The data included in the list of biodiversity gain sites given here is compiled from various sources:</p>
          
          <h3>1. The BGS Register</h3>
          <p><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">Biodiversity Gain Site (BGS) Register</ExternalLink></p>
          <p><ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain/search">BGS Register Search</ExternalLink> This is the source of the base data. Until the data is provided publicly in computer-readable form, the data is extracted from the json files used to render the HTML website.</p>

          <h3>2. Responsible Bodies</h3>
          <p>Details of the responsible bodies are taken from the .GOV list <ExternalLink href="https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies">Conservation covenants: list of designated responsible bodies</ExternalLink>.</p>

          <h3>3. Locations</h3>
          <p>BGS Site locations are given but the precise location of allocations addresses has to be deduced using the Google Geocoder. Where the address is incomplete or missing, the location falls back to the centre point of the LPA.</p>

          <h3>4. Local Planning Authorities (LPAs)</h3>
          <p>The boundaries of all the English LPAs are used to identify the LPA in which a development site or BGS site is located</p>
          <p><ExternalLink href="https://geoportal.statistics.gov.uk/datasets/local-planning-authorities-april-2023-names-and-codes-in-the-uk/explore">All LPAs</ExternalLink>.</p>

          <h3>5. National Character Areas (NCAs)</h3>
          <p>The boundaries of NCAs are used to identify the NCA in which a development site or BGS site is located.</p>
          <p><ExternalLink href="https://nationalcharacterareas.co.uk/">NCAs and their Profiles</ExternalLink>.</p>

          <h3>6. Local Nature Recovery Strategy (LNRS)</h3>
          <p>The boundaries of LNRS sites are used to identify the LNRS in which a development site or BGS site is located</p>
          <p><ExternalLink href="https://www.gov.uk/government/publications/local-nature-recovery-strategies-areas-and-responsible-authorities">LNRSs and their Profiles</ExternalLink>.</p>

          <h3>7. Lower Layer Super Output Areas (LSOAs)</h3>
          <p>A Lower Layer Super Output Area (LSOA) is a geographic statistical unit in the UK, used for the publication of small-area statistics. Each LSOA comprises between 4 and 5 Output Areas (OAs) and contains 1,000 to 3,000 people (between 400 and 1,200 households).</p>
          <p><ExternalLink href="https://www.data.gov.uk/dataset/c481f2d3-91fc-4767-ae10-2efdf6d58996/lower-layer-super-output-areas-lsoas">LSOAs and their Profiles</ExternalLink>.</p>
          
          <h3>8. Index of Multiple Deprivation (IMD)</h3>          
          <p>Levels of deprivation are shown in deciles - between 1 to 10 - with band 1 being within the most deprived 10% areas of the country and band 10 being within the least deprived 10% of the country.</p>
                    
          <h2>How we processed the data</h2>
          <p>We enhanced the base data extracted from the BGS register in a number of ways:</p>

          <h3>1. Site Habitats - HU calculations</h3>
          <p><ExternalLink href="https://bristoltreeforum.org/2024/10/28/biodiversity-gain-metric-calculating-habitat-units">Habitat Units explained</ExternalLink></p>
          <p>Baseline parcels are as per the standard formula – Habitat Unit (HU) = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (where SS is set to Low, 1).</p>

          <h3>2. Improvements</h3>
          <p>Created parcels - HU = Habitat area/length (of parcel) x Distinctiveness (of Habitat) x Condition (of parcel) x Strategic Significance (of parcel – low, 1) x Temporal Risk (of Habitat and Condition) x Difficulty factor (of the Habitat) x Spatial Risk (Low, 1)</p>
          <p>Enhanced parcels - HU is not computed because no connection can be made back to the baseline habitat parcel&apos;s value.</p>

          <h2>Refreshing the data</h2>         
          <p>We refresh Defra&apos;s BGS data hourly.</p>

          <h2>Acknowledgements</h2>
          <p>Digital boundaries and reference maps:</p>     
          <p>© Natural England 2023. Contains OS data © Crown Copyright [and database right] 2023</p>
          <p>Contains GeoPlace data © Local Government Information House Limited copyright and database right 2023</p>

          <h2>Exports</h2>
          <p>The site summary is now available as a WFS map layer on the WFS service <ExternalLink href="https://bristoltrees.space/wfs/wfs-server.xq?SERVICE=WFS&REQUEST=GetCapabilities">https://bristoltrees.space/wfs/wfs-server.xq?SERVICE=WFS&REQUEST=GetCapabilities</ExternalLink>.</p>

          <h2>Development</h2>
          <p>This is an open-source project designed and built by <ExternalLink href="hhttps://bristoltreeforum.org/">Bristo Tree Forum</ExternalLink> using <ExternalLink href="https://nextjs.org/">Next.js</ExternalLink>.</p>
          <p>It is based on data sourced from Natural England&apos;s <ExternalLink href="https://environment.data.gov.uk/biodiversity-net-gain">Biodiversity gain sites register</ExternalLink>.</p>
          <p>You can view the source code at <ExternalLink href="https://github.com/Eyesiah/biodiversity-sites-frontend">GitHub</ExternalLink>.</p>
    
          <h2 id="privacy-policy">Privacy Policy (last updated 5 Oct 2025)</h2>
          <h3>1. Data Controller</h3>
          <p>
            The data controller responsible for this website is:
            <br />
            Mark Ashdown, Acting Chair, Bristol Tree Forum
            <br />
            Email: BGS_Enquiries@bristoltreeforum.org
          </p>

          <h3>2. Data we collect</h3>
          <p>
            We collect information in the following ways:
          </p>
          <p>
            <b>Anonymous Website Analytics</b>: We use Umami, a privacy-focused
            web analytics software, to understand our website traffic. We use this
            information to improve our content and user experience. Umami is
            designed to be privacy-friendly and operates without the use of
            cookies. It collects the following anonymous data:
          </p>
          <ul>
            <li>Pages viewed on our website</li>
            <li>The website that referred you to us (e.g., Google, Twitter)</li>
            <li>The browser and operating system you are using</li>
            <li>
              The country you are visiting from (based on an anonymized IP
              address)
            </li>
            <li>Time of visit and session duration</li>
          </ul>
          <p>
            Crucially, Umami does not collect any personally identifiable
            information (PII). Your IP address is not stored, and no user profile
            is created. All data is aggregated and anonymized.
          </p>

          <h3>3. How we use your data</h3>
          <p>
            We use the information we collect for the following purposes:
            <br />
            <b>To Improve Our Website:</b> To analyze aggregated, anonymous
            traffic data to understand what content is popular and how we can
            improve our website&apos;s functionality and user experience.
          </p>

          <h3>4. Legal basis for processing (GDPR)</h3>
          <p>
            Our legal basis for collecting and using the information described
            above depends on the specific context:
            <br />
            <b>Legitimate Interest:</b> For processing anonymous analytics data
            with Umami, we rely on our legitimate interest to monitor and improve
            our website. Because we use a privacy-preserving tool that does not
            collect personal data or use cookies, we have determined that our
            interest does not override your fundamental rights to privacy.
          </p>

          <h3>5. Cookies and tracking technologies</h3>
          <p>
            This website does not use cookies for analytics tracking. Our
            analytics provider, Umami, is a cookie-less solution.
          </p>

          <h3>6. Data sharing and third parties</h3>
          <p>
            We do not sell, trade, or rent your personal information to others.
            <br />
            Our Umami analytics instance is hosted by AWS, and the data is stored
            in the UK. The data remains anonymous and is processed solely for our
            analytics purposes.
          </p>

          <h3>7. Your data protection rights Uunder GDPR</h3>
          <p>
            Under the UK GDPR and the Data Protection Act 2018, you have rights
            over your personal data. These include:
          </p>
          <ul>
            <li>
              <b>Your right of access:</b> You have the right to ask us for copies
              of your personal information.
            </li>
            <li>
              <b>Your right to rectification:</b> You have the right to ask us to
              rectify information you think is inaccurate or complete information
              you think is incomplete.
            </li>
            <li>
              <b>Your right to erasure:</b> You have the right to ask us to erase
              your personal information in certain circumstances.
            </li>
            <li>
              <b>Your right to restriction of processing:</b> You have the right
              to ask us to restrict the processing of your information in certain
              circumstances.
            </li>
            <li>
              <b>Your right to object to processing:</b> You have the right to
              object to the processing of your personal data in certain
              circumstances.
            </li>
            <li>
              <b>Your right to data portability:</b> You have the right to ask
              that we transfer the information you gave us to another
              organisation, or to you, in certain circumstances.
            </li>
          </ul>
          <p>
            You are not required to pay any charge for exercising your rights. If
            you make a request, we have one month to respond to you. To exercise
            any of these rights, please contact us at
            BGS_Enquiries@bristoltreeforum.org.
          </p>
          <p>
            You also have the right to lodge a complaint with the UK&apos;s
            supervisory authority, the Information Commissioner&apos;s Office
            (ICO). You can find their contact details at ico.org.uk.
          </p>

          <h3>8. Data security</h3>
          <p>
            We take reasonable technical and organizational precautions to prevent
            the loss, misuse, or alteration of your personal information.
          </p>

          <h3>9. Changes to this Privacy Policy</h3>
          <p>
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page and
            updating the &apos;Last Updated&apos; date at the top.
          </p>

          <h3>10. Contact us</h3>
          <p>
            If you have any questions about this Privacy Policy, please contact us
            at:
            <br />
            BGS_Enquiries@bristoltreeforum.org
          </p>

        </div>
        </div>
      <Footer />
    </>
  );
}