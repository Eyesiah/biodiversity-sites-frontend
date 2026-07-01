'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Box, Flex, Text } from '@chakra-ui/react';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import { formatNumber } from '@/lib/format';

function computeTopSites(allocations, n = 10) {
  const sites = {};
  (allocations || []).forEach(alloc => {
    if (!alloc.srn) return;
    if (!sites[alloc.srn]) {
      sites[alloc.srn] = { srn: alloc.srn, siteName: alloc.siteName, totalHU: 0, count: 0 };
    }
    sites[alloc.srn].totalHU += (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
    sites[alloc.srn].count += 1;
  });
  return Object.values(sites)
    .sort((a, b) => b.totalHU - a.totalHU)
    .slice(0, n);
}

function computeTopResponsibleBodies(allocations, n = 10) {
  const bodies = {};
  (allocations || []).forEach(alloc => {
    const rbs = Array.isArray(alloc.rb) ? alloc.rb : (alloc.rb ? [alloc.rb] : []);
    const hu = (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
    rbs.forEach(rb => {
      if (!rb) return;
      if (!bodies[rb]) {
        bodies[rb] = { rb, totalHU: 0, count: 0 };
      }
      bodies[rb].totalHU += hu;
      bodies[rb].count += 1;
    });
  });
  return Object.values(bodies)
    .sort((a, b) => b.totalHU - a.totalHU)
    .slice(0, n);
}

function computeTopLnrs(allocations, n = 10) {
  const regions = {};
  (allocations || []).forEach(alloc => {
    const lnrs = alloc.lnrs;
    if (!lnrs || lnrs === 'N/A') return;
    if (!regions[lnrs]) {
      regions[lnrs] = { lnrs, totalHU: 0, count: 0 };
    }
    regions[lnrs].totalHU += (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
    regions[lnrs].count += 1;
  });
  return Object.values(regions)
    .sort((a, b) => b.totalHU - a.totalHU)
    .slice(0, n);
}

function computeTopLpas(allocations, n = 10) {
  const lpas = {};
  (allocations || []).forEach(alloc => {
    const lpa = alloc.lpa;
    if (!lpa || lpa === 'N/A') return;
    if (!lpas[lpa]) {
      lpas[lpa] = { lpa, totalHU: 0, count: 0 };
    }
    lpas[lpa].totalHU += (alloc.au || 0) + (alloc.hu || 0) + (alloc.wu || 0);
    lpas[lpa].count += 1;
  });
  return Object.values(lpas)
    .sort((a, b) => b.totalHU - a.totalHU)
    .slice(0, n);
}

export default function TopAllocationsTab({ allocations }) {
  const topSites = useMemo(() => computeTopSites(allocations), [allocations]);
  const topBodies = useMemo(() => computeTopResponsibleBodies(allocations), [allocations]);
  const topLnrs = useMemo(() => computeTopLnrs(allocations), [allocations]);
  const topLpas = useMemo(() => computeTopLpas(allocations), [allocations]);

  return (
    <Flex direction={{ base: 'column', lg: 'row' }} gap="2rem" padding="1rem" align="flex-start">

      {/* Left column: BGS Suppliers + Responsible Body Suppliers */}
      <Flex direction="column" flex="1" minWidth="0" gap="2rem">
        <Box>
          <Text fontSize="1.1rem" fontWeight="bold" marginBottom="0.75rem" color="fg">
            Top 10 BGS Suppliers
          </Text>
          <Text fontSize="0.85rem" color="gray.600" marginBottom="0.75rem">
            BGS gain sites ranked by total Habitat Units supplied to approved development allocations.
          </Text>
          <PrimaryTable.Root>
            <PrimaryTable.Header>
              <PrimaryTable.Row>
                <PrimaryTable.ColumnHeader textAlign="center" width="2.5rem">#</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="left">BGS Site</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">HU Total</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">Allocations</PrimaryTable.ColumnHeader>
              </PrimaryTable.Row>
            </PrimaryTable.Header>
            <PrimaryTable.Body>
              {topSites.map((site, i) => (
                <PrimaryTable.Row key={site.srn}>
                  <PrimaryTable.NumericCell>{i + 1}</PrimaryTable.NumericCell>
                  <PrimaryTable.Cell>
                    <Link href={`/sites/${site.srn}`}>{site.siteName || site.srn}</Link>
                  </PrimaryTable.Cell>
                  <PrimaryTable.NumericCell>{formatNumber(site.totalHU, 2)}</PrimaryTable.NumericCell>
                  <PrimaryTable.NumericCell>{site.count}</PrimaryTable.NumericCell>
                </PrimaryTable.Row>
              ))}
            </PrimaryTable.Body>
          </PrimaryTable.Root>
        </Box>

        <Box>
          <Text fontSize="1.1rem" fontWeight="bold" marginBottom="0.75rem" color="fg">
            Top 10 Responsible Body Suppliers
          </Text>
          <Text fontSize="0.85rem" color="gray.600" marginBottom="0.75rem">
            Responsible Bodies ranked by total Habitat Units supplied across all their BGS gain sites.
          </Text>
          <PrimaryTable.Root>
            <PrimaryTable.Header>
              <PrimaryTable.Row>
                <PrimaryTable.ColumnHeader textAlign="center" width="2.5rem">#</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="left">Responsible Body</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">HU Total</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">Allocations</PrimaryTable.ColumnHeader>
              </PrimaryTable.Row>
            </PrimaryTable.Header>
            <PrimaryTable.Body>
              {topBodies.map((entry, i) => (
                <PrimaryTable.Row key={entry.rb}>
                  <PrimaryTable.NumericCell>{i + 1}</PrimaryTable.NumericCell>
                  <PrimaryTable.Cell>{entry.rb}</PrimaryTable.Cell>
                  <PrimaryTable.NumericCell>{formatNumber(entry.totalHU, 2)}</PrimaryTable.NumericCell>
                  <PrimaryTable.NumericCell>{entry.count}</PrimaryTable.NumericCell>
                </PrimaryTable.Row>
              ))}
            </PrimaryTable.Body>
          </PrimaryTable.Root>
        </Box>
      </Flex>

      {/* Right column: LNRS (top) + LPA Demanders (bottom) */}
      <Flex direction="column" flex="1" minWidth="0" gap="2rem">
        <Box>
          <Text fontSize="1.1rem" fontWeight="bold" marginBottom="0.75rem" color="fg">
            Top 10 LNRS Suppliers
          </Text>
          <Text fontSize="0.85rem" color="gray.600" marginBottom="0.75rem">
            LNRS regions ranked by total Habitat Units supplied from BGS gain sites within them.
          </Text>
          <PrimaryTable.Root>
            <PrimaryTable.Header>
              <PrimaryTable.Row>
                <PrimaryTable.ColumnHeader textAlign="center" width="2.5rem">#</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="left">LNRS</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">HU Total</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">Allocations</PrimaryTable.ColumnHeader>
              </PrimaryTable.Row>
            </PrimaryTable.Header>
            <PrimaryTable.Body>
              {topLnrs.map((entry, i) => (
                <PrimaryTable.Row key={entry.lnrs}>
                  <PrimaryTable.NumericCell>{i + 1}</PrimaryTable.NumericCell>
                  <PrimaryTable.Cell>{entry.lnrs}</PrimaryTable.Cell>
                  <PrimaryTable.NumericCell>{formatNumber(entry.totalHU, 2)}</PrimaryTable.NumericCell>
                  <PrimaryTable.NumericCell>{entry.count}</PrimaryTable.NumericCell>
                </PrimaryTable.Row>
              ))}
            </PrimaryTable.Body>
          </PrimaryTable.Root>
        </Box>

        <Box>
          <Text fontSize="1.1rem" fontWeight="bold" marginBottom="0.75rem" color="fg">
            Top 10 LPA Demanders
          </Text>
          <Text fontSize="0.85rem" color="gray.600" marginBottom="0.75rem">
            Development LPAs ranked by total Habitat Units purchased from BGS gain sites.
          </Text>
          <PrimaryTable.Root>
            <PrimaryTable.Header>
              <PrimaryTable.Row>
                <PrimaryTable.ColumnHeader textAlign="center" width="2.5rem">#</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="left">LPA</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">HU Total</PrimaryTable.ColumnHeader>
                <PrimaryTable.ColumnHeader textAlign="right">Allocations</PrimaryTable.ColumnHeader>
              </PrimaryTable.Row>
            </PrimaryTable.Header>
            <PrimaryTable.Body>
              {topLpas.map((entry, i) => (
                <PrimaryTable.Row key={entry.lpa}>
                  <PrimaryTable.NumericCell>{i + 1}</PrimaryTable.NumericCell>
                  <PrimaryTable.Cell>{entry.lpa}</PrimaryTable.Cell>
                  <PrimaryTable.NumericCell>{formatNumber(entry.totalHU, 2)}</PrimaryTable.NumericCell>
                  <PrimaryTable.NumericCell>{entry.count}</PrimaryTable.NumericCell>
                </PrimaryTable.Row>
              ))}
            </PrimaryTable.Body>
          </PrimaryTable.Root>
        </Box>
      </Flex>

    </Flex>
  );
}
