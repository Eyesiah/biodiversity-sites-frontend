import { useState, useEffect } from 'react';
import styles from '@/styles/MapContentLayout.module.css';
import { useIsMobile } from '@/lib/hooks.js';

const MapContentLayout = ({ map, content }) => {
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className={styles.container}>
      {!isMobile &&
        <div className={styles.mapColumn}>
          {hasMounted ? map : null}
        </div>
      }
      <div className={styles.contentColumn}>
        {content}
      </div>
    </div>
  );
};

export default MapContentLayout;
