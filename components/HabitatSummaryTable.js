import { formatNumber } from 'lib/format';
import styles from 'styles/SiteDetails.module.css';

export const HabitatSummaryTable = ({ site }) => {
  const habitats = site.habitats || {};
  const improvements = site.improvements || {};
  const allocations = site.allocations || [];

  const baselineArea = (habitats.areas || []).reduce((acc, h) => acc + h.size, 0);
  const baselineHedgerow = (habitats.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const baselineWatercourse = (habitats.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const baselineAreaHUs = (habitats.areas || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineHedgerowHUs = (habitats.hedgerows || []).reduce((acc, h) => acc + h.HUs, 0);
  const baselineWatercourseHUs = (habitats.watercourses || []).reduce((acc, h) => acc + h.HUs, 0);

  const improvementArea = (improvements.areas || []).reduce((acc, h) => acc + h.size, 0);
  const improvementHedgerow = (improvements.hedgerows || []).reduce((acc, h) => acc + h.size, 0);
  const improvementWatercourse = (improvements.watercourses || []).reduce((acc, h) => acc + h.size, 0);

  const allocationArea = allocations.reduce((acc, a) => {
    return acc + (a.habitats?.areas?.reduce((acc, ha) => acc + ha.size, 0) || 0);
  }, 0);
  const allocationHedgerow = allocations.reduce((acc, a) => {
    return acc + (a.habitats?.hedgerows?.reduce((acc, ha) => acc + ha.size, 0) || 0);
  }, 0);
  const allocationWatercourse = allocations.reduce((acc, a) => {
    return acc + (a.habitats?.watercourses?.reduce((acc, ha) => acc + ha.size, 0) || 0);
  }, 0);

  const allocationAreaHUs = allocations.reduce((acc, a) => acc + a.areaUnits, 0);
  const allocationHedgerowHUs = allocations.reduce((acc, a) => acc + a.hedgerowUnits, 0);
  const allocationWatercourseHUs = allocations.reduce((acc, a) => acc + a.watercoursesUnits, 0);

  const hasAllocations = site.allocations != null;

  return (
    <table className={`${styles.subTable} ${styles.inlineTable}`}>
      <thead>
        <tr>
          <th>Habitat</th>
          <th># Parcels</th>
          <th>Baseline Size</th>
          <th>Baseline HUs</th>
          <th>Improvements Size</th>
          {hasAllocations && <th>Allocations Size</th>}
          {hasAllocations && <th>% Allocated</th>}
          {hasAllocations && <th>Allocations HUs</th>}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Areas (ha)</td>
          <td className={styles.numericData}>{formatNumber(habitats.areas?.length ?? 0, 0)}</td>
          <td className={styles.numericData}>{formatNumber(baselineArea, 2)}</td>
          <td className={styles.numericData}>{formatNumber(baselineAreaHUs)}</td>
          <td className={styles.numericData}>{formatNumber(improvementArea, 2)}</td>
          {hasAllocations && <td className={styles.numericData}>{formatNumber(allocationArea, 2)}</td>}
          {hasAllocations && <td className={styles.numericData}>{improvementArea > 0 ? formatNumber((allocationArea / improvementArea) * 100, 2) + '%' : 'N/A'}</td>}
          {hasAllocations && <td className={styles.numericData}>{formatNumber(allocationAreaHUs)}</td>}
        </tr>
        <tr>
          <td>Hedgerows (km)</td>
          <td className={styles.numericData}>{formatNumber(habitats.hedgerows?.length ?? 0, 0)}</td>
          <td className={styles.numericData}>{formatNumber(baselineHedgerow, 2)}</td>
          <td className={styles.numericData}>{formatNumber(baselineHedgerowHUs)}</td>
          <td className={styles.numericData}>{formatNumber(improvementHedgerow, 2)}</td>
          {hasAllocations && <td className={styles.numericData}>{formatNumber(allocationHedgerow, 2)}</td>}
          {hasAllocations && <td className={styles.numericData}>{improvementHedgerow > 0 ? formatNumber((allocationHedgerow / improvementHedgerow) * 100, 2) + '%' : 'N/A'}</td>}
          {hasAllocations && <td className={styles.numericData}>{formatNumber(allocationHedgerowHUs)}</td>}
        </tr>
        <tr>
          <td>Watercourses (km)</td>
          <td className={styles.numericData}>{formatNumber(habitats.watercourses?.length ?? 0, 0)}</td>
          <td className={styles.numericData}>{formatNumber(baselineWatercourse, 2)}</td>
          <td className={styles.numericData}>{formatNumber(baselineWatercourseHUs)}</td>
          <td className={styles.numericData}>{formatNumber(improvementWatercourse, 2)}</td>
          {hasAllocations && <td className={styles.numericData}>{formatNumber(allocationWatercourse, 2)}</td>}
          {hasAllocations && <td className={styles.numericData}>{improvementWatercourse > 0 ? formatNumber((allocationWatercourse / improvementWatercourse) * 100, 2) + '%' : 'N/A'}</td>}
          {hasAllocations && <td className={styles.numericData}>{formatNumber(allocationWatercourseHUs)}</td>}
        </tr>
      </tbody>
    </table>
  );
};
