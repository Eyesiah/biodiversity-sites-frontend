'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const LPAMetricsChart = ({ sites }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="Local Planning Authorities"
      entityAbbr="LPAs"
      entityProperty="lpaName"
      topN={25}
    />
  );
};
