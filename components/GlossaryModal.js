import { useEffect } from 'react';
import styles from '@/styles/Modal.module.css';

const GlossaryModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeButton}>&times;</button>
        <h2>Glossary of terms</h2>
        <dl className={styles.glossaryList}>          
          <dt>Allocation</dt><dd>The planned habitat set aside by a BGS site to meet the BNG requirements of a specific development.</dd>
          <dt>Baseline habitat</dt><dd>The pre-existing habitat of a site before that site is developed.</dd>
          <dt>Biodiversity Gain Site (BGS)</dt><dd>An area of land or habitat designated to create or enhance habitats for wildlife, leading to a measurable increase in biodiversity. Only sites registered on the BGS Register are eligible for this designation.</dd>
          <dt>Biodiversity Net Gain (BNG)</dt><dd></dd>
          <dt>Condition</dt><dd>The ecological health and functional status of a habitat, indicating its resilience and how well it supports its ecosystem. It's assessed using criteria for specific habitat types, often resulting in a rating (e.g. good, moderate or poor) based on factors like species presence, management and disturbance.</dd>
          <dt>Distinctiveness</dt><dd>A measure of a habitat's ecological rarity and value, with higher scores given to habitats - like ancient woodland or limestone grassland - that support rare species or are scarce in the local area.</dd>
          <dt>Habitat</dt><dd>An environment or area that supports living organisms, including plants, animals and fungi.</dd>
          <dt>Habitat Unit (HU)</dt><dd>A quantitative measure of the value of a natural habitat, used in Biodiversity Net Gain (BNG) calculations in England. It is calculated based on a habitat's size (area or length), distinctiveness, condition and strategic significance, with higher values indicating better ecological quality and greater biodiversity.</dd>
          <dt>Improvement</dt><dd>A habitat can be improved either by enhancing its condition or by creating a new habitat in a particular condition.</dd>
          <dt>IMD (Index of Multiple Deprivation) Decile</dt><dd>An area's relative social deprivation ranging from 1 (the most deprived) to 10 (the least deprived).</dd>
          <dt>Local Nature Recovery Strategy (LNRS) site</dt><dd>a location within an LNRS that holds significance for nature recovery. These sites can be either existing valuable areas for wildlife or ‘opportunity areas’, where habitat creation or restoration is planned to deliver the greatest environmental benefits, such as improving biodiversity, carbon sequestration or flood regulation.</dd>
          <dt>Local Planning Authority (LPA)</dt><dd>A local government body, often a council department, responsible for managing land use and development in a specific area. Its functions include deciding on planning applications, preparing and implementing local plans, and enforcing planning policies to ensure that development is sustainable and balances economic, environmental and social considerations.</dd>
          <dt>Lower Layer Super Output Area (LSOA)</dt><dd>The smallest geographic unit used in England and Wales for statistical purposes, typically comprising 1,000 to 3,000 residents and 400 to 1,200 households.</dd>
          <dt>National Character Area (NCA)</dt><dd>A distinctive and recognisable unit of England's landscape, defined by a unique ‘sense of place’ resulting from its specific natural, cultural and economic features. NCAs follow the natural lines of the landscape, rather than administrative boundaries like counties, making them a useful framework for planning and decision making for landscape and environmental projects. There are 159 NCAs in England, and each has a detailed profile outlining its characteristics and how it functions and can be sustained. See https://nationalcharacterareas.co.uk/.</dd>
          <dt>Parcel</dt><dd>A discrete habitat within a larger site containing a single, consistent type of habitat in a particular condition.</dd>
          <dt>Responsible Body</dt><dd>An organisation designated by Defra to hold and administer conservation covenants for BNG projects, monitoring and enforcing habitat improvement plans to ensure long-term conservation.</dd>
          <dt>Size</dt><dd>Either area habitats, measured in hectares (ha), or linear habitats (hedgerows and watercourses), measured in kilometres (km).</dd>
        </dl>
      </div>
    </div>
  );
};

export default GlossaryModal;