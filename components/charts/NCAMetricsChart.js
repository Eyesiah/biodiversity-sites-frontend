'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const NCAMetricsChart = ({ sites }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="National Character Areas"
      entityAbbr="NCAs"
      entityProperty="ncaName"
      topN={20}
      totalEntitiesInUK={159}
    />
  );
};
