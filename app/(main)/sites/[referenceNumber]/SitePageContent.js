'use client'

import { XMLBuilder } from 'fast-xml-parser';
import Papa from 'papaparse';
import MapContentLayout from '@/components/ui/MapContentLayout';
import { SiteDetailsCard } from './SiteDetailsCard'
import { AllocationsTable } from './AllocationsTable'
import HabitatTabContent from './HabitatTabContent'
import dynamic from 'next/dynamic';
import { triggerDownload } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { ContentStack } from '@/components/styles/ContentStack'
import { Flex } from "@chakra-ui/react"
import { Button } from '@/components/styles/Button';
import { Tabs } from '@/components/styles/Tabs';
import { ImdScoresChart } from '@/components/charts/ImdScoresChart';
import { TbFileTypeXml, TbJson } from "react-icons/tb";
import { GrDocumentCsv } from "react-icons/gr";
import Tooltip from '@/components/ui/Tooltip';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

// Units constants
const UNITS = {
  HECTARES: 'ha',
  KILOMETRES: 'km'
};

const SiteMap = dynamic(() => import('@/components/map/SiteMap'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
});

const handleExportXML = (site) => {
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const xmlDataStr = builder.build({ site });

  const blob = new Blob([xmlDataStr], { type: 'application/xml' });
  triggerDownload(blob, `bgs-site-${site.referenceNumber}.xml`);
};

const handleExportJSON = (site) => {
  const jsonDataStr = JSON.stringify({ site }, null, 2);

  const blob = new Blob([jsonDataStr], { type: 'application/json' });
  triggerDownload(blob, `bgs-site-${site.referenceNumber}.json`);
};

