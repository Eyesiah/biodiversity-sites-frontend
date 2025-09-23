'use client'

import ExternalLink from '@/components/ExternalLink';
import { HabitatSummaryTable } from "@/components/HabitatSummaryTable"
import { DetailRow } from "@/components/DetailRow"
import { useState, useMemo } from 'react';
import { formatNumber, slugify, normalizeBodyName } from '@/lib/format';
import styles from '@/styles/SiteDetails.module.css';
import { InfoModal } from '@/components/InfoModal'

export const SiteDetailsCard = ({ site }) => {
  const [modalState, setModalState] = useState({ show: false, type: null, name: null, title: '', data: null });

  const medianAllocationDistance = useMemo(() => {
    if (!site.allocations || site.allocations.length === 0) return null;
    const distances = site.allocations.map(alloc => alloc.distance).filter(d => typeof d === 'number').sort((a, b) => a - b);
    if (distances.length === 0) return null;
    const mid = Math.floor(distances.length / 2);
    return distances.length % 2 === 0 ? (distances[mid - 1] + distances[mid]) / 2 : distances[mid];
  }, [site.allocations]);

  const showModal = (type, name, title, data) => {
    setModalState({ show: true, type, name: slugify(normalizeBodyName(name)), title, data });
  };

  return (
    <section className={styles.card}>
    <h3>Site Details</h3>
    <div>
      <DetailRow label="BGS Reference" value={<ExternalLink href={`https://environment.data.gov.uk/biodiversity-net-gain/search/${site.referenceNumber}`}>{site.referenceNumber}</ExternalLink>} />
      <DetailRow 
        label="Responsible Body"
        value={
          (site.responsibleBodies && site.responsibleBodies.length > 0) ? (
            site.responsibleBodies.map((bodyName, index) => (
              <span key={index}>
                <button onClick={() => showModal('body', bodyName, bodyName)} className={styles.linkButton}>
                  {bodyName}
                </button>
                {index < site.responsibleBodies.length - 1 && ', '}
              </span>
            ))
          ) : 'N/A'
        } 
      />
      <DetailRow label="Start date of enhancement works" value={site.startDate ? new Date(site.startDate).toLocaleDateString('en-GB') : 'N/A'} />
      <DetailRow label="Location (Lat/Long)" value={(site.latitude && site.longitude) ? `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}` : '??'} />
      {site.latitude && site.longitude && <DetailRow label="Map" value={<><ExternalLink href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}>View on Google Maps</ExternalLink> {site.landBoundary && <ExternalLink href={site.landBoundary}>Boundary Map</ExternalLink>}</>} />}
      <DetailRow label="NCA" value={site.ncaName ? <ExternalLink href={`https://nationalcharacterareas.co.uk/${slugify(site.ncaName)}`}>{site.ncaName}</ExternalLink> : 'N/A'} />
      <DetailRow 
        label="LPA" 
        value={
          site.lpaName ? <button onClick={() => showModal('lpa', site.lpaName, site.lpaName)} className={styles.linkButton}>{site.lpaName}</button> : 'N/A'
        } 
      />
      <DetailRow 
        label="LSOA" 
        value={
          site.lsoa?.name ? <button onClick={() => showModal('lsoa', site.lsoa.name, site.lsoa.name, site.lsoa)} className={styles.linkButton}>{site.lsoa.name}</button> : 'N/A'
        } 
      />
      <DetailRow label="# Allocations" value={site.allocations?.length || 0} />
      <DetailRow label="# Planning applications" value={site.allocations?.length || 0} />
      {medianAllocationDistance !== null && <DetailRow label="Median allocation distance" value={`${formatNumber(Math.round(medianAllocationDistance), 0)} km`} />}
      <DetailRow label="Site Area" value={`${formatNumber(site.siteSize || 0)} ha`} />
      <div className={styles.detailRow}>
        <dt className={styles.detailLabel}>Habitat Summary</dt>
        <dd className={styles.detailValue}>
          <HabitatSummaryTable site={site} />
        </dd>
      </div>
    </div>
      <InfoModal modalState={modalState} onClose={() => setModalState({ show: false, type: null, name: null, title: '' })} />
  </section>
  )
}
