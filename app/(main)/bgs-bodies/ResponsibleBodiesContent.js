'use client';

import Papa from 'papaparse';
import { useMemo } from 'react';
import { formatNumber } from '@/lib/format';
import { triggerDownload } from '@/lib/utils';
import SearchableBodiesLayout from './SearchableBodiesLayout';
import ExternalLink from '@/components/ui/ExternalLink';
import GlossaryTooltip from '@/components/ui/GlossaryTooltip';
import { Text, Link } from '@chakra-ui/react';

const HEADERS = [
  { key: 'name', label: 'Name' },
  { key: 'siteCount', label: '# BGS Sites', render: (body) => body.sites.length },
  { key: 'designationDate', label: 'Designation Date' },
  { key: 'expertise', label: 'Area of Expertise' },
  { key: 'organisationType', label: 'Type of Organisation' },
  { key: 'address', label: 'Address' },
  {
    key: 'emails',
    label: 'Email',
    render: (body) => (
      body.emails.map(email => (
        <div key={email}>
          <Link href={`mailto:${email}`}>
            <Text
              maxW="250px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              display="inline-block"
            >
              {email}
            </Text>
          </Link>
        </div>
      ))
    )
  },
  { key: 'telephone', label: 'Telephone' },
];

export default function ResponsibleBodiesContent({
  responsibleBodies,
  sites,
  onMapSitesChange,
  onHoveredSiteChange,
  onSelectedSiteChange
}) {

  // Pre-process bodies to add sites array for each body
  const bodiesWithSites = useMemo(() => {
    if (!sites) return responsibleBodies;
    return responsibleBodies.map(item => ({
      ...item,
      sites: item.sites.map(ref => sites.find(s => s.referenceNumber == ref)),
      siteCount: item.sites.length
    }));
  }, [responsibleBodies, sites]);

  const handleExport = (itemsToExport) => {
    const csvData = itemsToExport.map(body => ({
      'Name': body.name,
      '# BGS Sites': body.sites.length,
      'Designation Date': body.designationDate,
      'Area of Expertise': body.expertise,
      'Type of Organisation': body.organisationType,
      'Address': body.address,
      'Email': body.emails.join('; '),
      'Telephone': body.telephone,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'responsible-bodies.csv');
  };

  const unknownRB = bodiesWithSites.find(rb => rb.name == '<Unknown>');
  const numDesignated = unknownRB ? bodiesWithSites.length - 1 : bodiesWithSites.length;

  return (
    <SearchableBodiesLayout
      bodies={bodiesWithSites}
      headers={HEADERS}
      bodyNameKey="name"
      sitesKey="sites"
      filterPredicate={(body, term) =>
        (body.name?.toLowerCase() || '').includes(term) ||
        (body.expertise?.toLowerCase() || '').includes(term) ||
        (body.organisationType?.toLowerCase() || '').includes(term) ||
        (body.address?.toLowerCase() || '').includes(term)
      }
      initialSortConfig={{ key: 'sites.length', direction: 'descending' }}
      summary={(filteredCount, totalCount) => (
        <div>
          {filteredCount != totalCount ? (
            <Text>Displaying <strong>{formatNumber(filteredCount, 0)}</strong> of <strong>{formatNumber(totalCount, 0)}</strong> bodies</Text>
          ) : (
            <Text fontSize="1.2rem" fontWeight="normal">
              These <strong>{numDesignated}</strong> <GlossaryTooltip term='Responsible Body'>responsible bodies</GlossaryTooltip> may enter into <ExternalLink href={`https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies`}><strong>conservation covenant agreements</strong></ExternalLink> with landowners in England.
              {unknownRB && <><br />There are <strong>{unknownRB.sites.length}</strong> BGS sites that do not list a designated responsible body, only LPAs.</>}
            </Text>
          )}
        </div>
      )}
      exportConfig={{ onExportCsv: handleExport }}
      onMapSitesChange={onMapSitesChange}
      onSiteHover={onHoveredSiteChange}
      onSiteClick={onSelectedSiteChange}
      onSelectedSiteChange={onSelectedSiteChange}
    />
  );
}
