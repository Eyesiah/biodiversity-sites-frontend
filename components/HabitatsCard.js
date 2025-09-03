import { useSortableData, getSortClassName } from '../lib/hooks';
import { formatNumber } from '../lib/format';
import { useState } from 'react';
import styles from '../styles/SiteDetails.module.css';
import {CollapsibleRow} from "../components/CollapsibleRow"

// Helper function to collate habitat data
export const collateHabitats = (habitats, isImprovement) => {
  if (!habitats) return [];

  const collated = habitats.reduce((acc, habitat) => {
    const key = habitat.type;
    if (!acc[key]) {
      acc[key] = {
        type: habitat.type,
        distinctiveness: habitat.distinctiveness,
        parcels: 0,
        area: 0,
        HUs: 0,
        subRows: {},
      };
    }
    acc[key].parcels += 1;
    acc[key].area += habitat.size;
    acc[key].HUs += habitat.HUs;

    const subKey = isImprovement ? `${habitat.interventionType}-${habitat.condition}` : habitat.condition;
    if (!acc[key].subRows[subKey]) {
      acc[key].subRows[subKey] = {
        condition: habitat.condition,
        interventionType: habitat.interventionType,
        parcels: 0,
        area: 0,
        HUs: 0,
      };
    }
    acc[key].subRows[subKey].parcels += 1;
    acc[key].subRows[subKey].area += habitat.size;
    acc[key].subRows[subKey].HUs += habitat.HUs;

    return acc;
  }, {});

  return Object.values(collated).map(habitat => ({
    ...habitat,
    subRows: Object.values(habitat.subRows),
  }));
};

const HabitatRow = ({ habitat, isImprovement }) => {
  const mainRow = (
    <>
      <td>{habitat.type}</td>
      <td>{habitat.distinctiveness}</td>
      <td className={styles.numericData}>{habitat.parcels}</td>
      <td className={styles.numericData}>{formatNumber(habitat.area)}</td>
      <td className={styles.numericData}>{formatNumber(habitat.HUs || 0)}</td>
    </>
  );

  const collapsibleContent = (
    <table className={styles.subTable}>
      <thead>
        <tr>
          {isImprovement && <th>Intervention</th>}
          <th>Condition</th>
          <th># parcels</th>
          <th>Area (ha)</th>
          <th>HUs</th>
        </tr>
      </thead>
      <tbody>
        {habitat.subRows.map((subRow, index) => (
          <tr key={index}>
            {isImprovement && <td>{subRow.interventionType}</td>}
            <td>{subRow.condition}</td>
            <td className={styles.numericData}>{subRow.parcels}</td>
            <td className={styles.numericData}>{formatNumber(subRow.area)}</td>
            <td className={styles.numericData}>{formatNumber(subRow.HUs || 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={isImprovement ? 5 : 4}
    />
  );
};

const HabitatTable = ({ title, habitats, requestSort, sortConfig, isImprovement }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!habitats || habitats.length == 0)
  {
    return null;
  }
  return <section className={styles.card}>
    <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {title} {isOpen ? '▼' : '▶'}
    </h3>
    {isOpen && 
        <table className={styles.table}>
            <thead>
            <tr>
                <th onClick={() => requestSort('type')} className={getSortClassName('type', sortConfig)}>Habitat</th>
                <th onClick={() => requestSort('distinctiveness')} className={getSortClassName('distinctiveness', sortConfig)}>Distinctiveness</th>
                <th onClick={() => requestSort('parcels')} className={getSortClassName('parcels', sortConfig)}># parcels</th>
                <th onClick={() => requestSort('area')} className={getSortClassName('area', sortConfig)}>Area (ha)</th>
                <th onClick={() => requestSort('HUs')} className={getSortClassName('HUs', sortConfig)}>HUs</th>
            </tr>
            </thead>
            <tbody>
            {habitats.map((habitat) => (
                <HabitatRow key={habitat.type} habitat={habitat} isImprovement={isImprovement} />
            ))}
            </tbody>
        </table>
    }
      
    </section>    
};

export function HabitatsCard ({title, habitats, isImprovement}) {
  const [isOpen, setIsOpen] = useState(true);

  const collatedAreas = collateHabitats(habitats?.areas, isImprovement);
  const collatedHedgerows = collateHabitats(habitats?.hedgerows, isImprovement);
  const collatedWatercourses = collateHabitats(habitats?.watercourses, isImprovement);  
  
  const { items: sortedAreas, requestSort: requestSortAreas, sortConfig: sortConfigAreas } = useSortableData(collatedAreas, { key: 'type', direction: 'ascending' });
  const { items: sortedHedgerows, requestSort: requestSortHedgerows, sortConfig: sortConfigHedgerows } = useSortableData(collatedHedgerows, { key: 'type', direction: 'ascending' });
  const { items: sortedWatercourses, requestSort: requestSortWatercourses, sortConfig: sortConfigWatercourses } = useSortableData(collatedWatercourses, { key: 'type', direction: 'ascending' });
  
  const hasHabitats = sortedAreas.length > 0 || sortedWatercourses.length > 0 || sortedHedgerows.length > 0;

  if (hasHabitats)
  {
    return (
      <section className={styles.card}>
        <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
          {title} {isOpen ? '▼' : '▶'}
        </h3>
        {isOpen && (
          <>
            <HabitatTable
              title="Areas"
              habitats={sortedAreas}
              requestSort={requestSortAreas}
              sortConfig={sortConfigAreas}
              isImprovement={isImprovement}
            />
            <HabitatTable
              title="Hedgerows"
              habitats={sortedHedgerows}
              requestSort={requestSortHedgerows}
              sortConfig={sortConfigHedgerows}
              isImprovement={isImprovement}
            />
            <HabitatTable
              title="Watercourses"
              habitats={sortedWatercourses}
              requestSort={requestSortWatercourses}
              sortConfig={sortConfigWatercourses}
              isImprovement={isImprovement}
            />            
          </>
        )}
      </section>
    );
  }
  else
  {
    return null;
  }
}
