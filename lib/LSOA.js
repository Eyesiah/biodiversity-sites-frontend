import fs from 'fs';
import path, { parse } from 'path';
import Papa from 'papaparse';

function loadLSOAInfo() {
  const dataPath = path.join(process.cwd(), 'data', 'LSOA-Deciles.csv');
  const dataCsv = fs.readFileSync(dataPath, 'utf8');

  const parsedData = new Map();

  const results = Papa.parse(dataCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    const lsoaName = row['LSOA11NM'];
    const IMDRank = row['Index of Multiple Deprivation (IMD) Rank'];
    const IMDDecile = Number(row['Index of Multiple Deprivation (IMD) Decile']);
  
    parsedData.set(lsoaName, {
      IMDRank,
      IMDDecile
    });    
  });

  return parsedData;
}

const loadedLSOAInfo = loadLSOAInfo();

export function getLSOAInfo(LSOAName) {
  return loadedLSOAInfo.get(LSOAName);
}