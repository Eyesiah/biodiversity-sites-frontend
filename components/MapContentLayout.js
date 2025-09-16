import styles from '@/styles/MapContentLayout.module.css';

const MapContentLayout = ({ map, content }) => {
  return (
    <div className={styles.container}>
      <div className={styles.mapColumn}>
        {map}
      </div>
      <div className={styles.contentColumn}>
        {content}
      </div>
    </div>
  );
};

export default MapContentLayout;
