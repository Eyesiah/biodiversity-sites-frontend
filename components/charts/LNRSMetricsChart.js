'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const LNRSMetricsChart = ({ sites }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="Local Nature Recovery Strategies"
      entityAbbr="LNRSs"
      entityProperty="lnrsName"
      topN={20}
    />
  );
};
