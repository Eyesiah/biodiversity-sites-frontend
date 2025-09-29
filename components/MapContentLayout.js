import styles from '@/styles/MapContentLayout.module.css';
import { useIsMobile } from '@/lib/hooks.js'

const MapContentLayout = ({ map, content }) => {

  const isMobile = useIsMobile();

  return (
    <div className={styles.container}>
      {!isMobile && <div className={styles.mapColumn}>
        {map}
      </div>}
      <div className={styles.contentColumn}>
        {content}
      </div>
    </div>
  );
};

export default MapContentLayout;
