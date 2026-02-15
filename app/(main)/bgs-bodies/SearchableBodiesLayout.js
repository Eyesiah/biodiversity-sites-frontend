'use client';

import { useState, useEffect, useMemo } from 'react';
import { CollapsibleRow } from '@/components/data/CollapsibleRow';
import SiteList from '@/components/data/SiteList';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { PrimaryTable } from '@/components/styles/PrimaryTable';

export default function SearchableBodiesLayout({
  bodies,
  allSites,
  headers,
  bodyNameKey = 'name',
  siteRefsKey = 'sites',  // Key containing array of reference numbers
  filterPredicate,
  initialSortConfig,
  summary,
  exportConfig,
  onMapSitesChange,
  onSiteHover,
  onSiteClick,
  onSelectedSiteChange,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  // Create a Map for O(1) site lookups by referenceNumber
  const sitesMap = useMemo(() => {
    if (!allSites) return null;
    const map = new Map();
    allSites.forEach(site => map.set(site.referenceNumber, site));
    return map;
  }, [allSites]);

  const handleToggle = (bodyName, isOpen) => {
    if (isOpen) {
      setExpandedRows({ [bodyName]: true });
    } else {
      setExpandedRows({});
    }
  };

  useEffect(() => {
    const sites = [];
    for (const bodyName in expandedRows) {
      if (expandedRows[bodyName]) {
        const body = bodies.find(b => b[bodyNameKey] === bodyName);
        if (body && sitesMap) {
          const refs = body[siteRefsKey] || [];
          refs.forEach(ref => {
            const site = sitesMap.get(ref);
            if (site) sites.push(site);
          });
        }
      }
    }
    onMapSitesChange?.(sites);
    onSelectedSiteChange?.(null);
  }, [expandedRows, bodies, bodyNameKey, siteRefsKey, sitesMap, onMapSitesChange, onSelectedSiteChange]);

  const renderCell = (body, header) => {
    // Use custom render function if provided
    if (header.render) {
      return header.render(body);
    }
    const value = body[header.key];
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    // Use format function if provided
    if (header.format) {
      return header.format(value, body);
    }
    return value;
  };

  const BodyRow = ({ body, isOpen, onToggle }) => {
    const mainRow = headers.map((header, index) => {
      // Determine cell component based on textAlign
      const CellComponent = header.textAlign === 'center' || header.textAlign === 'right' 
        ? PrimaryTable.NumericCell 
        : PrimaryTable.Cell;
      
      return (
        <CellComponent key={header.key} textAlign={header.textAlign}>
          {renderCell(body, header)}
        </CellComponent>
      );
    });

    // Lazily expand site references to full site objects when row is expanded
    const expandedSites = useMemo(() => {
      if (!sitesMap) return [];
      const refs = body[siteRefsKey] || [];
      return refs.map(ref => sitesMap.get(ref)).filter(Boolean);
    }, [body, siteRefsKey, sitesMap]);

    const collapsibleContent = (
      <SiteList
        sites={expandedSites}
        onSiteHover={onSiteHover}
        onSiteClick={onSiteClick}
        minimalHeight={true}
      />
    );

    return (
      <CollapsibleRow
        mainRow={mainRow}
        collapsibleContent={collapsibleContent}
        colSpan={headers.length}
        onToggle={onToggle}
        isOpen={isOpen}
      />
    );
  };

  return (
    <SearchableTableLayout
      initialItems={bodies}
      filterPredicate={filterPredicate}
      initialSortConfig={initialSortConfig}
      exportConfig={exportConfig}
      summary={summary}
    >
      {({ sortedItems, requestSort, getSortIndicator }) => (
        <PrimaryTable.Root>
          <PrimaryTable.Header>
            <PrimaryTable.Row>
              {headers.map((header) => (
                <PrimaryTable.ColumnHeader
                  key={header.key}
                  onClick={header.sortable !== false ? () => requestSort(header.key) : undefined}
                  textAlign={header.textAlign}
                >
                  {header.label}
                  {header.sortable !== false && getSortIndicator(header.key)}
                </PrimaryTable.ColumnHeader>
              ))}
            </PrimaryTable.Row>
          </PrimaryTable.Header>
          <PrimaryTable.Body>
            {sortedItems.map((body) => (
              <BodyRow
                body={body}
                key={body[bodyNameKey]}
                isOpen={expandedRows[body[bodyNameKey]] || false}
                onToggle={(isOpen) => handleToggle(body[bodyNameKey], isOpen)}
              />
            ))}
          </PrimaryTable.Body>
        </PrimaryTable.Root>
      )}
    </SearchableTableLayout>
  );
}
