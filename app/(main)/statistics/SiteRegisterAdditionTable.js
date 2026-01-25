'use client'

import { Heading, Box } from "@chakra-ui/react";
import Link from 'next/link';
import PrimaryTable from '@/components/styles/PrimaryTable';
import Button from '@/components/styles/Button';
import { GrDocumentCsv } from "react-icons/gr";

const CommaSeperatedSiteLink = ({ site, index, count }) => {
  return (
    <>
      <Link href={`/sites/${site}`}>{site}</Link>
      {index < count - 1 && ', '}
    </>
  );
};

const exportSiteAdditionsToCSV = (siteAdditions) => {
  const csvData = siteAdditions.map(addition => ({
    Date: new Date(Number(addition.date)).toLocaleDateString('en-GB', { timeZone: 'UTC' }),
    'Site Count': addition.sites.length
  }));

  // Sort by date
  csvData.sort((a, b) => {
    return new Date(a.Date.split('/').reverse().join('-')) - new Date(b.Date.split('/').reverse().join('-'));
  });

  // Generate CSV
  const csv = 'Date,Site Count\n' + csvData.map(row => `${row.Date},${row['Site Count']}`).join('\n');

  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'site-register-addition-dates.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const SiteRegisterAdditionTable = ({ siteAdditions }) => {
  return (
    <Box>
      <Box display="flex" justifyContent="center" alignItems="center" mb={4}>
        <Heading as="h2" size="lg" mr={4}>Site Register Addition Date</Heading>
        <Button padding="4px" border="0px solid" size={15} onClick={() => exportSiteAdditionsToCSV(siteAdditions)}>
          <GrDocumentCsv size={15} padding={0} />
        </Button>
      </Box>
      <Box maxHeight="500px" overflowY="auto" maxWidth='700px' margin="0 auto">
        <PrimaryTable.Root>
          <PrimaryTable.Header>
            <PrimaryTable.Row>
              <PrimaryTable.ColumnHeader>Date</PrimaryTable.ColumnHeader>
              <PrimaryTable.ColumnHeader>Sites</PrimaryTable.ColumnHeader>
            </PrimaryTable.Row>
          </PrimaryTable.Header>
          <PrimaryTable.Body>
            {siteAdditions.map((addition) => (
              <PrimaryTable.Row key={addition.date}>
                <PrimaryTable.Cell>{new Date(Number(addition.date)).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</PrimaryTable.Cell>
                <PrimaryTable.Cell>
                  {addition.sites.map((site, index) => (
                    <CommaSeperatedSiteLink key={index} site={site} index={index} count={addition.sites.length} />
                  ))}
                </PrimaryTable.Cell>
              </PrimaryTable.Row>
            ))}
          </PrimaryTable.Body>
        </PrimaryTable.Root>
      </Box>
    </Box>
  );
};

export default SiteRegisterAdditionTable;