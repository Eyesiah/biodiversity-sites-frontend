const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const XML_PATH = path.join(__dirname, '..', 'data', 'LPAs.xml');
const CSV_PATH = path.join(__dirname, '..', 'data', 'local-planning-authorities.csv');

function jsonToCsv(items) {
  if (!items || items.length === 0) {
    return '';
  }
  const header = ['id', 'name', 'size', 'adjacents'];
  const headerString = header.join(',');

  const rowItems = items.map(row =>
    header.map(fieldName => {
      let value = row[fieldName];
      // Ensure adjacents is always an array for consistent stringification
      if (fieldName === 'adjacents' && value && !Array.isArray(value)) {
        value = [value];
      } else if (fieldName === 'adjacents' && !value) {
        value = []; // Handle cases with no adjacents
      }
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',')
  );

  return [headerString, ...rowItems].join('\n');
}

function convertXmlToCsv() {
  try {
    console.log(`Reading XML from ${XML_PATH}...`);
    const xmlData = fs.readFileSync(XML_PATH, 'utf-8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      // This configuration helps, but we'll add more robust handling
      isArray: (tagName, jPath) => jPath.endsWith('.adjacent')
    });
    const jsonObj = parser.parse(xmlData);

    // The root element might be different, let's find the array of LPAs
    const lpas = jsonObj.ArrayOfLocalPlanningAuthority?.LocalPlanningAuthority || jsonObj.LocalPlanningAuthority || [];

    console.log(`Found ${lpas.length} LPAs. Converting to CSV...`);

    const csvData = jsonToCsv(lpas);
    fs.writeFileSync(CSV_PATH, csvData, 'utf-8');
    console.log(`Successfully created ${CSV_PATH}`);

  } catch (error) {
    console.error('An error occurred during XML to CSV conversion:', error);
    process.exit(1);
  }
}

convertXmlToCsv();