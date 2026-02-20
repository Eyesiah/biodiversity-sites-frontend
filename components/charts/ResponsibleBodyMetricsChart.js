'use client'

import { OrganizationalMetricsChart } from './OrganizationalMetricsChart';

export const ResponsibleBodyMetricsChart = ({ sites, onHoveredEntityChange }) => {
  return (
    <OrganizationalMetricsChart
      sites={sites}
      entityName="Responsible Bodies"
      entityAbbr="RBs"
      entityProperty={null}
      extractEntityValue={(site) => {
        // Handle responsibleBodies array - only use the first RB
        const rbs = site.responsibleBodies || ['Unknown'];
        return rbs[0];
      }}
      onHoveredEntityChange={onHoveredEntityChange}
    />
  );
};
