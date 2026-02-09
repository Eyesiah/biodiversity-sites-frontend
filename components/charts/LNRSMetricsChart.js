'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const LNRSMetricsChart = ({ sites }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="Local Nature Recovery Strategies"
      entityAbbr="LNRS sites"
      entityProperty="lnrsName"
      topN={20}
      totalEntitiesInUK={48}
    />
  );
};
