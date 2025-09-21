'use client'

import { HabitatsCard } from "@/components/HabitatsCard"
import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/MapContentLayout';
import { SiteDetailsCard} from '@/components/SiteDetailsCard'
import { AllocationsCard } from '@/components/AllocationsCard'
import styles from '@/styles/SiteDetails.module.css';
import dynamic from 'next/dynamic';

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const handleExportXML = (site) => {
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const xmlDataStr = builder.build({ site });

  const blob = new Blob([xmlDataStr], { type: 'application/xml' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `bgs-site-${site.referenceNumber}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleExportJSON = (site) => {
  const jsonDataStr = JSON.stringify({ site }, null, 2);

  const blob = new Blob([jsonDataStr], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `bgs-site-${site.referenceNumber}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function SitePageContent({site}) {
  return (  
    <MapContentLayout
      map={
        <SiteMap sites={[site]} selectedSite={site} height="80vh" />
      }
      content={(<>
        <div className={styles.header}>
          <h1>Biodiversity Gain Site</h1>
          <div className={styles.titleWithButtons}>
            <h2>{site.referenceNumber}</h2>
            <div className={styles.buttonGroup}>
              <button onClick={() => handleExportXML(site)} className={styles.exportButton}>Export to XML</button>
              <button onClick={() => handleExportJSON(site)} className={styles.exportButton}>Export to JSON</button>
            </div>
          </div>
        </div>
        <div className={styles.detailsGrid}>
          <SiteDetailsCard site={site} />

          <HabitatsCard
            title="Baseline Habitats (click any habitat cell for more detail)"
            habitats = {site.habitats}
            isImprovement={false}
          />

          <HabitatsCard
            title="Improvement Habitats (click any habitat cell for more detail)"
            habitats = {site.improvements}
            isImprovement={true}
          />

          <AllocationsCard 
            title="Allocations (click any allocation for more detail)"
            allocations={site.allocations}
          />

        </div>
        </>
      )}          
    />
  )
}