const handleExportCSV = (site) => {
  const MODULES = [
    { key: 'areas', label: 'Area', unit: 'ha' },
    { key: 'hedgerows', label: 'Hedgerow', unit: 'km' },
    { key: 'watercourses', label: 'Watercourse', unit: 'km' },
    { key: 'trees', label: 'Tree', unit: 'ha' },
  ];

  // Section 1: Site summary as key/value pairs
  const summaryRows = [
    ['Field', 'Value'],
    ['BGS Reference', site.referenceNumber ?? ''],
    ['Responsible Bodies', Array.isArray(site.responsibleBodies) ? site.responsibleBodies.join('; ') : (site.responsibleBodies ?? '')],
    ['Start Date', site.startDate ? new Date(site.startDate).toLocaleDateString('en-GB') : ''],
    ['Site Area (ha)', site.siteSize != null ? formatNumber(site.siteSize, 4) : ''],
    ['LPA', site.lpaName ?? ''],
    ['NCA', site.ncaName ?? ''],
    ['LNRS', site.lnrsName ?? ''],
    ['LSOA', site.lsoa?.name ?? ''],
    ['IMD Decile', site.lsoa?.IMDDecile ?? ''],
    ['Latitude', site.latitude != null ? formatNumber(site.latitude, 6) : ''],
    ['Longitude', site.longitude != null ? formatNumber(site.longitude, 6) : ''],
    ['Baseline HUs', site.baselineHUs != null ? formatNumber(site.baselineHUs, 4) : ''],
    ['Created HUs', site.createdHUs != null ? formatNumber(site.createdHUs, 4) : ''],
    ['Enhanced HUs', site.enhancedHUs != null ? formatNumber(site.enhancedHUs, 4) : ''],
    ['Total HU Gain', site.huGain != null ? formatNumber(site.huGain, 4) : ''],
    ['Number of Allocations', site.allocations?.length ?? 0],
  ];
  const summaryCsv = Papa.unparse(summaryRows, { header: false });

  // Helper: flatten a habitat group into one row per subRow
  const flattenHabitats = (habitats, module, isImprovement) => {
    const rows = [];
    (habitats || []).forEach(habitat => {
      const huGain = isImprovement ? (habitat.HUs ?? 0) - (habitat.baselineHUs ?? 0) : null;
      if (habitat.subRows && habitat.subRows.length > 0) {
        habitat.subRows.forEach(sub => {
          const row = {
            'Module': module.label,
            'Broad Habitat': habitat.broadHabitat ?? '',
            'Habitat': habitat.type ?? '',
            'Distinctiveness': habitat.distinctiveness ?? '',
            'Condition': sub.condition ?? '',
            '# Parcels': sub.parcels ?? '',
            [`Size (${module.unit})`]: sub.size != null ? formatNumber(sub.size, 4) : '',
            'HUs': sub.HUs != null ? formatNumber(sub.HUs, 4) : '',
          };
          if (isImprovement) {
            row['Intervention'] = sub.interventionType ?? '';
            row['Time to Target (years)'] = sub.timeToTarget ?? '';
            row['Temporal Risk'] = sub.temporalRisk != null ? formatNumber(sub.temporalRisk, 4) : '';
            row['Difficulty Factor'] = sub.difficultyFactor != null ? formatNumber(sub.difficultyFactor, 4) : '';
            row['Spatial Risk'] = sub.spatialRisk != null ? formatNumber(sub.spatialRisk, 4) : '';
            row['HU Gain'] = sub.HUs != null ? formatNumber((sub.HUs ?? 0) - (sub.baselineHUs ?? 0), 4) : '';
          }
          rows.push(row);
        });
      } else {
        // No subRows - emit a summary row
        const row = {
          'Module': module.label,
          'Broad Habitat': habitat.broadHabitat ?? '',
          'Habitat': habitat.type ?? '',
          'Distinctiveness': habitat.distinctiveness ?? '',
          'Condition': '',
          '# Parcels': habitat.parcels ?? '',
          [`Size (${module.unit})`]: habitat.size != null ? formatNumber(habitat.size, 4) : '',
          'HUs': habitat.HUs != null ? formatNumber(habitat.HUs, 4) : '',
        };
        if (isImprovement) {
          row['Intervention'] = '';
          row['Time to Target (years)'] = '';
          row['Temporal Risk'] = '';
          row['Difficulty Factor'] = '';
          row['Spatial Risk'] = '';
          row['HU Gain'] = huGain != null ? formatNumber(huGain, 4) : '';
        }
        rows.push(row);
      }
    });
    return rows;
  };

  // Section 2: Baseline habitats
  const baselineRows = MODULES.flatMap(m => flattenHabitats(site.habitats[m.key], m, false));
  const baselineCsv = baselineRows.length > 0 ? Papa.unparse(baselineRows) : 'Module,Broad Habitat,Habitat,Distinctiveness,Condition,# Parcels,Size,HUs\n(none)';

  // Section 3: Improvement habitats
  const improvementRows = MODULES.flatMap(m => flattenHabitats(site.improvements[m.key], m, true));
  const improvementCsv = improvementRows.length > 0 ? Papa.unparse(improvementRows) : 'Module,Broad Habitat,Habitat,Distinctiveness,Condition,# Parcels,Size,HUs,Intervention,Time to Target (years),Temporal Risk,Difficulty Factor,Spatial Risk,HU Gain\n(none)';

  // Section 4: Allocations
  const allocationRows = (site.allocations || []).map(alloc => ({
    'Planning Reference': alloc.planningReference ?? '',
    'LPA': alloc.localPlanningAuthority ?? '',
    'IMD Decile': alloc.lsoa?.IMDDecile ?? '',
    'Distance (km)': alloc.distance != null ? formatNumber(alloc.distance, 2) : '',
    'Spatial Risk': alloc.sr ? `${alloc.sr.cat}${alloc.sr.cat !== 'Outside' ? ` (${alloc.sr.from})` : ''}` : '',
    'Project Name': alloc.projectName ?? '',
    'Area Units': alloc.areaUnits != null && alloc.areaUnits > 0 ? formatNumber(alloc.areaUnits, 4) : '',
    'Hedgerow Units': alloc.hedgerowUnits != null && alloc.hedgerowUnits > 0 ? formatNumber(alloc.hedgerowUnits, 4) : '',
    'Watercourse Units': alloc.watercoursesUnits != null && alloc.watercoursesUnits > 0 ? formatNumber(alloc.watercoursesUnits, 4) : '',
  }));
  const allocationsCsv = allocationRows.length > 0 ? Papa.unparse(allocationRows) : 'Planning Reference,LPA,IMD Decile,Distance (km),Spatial Risk,Project Name,Area Units,Hedgerow Units,Watercourse Units\n(none)';

  // Combine all sections with section labels and blank line separators
  const fullCsv = [
    'SITE SUMMARY',
    summaryCsv,
    '',
    'BASELINE HABITATS',
    baselineCsv,
    '',
    'IMPROVEMENT HABITATS',
    improvementCsv,
    '',
    'ALLOCATIONS',
    allocationsCsv,
  ].join('\n');

  const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `bgs-site-${site.referenceNumber}.csv`);
};

