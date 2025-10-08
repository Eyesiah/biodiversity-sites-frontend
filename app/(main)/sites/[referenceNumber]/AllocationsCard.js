'use client'

import { useState } from 'react';
import { useSortableData, getSortClassName } from '@/lib/hooks';
import { CollapsibleRow } from "@/components/CollapsibleRow"
import { formatNumber } from '@/lib/format';
import styles from '@/styles/SiteDetails.module.css';

// component to display the habitats within an allocation
const AllocationHabitats = ({ habitats }) => {
  // Flatten the habitats from areas, hedgerows, and watercourses
  const flattenedHabitats = [
    ...(habitats.areas || []),
    ...(habitats.hedgerows || []),
    ...(habitats.watercourses || []),
  ];

  if (flattenedHabitats.length === 0) {
    return <p>No habitat details for this allocation.</p>;
  }

  return (
    <table className={styles.subTable}>
      <thead>
        <tr>
          <th>Module</th>
          <th>Habitat</th>
          <th>Distinctiveness</th>
          <th>Condition</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        {flattenedHabitats.map((habitat, index) => (
          <tr key={index}>
            <td>{habitat.module}</td>
            <td>{habitat.type}</td>
            <td>{habitat.distinctiveness}</td>
            <td>{habitat.condition}</td>
            <td className={styles.numericData}>{formatNumber(habitat.size)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// component for each row in the allocations table to handle drill-down
const AllocationRow = ({ alloc }) => {
  const mainRow = (
    <>
      <td>{alloc.planningReference}</td>
      <td>{alloc.localPlanningAuthority}</td>
      <td className={styles.numericData} style={{ textAlign: 'center' }}>{alloc.lsoa.IMDDecile || 'N/A'}</td>
      <td className={styles.numericData} style={{ textAlign: 'center' }}>
        {typeof alloc.distance === 'number' ? formatNumber(alloc.distance, 0) : alloc.distance}
      </td>
      <td>{`${alloc.sr.cat}${alloc.sr.cat != 'Outside' ? ` (${alloc.sr.from})` : ''}`}</td>
      <td>{alloc.projectName}</td>
      <td className={styles.numericData}>{alloc.areaUnits && alloc.areaUnits > 0 ? formatNumber(alloc.areaUnits) : ''}</td>
      <td className={styles.numericData}>{alloc.hedgerowUnits && alloc.hedgerowUnits > 0 ? formatNumber(alloc.hedgerowUnits) : ''}</td>
      <td className={styles.numericData}>{alloc.watercoursesUnits && alloc.watercoursesUnits > 0 ? formatNumber(alloc.watercoursesUnits) : ''}</td>
    </>
  );

  const collapsibleContent = <AllocationHabitats habitats={alloc.habitats} />;

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={7}
    />
  );
};

export const AllocationsCard = ({allocations, title}) => {
  const [isOpen, setIsOpen] = useState(true);
  const { items: sortedAllocations, requestSort: requestSortAllocations, sortConfig: sortConfigAllocations } = useSortableData(allocations || [], { key: 'planningReference', direction: 'ascending' });
  
  return (
    <section className={styles.card}>
      <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {title} {isOpen ? '▼' : '▶'}
      </h3>
      {isOpen && (
        <>
          {sortedAllocations.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => requestSortAllocations('planningReference')} className={getSortClassName('planningReference', sortConfigAllocations)}>Reference</th>
                    <th onClick={() => requestSortAllocations('localPlanningAuthority')} className={getSortClassName('localPlanningAuthority', sortConfigAllocations)}>LPA</th>
                    <th onClick={() => requestSortAllocations('lsoa.IMDDecile')} className={getSortClassName('lsoa.IMDDecile', sortConfigAllocations)}>IMD Decile</th>
                    <th onClick={() => requestSortAllocations('distance')} className={getSortClassName('distance', sortConfigAllocations)} style={{ textAlign: 'center' }}>Distance (km)</th>
                    <th onClick={() => requestSortAllocations('sr.cat')} className={getSortClassName('sr.cat', sortConfigAllocations)} style={{ textAlign: 'center' }}>Spatial Risk</th>
                    <th onClick={() => requestSortAllocations('projectName')} className={getSortClassName('projectName', sortConfigAllocations)}>Address</th>
                    <th onClick={() => requestSortAllocations('areaUnits')} className={getSortClassName('areaUnits', sortConfigAllocations)}>Area units</th>
                    <th onClick={() => requestSortAllocations('hedgerowUnits')} className={getSortClassName('hedgerowUnits', sortConfigAllocations)}>Hedgerow units</th>
                    <th onClick={() => requestSortAllocations('watercoursesUnits')} className={getSortClassName('watercoursesUnits', sortConfigAllocations)}>Watercourse units</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAllocations.map((alloc) => (
                    <AllocationRow key={alloc.planningReference} alloc={alloc} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p>No allocation information available.</p>}
        </>
      )}
    </section>
  );
}
