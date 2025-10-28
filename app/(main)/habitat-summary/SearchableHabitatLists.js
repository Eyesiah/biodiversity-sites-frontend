'use client'

import { useState, useMemo, useEffect, useCallback } from 'react';
import { XMLBuilder } from 'fast-xml-parser';
import MapContentLayout from '@/components/MapContentLayout';
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { HabitatSummaryTable } from '@/components/HabitatSummaryTable';
import SearchableTableLayout from '@/components/SearchableTableLayout';
import { HabitatTable } from '@/components/HabitatsTable';
import { DataSection, SectionTitle } from '@/components/ui/DataSection';

const SiteMap = dynamic(() => import('@/components/Maps/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

// Component for displaying habitat summary
const HabitatSummaryCard = ({data}) => (
  <DataSection>
    <SectionTitle>Habitat Summary</SectionTitle>
    <HabitatSummaryTable site={ data } />
  </DataSection>
);

export default function SearchableHabitatLists({ allHabitats, sites }) {
  const [displayedSites, setDisplayedSites] = useState([]);
  const [currentHabitat, setCurrentHabitat] = useState(null);

  const onHabitatToggle = (habitat) => {
    if (isHabitatOpen(habitat)) {
      setCurrentHabitat(null);
    } else {
      setCurrentHabitat(habitat);
    }
  }

  const isHabitatOpen = useCallback((habitat) => {
    return currentHabitat == habitat;
  }, [currentHabitat])

  useEffect(() => {
    if (currentHabitat) {
      const sitesWithHabitat = currentHabitat.sites.map(s => sites[s.r]);
      setDisplayedSites(sitesWithHabitat);
    }
    else {
      setDisplayedSites([]);
    }
  }, [currentHabitat, sites]);

  const filterPredicate = useCallback((habitat, searchTerm) => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return habitat.type.toLowerCase().includes(lowercasedTerm);
  }, []);

  const handleExportXML = (items) => {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const dataToExport = {
      habitatSummary: {
        baseline: { habitat: items.filter(h => !h.isImprovement) },
        improvement: { habitat: items.filter(h => h.isImprovement) }
      }
    };
    const xmlDataStr = builder.build(dataToExport);
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, 'bgs-habitat-summary.xml');
  };

  const handleExportJSON = (items) => {
    const dataToExport = {
      habitatSummary: {
        baseline: items.filter(h => !h.isImprovement),
        improvement: items.filter(h => h.isImprovement)
      }
    };
    const jsonDataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, 'bgs-habitat-summary.json');
  };

  const SummaryComponent = (filteredCount, totalCount, sortedItems) => {
    const data = useMemo(()=> {
      const habitats = sortedItems.filter(h => !h.isImprovement);
      const improvements = sortedItems.filter(h => h.isImprovement);
      return {
        habitats: {
          areas: habitats.filter(h => h.module == "Area"),
          hedgerows: habitats.filter(h => h.module == "Hedgerow"),
          watercourses: habitats.filter(h => h.module == "Watercourses"),
        },
        improvements: {
          areas: improvements.filter(h => h.module == "Area"),
          hedgerows: improvements.filter(h => h.module == "Hedgerow"),
          watercourses: improvements.filter(h => h.module == "Watercourses"),
        }
      }
    }, [sortedItems]);

    return <HabitatSummaryCard data={data} />;
  };

  const HabitatTabContent = ({ 
    isImprovement, 
    module, 
    sortedItems, 
    requestSort,
    sortConfig, 
    sites
  }) => {
    // Memoize the filtered data to prevent unnecessary recalculations
    const filteredHabitats = useMemo(() => {        
      return sortedItems.filter(h => h.isImprovement == isImprovement && h.module == module);
    }, [isImprovement, module, sortedItems]);
    
    return (
      <HabitatTable
        title={module.charAt(0).toUpperCase() + module.slice(1)}
        habitats={filteredHabitats}
        sortConfig={sortConfig}
        isImprovement={isImprovement}
        onHabitatToggle={onHabitatToggle}
        isHabitatOpen={isHabitatOpen}
        sites={sites}
        requestSort={requestSort}
        units={module == 'areas' ? 'ha' : 'km'}
      />
    );
  };
  const tabs = [
    {
      title: 'Improvement Areas',
      content: (props) => (
        <HabitatTabContent {...props} isImprovement={true} module="Area" sites={sites} />
      )
    },
    {
      title: 'Improvement Hedgerows',
      content: (props) => (
        <HabitatTabContent {...props} isImprovement={true} module="Hedgerow" sites={sites} />
      )
    },
    {
      title: 'Improvement Watercourses',
      content: (props) => (
        <HabitatTabContent {...props} isImprovement={true} module="Watercourses" sites={sites} />
      )
    },
    {
      title: 'Baseline Areas',
      content: (props) => (
        <HabitatTabContent {...props} isImprovement={false} module="Area" sites={sites} />
      )
    },
    {
      title: 'Baseline Hedgerows',
      content: (props) => (
        <HabitatTabContent {...props} isImprovement={false} module="Hedgerow" sites={sites} />
      )
    },
    {
      title: 'Baseline Watercourses',
      content: (props) => (
        <HabitatTabContent {...props} isImprovement={false} module="Watercourses" sites={sites} />
      )
    }
  ];

  return (
    <MapContentLayout
      map={<SiteMap sites={displayedSites} />}
      content={
        <SearchableTableLayout
          initialItems={allHabitats}
          filterPredicate={filterPredicate}
          initialSortConfig={{ key: 'type', direction: 'ascending' }}
          placeholder="Search by habitat name..."
          exportConfig={{ onExportXml: handleExportXML, onExportJson: handleExportJSON }}
          summary={SummaryComponent}
          tabs={tabs}
        />
      }
    />
  );
}
