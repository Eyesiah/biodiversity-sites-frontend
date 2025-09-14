import styles from 'styles/SiteDetails.module.css';

// Helper component for a detail row to keep the JSX clean.
export const DetailRow = ({ label, value, labelColor, valueColor }) => (
  <div className={styles.detailRow}>
    <dt className={styles.detailLabel} style={{ color: labelColor }}>{label}</dt>
    <dd className={styles.detailValue} style={{ color: valueColor }}>{value}</dd>
  </div>
);