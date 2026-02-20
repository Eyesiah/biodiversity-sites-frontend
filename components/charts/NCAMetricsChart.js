'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const NCAMetricsChart = ({ sites, onHoveredEntityChange }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="National Character Areas"
      entityAbbr="NCAs"
      entityProperty="ncaName"
      totalEntitiesInUK={159}
      onHoveredEntityChange={onHoveredEntityChange}
    />
  );
};
