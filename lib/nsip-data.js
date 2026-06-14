export const NSIP_TYPE_LABELS = {
  'energy': 'Energy',
  'transport': 'Transport',
  'waste': 'Waste',
  'water': 'Water',
  'waste-and-water': 'Waste & Water',
  'business-and-commercial': 'Business & Commercial',
};

// Okabe-Ito colour-blind-safe qualitative palette.
export const NSIP_TYPE_COLORS = {
  'energy': '#E69F00',
  'transport': '#0072B2',
  'waste': '#CC79A7',
  'water': '#56B4E9',
  'waste-and-water': '#009E73',
  'business-and-commercial': '#F0E442',
};

// Maps the register CSV's "Application type" code prefix (e.g. "EN01") to the geojson's
// "infrastructure-project-type" values used by NSIP_TYPE_LABELS/NSIP_TYPE_COLORS.
export const NSIP_APPLICATION_TYPE_PREFIX_MAP = {
  'EN': 'energy',
  'TR': 'transport',
  'WA': 'water',
  'WS': 'waste',
  'WW': 'waste-and-water',
  'BC': 'business-and-commercial',
};

// Maps the register CSV's "Stage" values to the geojson's "infrastructure-project-decision" values
// used for the project's `decision` field and the Stage filter.
export const NSIP_STAGE_TO_DECISION_MAP = {
  'Pre-application': 'Pre Application',
  'Pre-examination': 'Pre Examination',
  'Examination': 'Examination',
  'Recommendation': 'Recommendation',
  'Acceptance': 'Acceptance',
  'Decision': 'Decision',
  'Post-decision': 'Decided',
  'Withdrawn': 'withdrawn',
};

export const NSIP_REGISTER_PROJECT_URL = 'https://national-infrastructure-consenting.planninginspectorate.gov.uk/projects';

// Calculates a representative [lat, lng] position for a feature, for map markers and table sorting.
function getFeaturePosition(geometry) {
  if (!geometry) return null;

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return [lat, lng];
  }

  const rings = geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat()
      : null;

  if (!rings) return null;

  let sumLat = 0, sumLng = 0, count = 0;
  rings.forEach(ring => {
    ring.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
      count++;
    });
  });

  return count > 0 ? [sumLat / count, sumLng / count] : null;
}

// Extracts the register CSV columns not otherwise covered by the geojson (description, region,
// location, submission window and process dates), trimmed and defaulting to null when blank.
function extractRegisterFields(row = {}) {
  const field = (key) => row[key]?.trim() || null;

  return {
    description: field('Description'),
    region: field('Region'),
    location: field('Location'),
    anticipatedSubmissionPeriod: field('Anticipated submission period'),
    dateOfApplication: field('Date of application'),
    dateApplicationAccepted: field('Date application accepted'),
    dateExaminationStarted: field('Date Examination started'),
    anticipatedCloseOfExamination: field("Examining Authority's anticipated close of examination"),
    dateExaminationClosed: field('Date Examination closed'),
    dateOfRecommendation: field('Date of recommendation'),
    dateOfDecision: field('Date of decision'),
    dateWithdrawn: field('Date withdrawn'),
  };
}

// Builds a project record for a register CSV row that has no entry in the geojson, using its
// GPS co-ordinates (format `'-lng, lat`) as a Point geometry.
function projectFromRegisterRow(row) {
  const reference = row['Project reference'].trim();
  const [lng, lat] = row['GPS co-ordinates'].replace(/^'/, '').split(',').map(s => parseFloat(s.trim()));
  const applicationTypePrefix = row['Application type']?.trim().slice(0, 2);
  const type = NSIP_APPLICATION_TYPE_PREFIX_MAP[applicationTypePrefix] || row['Application type']?.trim();
  const stage = row['Stage']?.trim();
  const geometry = { type: 'Point', coordinates: [lng, lat] };

  return {
    reference,
    name: row['Project name']?.trim(),
    type,
    typeLabel: NSIP_TYPE_LABELS[type] || type,
    decision: NSIP_STAGE_TO_DECISION_MAP[stage] || stage,
    developer: row['Applicant name']?.trim() || null,
    documentationUrl: `${NSIP_REGISTER_PROJECT_URL}/${reference}`,
    entryDate: null,
    startDate: null,
    endDate: null,
    geometryType: geometry.type,
    position: getFeaturePosition(geometry),
    geometry,
    ...extractRegisterFields(row),
  };
}

// Flattens the raw geojson into a list of project records for the table, keeping the geometry for the map.
// Restricted to projects present in the register CSV (i.e. those listed on the Planning
// Inspectorate's project-search page), with any of those missing a geojson entry appended as
// point markers using their GPS co-ordinates from the register.
export function processNSIPData(geoJson, developers = {}, registerRows = []) {
  if (!geoJson?.features) return [];

  const registerByRef = new Map(registerRows.map(row => [row['Project reference'].trim(), row]));

  const projects = geoJson.features
    .filter(feature => registerByRef.has(feature.properties.reference))
    .map(feature => {
      const props = feature.properties;
      const stage = registerByRef.get(props.reference)?.Stage?.trim();
      const decision = (stage && NSIP_STAGE_TO_DECISION_MAP[stage]) || props['infrastructure-project-decision'];
      return {
        reference: props.reference,
        name: props.name,
        type: props['infrastructure-project-type'],
        typeLabel: NSIP_TYPE_LABELS[props['infrastructure-project-type']] || props['infrastructure-project-type'],
        decision,
        developer: developers[props.reference] || null,
        documentationUrl: props['documentation-url'] || null,
        entryDate: props['entry-date'] || null,
        startDate: props['start-date'] || null,
        endDate: props['end-date'] || null,
        geometryType: feature.geometry?.type,
        position: getFeaturePosition(feature.geometry),
        geometry: feature.geometry,
        ...extractRegisterFields(registerByRef.get(props.reference)),
      };
    });

  const existingRefs = new Set(projects.map(p => p.reference));
  for (const [reference, row] of registerByRef) {
    if (!existingRefs.has(reference)) {
      projects.push(projectFromRegisterRow(row));
    }
  }

  return projects;
}
