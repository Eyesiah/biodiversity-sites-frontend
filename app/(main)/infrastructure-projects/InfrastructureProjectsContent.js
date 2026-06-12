'use client'

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, Text, Checkbox, Wrap } from '@chakra-ui/react';
import MapContentLayout from '@/components/ui/MapContentLayout';
import SearchableTableLayout from '@/components/ui/SearchableTableLayout';
import { PrimaryTable } from '@/components/styles/PrimaryTable';
import ExternalLink from '@/components/ui/ExternalLink';
import { ContentStack } from '@/components/styles/ContentStack';
import { NSIP_TYPE_COLORS, NSIP_TYPE_LABELS } from '@/lib/nsip-data';

const NSIPMap = dynamic(() => import('@/components/map/NSIPMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const TypeSwatch = ({ type }) => (
  <Box
    as="span"
    display="inline-block"
    width="0.8rem"
    height="0.8rem"
    borderRadius="2px"
    marginRight="0.4rem"
    verticalAlign="middle"
    bg={NSIP_TYPE_COLORS[type] || '#7f8c8d'}
  />
);

export default function InfrastructureProjectsContent({ projects = [], error = null }) {
  const [highlightedReference, setHighlightedReference] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState(projects);

  const availableTypes = useMemo(() => {
    const types = new Set(projects.map(p => p.type));
    return Object.keys(NSIP_TYPE_LABELS).filter(type => types.has(type));
  }, [projects]);

  const [selectedTypes, setSelectedTypes] = useState(() => new Set(availableTypes));

  const typeFilteredProjects = useMemo(
    () => projects.filter(p => selectedTypes.has(p.type)),
    [projects, selectedTypes]
  );

  const mapProjects = useMemo(() => filteredProjects, [filteredProjects]);

  const toggleType = (type, checked) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(type);
      } else {
        next.delete(type);
      }
      return next;
    });
  };

  const allSelected = selectedTypes.size === availableTypes.length;
  const noneSelected = selectedTypes.size === 0;

  const toggleAllTypes = (checked) => {
    setSelectedTypes(checked ? new Set(availableTypes) : new Set());
  };

  if (error) {
    return <Text color="red.500">Error loading Nationally Significant Infrastructure Projects: {error}</Text>;
  }

  return (
    <MapContentLayout
      map={
        <NSIPMap projects={mapProjects} highlightedReference={highlightedReference} />
      }
      content={
        <ContentStack>
          <Wrap spacing="1rem" padding="0 0 0.5rem" justify="center" width="100%">
            <Checkbox.Root
              checked={allSelected ? true : (noneSelected ? false : 'indeterminate')}
              onCheckedChange={(details) => toggleAllTypes(!!details.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text as="strong">{allSelected ? 'Deselect all' : 'Select all'}</Text>
              </Checkbox.Label>
            </Checkbox.Root>
            {availableTypes.map(type => (
              <Checkbox.Root
                key={type}
                checked={selectedTypes.has(type)}
                onCheckedChange={(details) => toggleType(type, !!details.checked)}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>
                  <TypeSwatch type={type} />{NSIP_TYPE_LABELS[type]}
                </Checkbox.Label>
              </Checkbox.Root>
            ))}
          </Wrap>
          <SearchableTableLayout
            initialItems={typeFilteredProjects}
            filterPredicate={(item, term) => {
              const lowercasedTerm = term.toLowerCase();
              return (
                (item.name?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.reference?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.typeLabel?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.decision?.toLowerCase() || '').includes(lowercasedTerm) ||
                (item.developer?.toLowerCase() || '').includes(lowercasedTerm)
              );
            }}
            initialSortConfig={{ key: 'name', direction: 'ascending' }}
            placeholder="Search by project name, reference, type, status or developer."
            onSortedItemsChange={setFilteredProjects}
            summary={(filteredCount, totalCount) => (
              <Text fontSize="1.2rem">
                Showing <Text as="strong">{filteredCount}</Text> of <Text as="strong">{totalCount}</Text> Nationally Significant Infrastructure Projects.
              </Text>
            )}
          >
            {({ sortedItems, requestSort, getSortIndicator }) => (
              <Box width="100%" overflowX="auto">
                <PrimaryTable.Root>
                  <PrimaryTable.Header>
                    <PrimaryTable.Row>
                      <PrimaryTable.ColumnHeader onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</PrimaryTable.ColumnHeader>
                      <PrimaryTable.ColumnHeader onClick={() => requestSort('reference')}>Reference{getSortIndicator('reference')}</PrimaryTable.ColumnHeader>
                      <PrimaryTable.ColumnHeader onClick={() => requestSort('typeLabel')}>Type{getSortIndicator('typeLabel')}</PrimaryTable.ColumnHeader>
                      <PrimaryTable.ColumnHeader onClick={() => requestSort('decision')}>Status{getSortIndicator('decision')}</PrimaryTable.ColumnHeader>
                      <PrimaryTable.ColumnHeader onClick={() => requestSort('developer')}>Developer{getSortIndicator('developer')}</PrimaryTable.ColumnHeader>
                    </PrimaryTable.Row>
                  </PrimaryTable.Header>
                  <PrimaryTable.Body>
                    {sortedItems.map(project => (
                      <PrimaryTable.Row
                        key={project.reference}
                        onMouseEnter={() => setHighlightedReference(project.reference)}
                        onMouseLeave={() => setHighlightedReference(null)}
                      >
                        <PrimaryTable.Cell>
                          {project.documentationUrl
                            ? <ExternalLink href={project.documentationUrl}>{project.name}</ExternalLink>
                            : project.name}
                        </PrimaryTable.Cell>
                        <PrimaryTable.Cell fontFamily="mono" textAlign="center">{project.reference}</PrimaryTable.Cell>
                        <PrimaryTable.Cell textAlign="center"><TypeSwatch type={project.type} />{project.typeLabel}</PrimaryTable.Cell>
                        <PrimaryTable.Cell textAlign="center">{project.decision}</PrimaryTable.Cell>
                        <PrimaryTable.Cell textAlign="center">{project.developer || 'N/A'}</PrimaryTable.Cell>
                      </PrimaryTable.Row>
                    ))}
                  </PrimaryTable.Body>
                </PrimaryTable.Root>
              </Box>
            )}
          </SearchableTableLayout>
        </ContentStack>
      }
    />
  );
}
