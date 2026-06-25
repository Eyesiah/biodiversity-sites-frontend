import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

function loadLNRSLinks() {
  const dataPath = path.join(process.cwd(), 'data', 'LNRS-Strategies.csv');
  const dataCsv = fs.readFileSync(dataPath, 'utf8');

  const parsedData = new Map();

  const results = Papa.parse(dataCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    if (row['LNRS Name'] && row['URL']) {
      parsedData.set(row['LNRS Name'], row['URL']);
    }
  });

  return parsedData;
}

const loadedLNRSLinks = loadLNRSLinks();

export function getLNRSLink(LNRSName) {
  return loadedLNRSLinks.get(LNRSName);
}
