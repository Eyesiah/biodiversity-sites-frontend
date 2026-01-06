import fs from 'fs';
import path, { parse } from 'path';
import Papa from 'papaparse';

export function loadGlossary() {
  const dataPath = path.join(process.cwd(), 'data', 'BGS-Glossary.csv');
  const dataCsv = fs.readFileSync(dataPath, 'utf8');

  const parsedData = {};

  const results = Papa.parse(dataCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    const term = row['Term'];
    const definition = row['Definition'];
  
    parsedData[term] = definition;
  });

  return parsedData;
}
