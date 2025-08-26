import React, { useState, useMemo } from 'react';
import Link from 'next/link';

const SiteList = ({ sites }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'referenceNumber', direction: 'descending' });

  const sortedSites = useMemo(() => {
    if (!sites) return [];
    let sortableSites = [...sites];
    if (sortConfig.key !== null) {
      sortableSites.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Special handling for BGS Reference to sort numerically
        if (sortConfig.key === 'referenceNumber') {
          aValue = parseInt(a.referenceNumber.split('-')[1] || '0', 10);
          bValue = parseInt(b.referenceNumber.split('-')[1] || '0', 10);
        }

        // Handle array values by joining them
        if (Array.isArray(aValue)) {
          aValue = aValue.join(', ');
        }
        if (Array.isArray(bValue)) {
          bValue = bValue.join(', ');
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableSites;
  }, [sites, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (name) => {
    if (sortConfig.key !== name) {
      return '';
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  if (!sites || sites.length === 0) {
    return <p>No site data available.</p>;
  }

  return (
    <table className="site-table">
      <thead>
        <tr>
          <th onClick={() => requestSort('referenceNumber')}>BGS Reference{getSortIndicator('referenceNumber')}</th>
          <th onClick={() => requestSort('responsibleBodies')}>Responsible Bodies{getSortIndicator('responsibleBodies')}</th>
          <th onClick={() => requestSort('siteSize')}>Area (ha){getSortIndicator('siteSize')}</th>
          <th onClick={() => requestSort('allocationsCount')}># Allocations{getSortIndicator('allocationsCount')}</th>
          <th onClick={() => requestSort('lpaName')}>LPA{getSortIndicator('lpaName')}</th>
          <th onClick={() => requestSort('ncaName')}>NCA{getSortIndicator('ncaName')}</th>
        </tr>
      </thead>
      <tbody>
        {sortedSites.map((site) => (
          <tr key={site.referenceNumber}>
            <td>
              <Link href={`/sites/${site.referenceNumber}`}>
                {site.referenceNumber}
              </Link>
            </td>
            <td>{site.responsibleBodies.join(', ')}</td>
            <td className="numeric-data">{site.siteSize.toFixed(2)}</td>
            <td className="numeric-data">{site.allocationsCount}</td>
            <td>{site.lpaName}</td>
            <td>{site.ncaName}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SiteList;