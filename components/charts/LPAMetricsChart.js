'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const LPAMetricsChart = ({ sites, onHoveredEntityChange }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="Local Planning Authorities"
      entityAbbr="LPAs"
      entityProperty="lpaName"
      totalEntitiesInUK={309}
      onHoveredEntityChange={onHoveredEntityChange}
    />
  );
};
