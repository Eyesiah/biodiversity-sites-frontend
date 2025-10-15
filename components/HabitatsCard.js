'use client'

import { useSortableData, getSortClassName } from '@/lib/hooks';
import { formatNumber } from '@/lib/format';
import { useState } from 'react';
import styles from '@/styles/SiteDetails.module.css';
import {CollapsibleRow} from "components/CollapsibleRow"
import SiteList from '@/components/SiteList';

const HabitatRow = ({ habitat, isImprovement, units, onHabitatToggle, isHabitatOpen, sites }) => {

  const hasSites = sites != null;

  const mainRow = (
    <>
      <td>{habitat.type}</td>
      <td style={{ textAlign: 'center' }}>{habitat.distinctiveness}</td>
      {hasSites && <td className={styles.numericData} style={{ textAlign: 'center' }}>{sites.length}</td>}
      <td className={styles.numericData} style={{ textAlign: 'center' }}>{habitat.parcels}</td>
      <td className={styles.numericData}>{formatNumber(habitat.area)}</td>
      {isImprovement && <td className={styles.numericData}>{habitat.allocated && habitat.allocated > 0 ? `${formatNumber(100 * habitat.allocated)}%` : ''}</td>}
      <td className={styles.numericData}>{habitat.HUs && habitat.HUs > 0 ? formatNumber(habitat.HUs) : ''}</td>
    </>
  );

  const collapsibleContent = (
    <>
      <table className={styles.subTable}>
        <thead>
          <tr>
            {isImprovement && <th>Intervention</th>}
            <th>Condition</th>
            <th># parcels</th>
            <th>Size ({units})</th>
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
              <td className={styles.numericData}>{subRow.HUs && subRow.HUs > 0 ? formatNumber(subRow.HUs) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>    
      {hasSites &&
        <SiteList sites={sites} minimalHeight={true} columns={['referenceNumber', 'responsibleBodies', 'siteSize', 'allocationsCount', 'allocatedHabitatArea', 'lpaName', 'ncaName']} />
      }
    </>
  );

  return (
    <CollapsibleRow
      mainRow={mainRow}
      collapsibleContent={collapsibleContent}
      colSpan={5}
      onToggle={onHabitatToggle}
      isOpen={isHabitatOpen}
    />
  );
};

const HabitatTable = ({ title, habitats, requestSort, sortConfig, isImprovement, onHabitatToggle, isHabitatOpen, sites }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!habitats || habitats.length == 0)
  {
    return null;
  }

  const hasSites = habitats[0].sites != null;

  return <section className={styles.card}>
    <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {title} {isOpen ? '▼' : '▶'}
    </h3>
    {isOpen && 
        <div className={styles.tableContainer}>
          <table className={styles.table}>
              <thead>
              <tr>
                  <th onClick={() => requestSort('type')} className={getSortClassName('type', sortConfig)}>Habitat</th>
                  <th onClick={() => requestSort('distinctiveness')} className={getSortClassName('distinctiveness', sortConfig)} style={{ textAlign: 'center' }}>Distinctiveness</th>
                  {hasSites && <th onClick={() => requestSort('sites.length')} className={getSortClassName('sites.length', sortConfig)} style={{ textAlign: 'center' }}># BGS Sites</th>}
                  <th onClick={() => requestSort('parcels')} className={getSortClassName('parcels', sortConfig)} style={{ textAlign: 'center' }}># Parcels</th>
                  <th onClick={() => requestSort('area')} className={getSortClassName('area', sortConfig)}>Size ({title === 'Areas' ? 'ha' : 'km'})</th>
                  {isImprovement && <th onClick={() => requestSort('allocated')} className={getSortClassName('allocated', sortConfig)}>% Allocated</th>}
                  <th onClick={() => requestSort('HUs')} className={getSortClassName('HUs', sortConfig)}>HUs</th>
              </tr>
              </thead>
              <tbody>
              {habitats.map((habitat) => (
                  <HabitatRow 
                    key={habitat.type}
                    habitat={habitat}
                    isImprovement={isImprovement}
                    units={title === 'Areas' ? 'ha' : 'km'}
                    onHabitatToggle={onHabitatToggle ? () => onHabitatToggle(habitat) : null}
                    isHabitatOpen={isHabitatOpen ? isHabitatOpen(habitat) : null}
                    sites={habitat.sites?.map(s => {
                      return {
                        ...sites[s.r],
                        siteSize: s.ta,
                        allocatedHabitatArea: s.aa || 0
                      }
                    }) ?? null}
                  />
              ))}
              </tbody>
          </table>
        </div>
    }
      
    </section>    
};

export function HabitatsCard ({title, habitats, isImprovement, onHabitatToggle, isHabitatOpen, sites}) {
  const [isOpen, setIsOpen] = useState(true);

  const collatedAreas = habitats?.areas;
  const collatedHedgerows = habitats?.hedgerows;
  const collatedWatercourses = habitats?.watercourses;
  
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
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>  
            <HabitatTable
              title="Areas"
              habitats={sortedAreas}
              requestSort={requestSortAreas}
              sortConfig={sortConfigAreas}
              isImprovement={isImprovement}
              onHabitatToggle={onHabitatToggle}
              isHabitatOpen={isHabitatOpen}
              sites={sites}
            />
            <HabitatTable
              title="Hedgerows"
              habitats={sortedHedgerows}
              requestSort={requestSortHedgerows}
              sortConfig={sortConfigHedgerows}
              isImprovement={isImprovement}
              onHabitatToggle={onHabitatToggle}
              isHabitatOpen={isHabitatOpen}
              sites={sites}
            />
            <HabitatTable
              title="Watercourses"
              habitats={sortedWatercourses}
              requestSort={requestSortWatercourses}
              sortConfig={sortConfigWatercourses}
              isImprovement={isImprovement}
              onHabitatToggle={onHabitatToggle}
              isHabitatOpen={isHabitatOpen}
              sites={sites}
            />            
          </div>
        )}
      </section>
    );
  }
  else
  {
    return null;
  }
}
