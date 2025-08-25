import React from 'react';

const SiteList = ({ sites }) => {
  if (!sites || sites.length === 0) {
    return <p>No site data available.</p>;
  }

  return (
    <table className="site-table">
      <thead>
        <tr>
          <th>BGS Reference</th>
          <th>Responsible Bodies</th>
          <th>Area (ha)</th>
          <th># Allocations</th>
          <th>LPA</th>
          <th>NCA</th>
        </tr>
      </thead>
      <tbody>
        {sites.map((site) => (
          <tr key={site.referenceNumber}>
            <td>{site.referenceNumber}</td>
            <td>{site.responsibleBodies.join(', ')}</td>
            <td>{site.siteSize.toFixed(2)}</td>
            <td>{site.allocationsCount}</td>
            <td>{site.lpaName}</td>
            <td>{site.ncaName}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SiteList;