export default function SitePageContent({ site }) {
  const [showAllocations, setshowAllocations] = useState(false);
  const [showLPA, setShowLPA] = useState(false);
  const [showNCA, setShowNCA] = useState(false);
  const [showLNRS, setShowLNRS] = useState(false);
  const [showLSOA, setShowLSOA] = useState(false);
  const contentRef = useRef(null);

  const tabs = useMemo(() => [
    {
      title: `Areas&nbsp;(${Math.max(site.habitats.areas.length, site.improvements.areas.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={site.sankey.areas}
          habitatType="Area Habitats"
          units={UNITS.HECTARES}
          improvements={site.improvements.areas}
          baseline={site.habitats.areas}
        />
      )
    },
    {
      title: `Individual Trees&nbsp;(${Math.max(site.improvements.trees.length, site.habitats.trees.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={site.sankey.trees}
          habitatType="Individual Trees"
          units={UNITS.HECTARES}
          improvements={site.improvements.trees}
          baseline={site.habitats.trees}
        />
      ),
      shouldRender: () => site.improvements.trees.length > 0 || site.habitats.trees.length > 0
    },
    {
      title: `Hedgerow&nbsp;(${Math.max(site.habitats.hedgerows.length, site.improvements.hedgerows.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={site.sankey.hedgerows}
          habitatType="Hedgerows"
          units={UNITS.KILOMETRES}
          improvements={site.improvements.hedgerows}
          baseline={site.habitats.hedgerows}
        />
      ),
      shouldRender: () => site.habitats.hedgerows.length > 0 || site.improvements.hedgerows.length > 0
    },
    {
      title: `Watercourse&nbsp;(${Math.max(site.habitats.watercourses.length, site.improvements.watercourses.length)})`,
      content: () => (
        <HabitatTabContent
          sankeyData={site.sankey.watercourses}
          habitatType="Watercourses"
          units={UNITS.KILOMETRES}
          improvements={site.improvements.watercourses}
          baseline={site.habitats.watercourses}
        />
      ),
      shouldRender: () => site.habitats.watercourses.length > 0 || site.improvements.watercourses.length > 0
    },
    {
      title: `Allocations&nbsp;(${site.allocations.length})`,
      content: () => (
        <AllocationsTable
          title="Allocations"
          allocations={site.allocations}
          showLink={true}
        />
      ),
      onIsActiveTabChanged: (isActive) => {
        console.log(`setshowAllocations: ${isActive}`);
        setshowAllocations(isActive);
      }
    },
    {
      title: 'IMD Score<br>Transfers Chart',
      content: () => {
        return (
          <ImdScoresChart site={site} />
        )
      },
      shouldRender: () => site.allocations.length > 0
    },
    {
      title: 'Data Export',
      content: () => (
        <Flex gap="0.5rem" justifyContent="center">
          <Tooltip text="Click to download data as a .XML file"><Button padding="4px" border="2px solid" size={15} onClick={() => handleExportXML(site)}><TbFileTypeXml size={40} padding={0} /></Button></Tooltip>
          <Tooltip text="Click to download data as a .JSON file"><Button padding="4px" border="2px solid" size={15} onClick={() => handleExportJSON(site)}><TbJson size={40} padding={0} /></Button></Tooltip>
          <Tooltip text="Click to download data as a .CSV file"><Button padding="4px" border="2px solid" size={15} onClick={() => handleExportCSV(site)}><GrDocumentCsv size={40} padding={0} /></Button></Tooltip>
        </Flex>
      )
    }
  ], [
    site
  ]);

  const handleTabChange = useCallback((newTabIndex) => {
    // Call onIsActiveTabChanged callbacks for all tabs
    tabs.forEach((tab, index) => {
      if (tab.onIsActiveTabChanged) {
        tab.onIsActiveTabChanged(index === newTabIndex.value);
      }
    });
  }, [tabs]);

  // Initialize the active tab callback on mount
  useEffect(() => {
    handleTabChange(0); // Default to first tab
  }, [handleTabChange]);

  // display satellite if not showing allocs
  const mapLayer = useMemo(() => {
    if (showAllocations && site && site.allocations.length > 0) {
      return 'OpenStreetMap';
    } else {
      return 'Satellite';
    }
  }, [showAllocations, site]);

  return (
    <MapContentLayout
      map={
        <SiteMap
          sites={[site]}
          selectedSite={site}
          openPopups={false}
          showAllocations={showAllocations}
          showLPA={showLPA}
          showNCA={showNCA}
          showLNRS={showLNRS}
          showLSOA={showLSOA}
          mapLayer={mapLayer}
        />
      }
      content={(

        <ContentStack ref={contentRef}>

          <SiteDetailsCard site={site} bodyLayerStates={{ showLPA, setShowLPA, showNCA, setShowNCA, showLNRS, setShowLNRS, showLSOA, setShowLSOA }} />

          <Tabs.Root lazyMount defaultValue={0} onValueChange={handleTabChange} width="100%">
            <Tabs.List>
              {tabs.map((tab, index) => (
                (tab.shouldRender == null || tab.shouldRender()) && (
                  <Tabs.Trigger
                    key={index}
                    value={index}
                    dangerouslySetInnerHTML={{ __html: tab.title }}
                  />
                )
              ))}
            </Tabs.List>
            {tabs.map((tab, index) => (
              <Tabs.Content key={index} value={index} paddingTop={1}>
                {tab.content()}
              </Tabs.Content>
            ))}
          </Tabs.Root>


        </ContentStack>

      )}
    />
  )
}
