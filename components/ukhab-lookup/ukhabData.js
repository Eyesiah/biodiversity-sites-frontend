// This file contains server-side functions that should only be used in server components
// For client-side usage, use the server actions in ukhabActions.js

import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

// Load UKHab data from CSV file
export function loadUKHabData() {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'BNG-UKHab-Codes.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');

    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim()
    });

    return results.data;
  } catch (error) {
    console.error('Error loading UKHab data:', error);
    return [];
  }
}

// Extract broad habitat from BNG habitat name (text before the dash)
export function extractBroadHabitat(bngHabitat) {
  if (!bngHabitat) return '';
  const parts = bngHabitat.split(' - ');
  return parts.length > 1 ? parts[0].trim() : bngHabitat.trim();
}

// Get unique broad habitats for dropdown
export function getUniqueBroadHabitats() {
  const data = loadUKHabData();
  const broadHabitats = new Set();
  
  data.forEach(row => {
    if (row['BNG Habitat'] && row['BNG Habitat'].trim()) {
      const broadHabitat = extractBroadHabitat(row['BNG Habitat'].trim());
      if (broadHabitat) {
        broadHabitats.add(broadHabitat);
      }
    }
  });

  return Array.from(broadHabitats).sort();
}

// Get specific habitats within a broad habitat category
export function getSpecificHabitatsForBroadHabitat(broadHabitat) {
  const data = loadUKHabData();
  const specificHabitats = new Set();
  
  data.forEach(row => {
    if (row['BNG Habitat'] && row['BNG Habitat'].trim()) {
      const rowBroadHabitat = extractBroadHabitat(row['BNG Habitat'].trim());
      if (rowBroadHabitat === broadHabitat) {
        specificHabitats.add(row['BNG Habitat'].trim());
      }
    }
  });

  return Array.from(specificHabitats).sort();
}

// Get unique BNG habitats for dropdown
export function getUniqueBNGHabitats() {
  const data = loadUKHabData();
  const habitats = new Set();
  
  data.forEach(row => {
    if (row['BNG Habitat'] && row['BNG Habitat'].trim()) {
      habitats.add(row['BNG Habitat'].trim());
    }
  });

  return Array.from(habitats).sort();
}

// Get UKHab codes for a specific BNG habitat
export function getUKHabCodesForHabitat(habitat) {
  const data = loadUKHabData();
  
  return data.filter(row => {
    return row['BNG Habitat'] && row['BNG Habitat'].trim() === habitat;
  }).map(row => ({
    ukhabCode: row['UKHAB Code'] || '',
    level1: row['Level 1'] || '',
    level2Code: row['Level 2 code'] || '',
    level2Label: row['Level 2 Label'] || '',
    level3Code: row['Level 3 code'] || '',
    level3Label: row['Level 3 Label'] || '',
    level4Code: row['Level 4 code'] || '',
    level4Label: row['Level 4 Label\n(Priority Habitats in Bold)'] || '',
    definitionPage: row['Definition Page'] || '',
    definitionLink: row['Definition Link'] || ''
  }));
}

// Get all UKHab codes
export function getAllUKHabCodes() {
  const data = loadUKHabData();
  
  return data.map(row => ({
    bngHabitat: row['BNG Habitat'] || '',
    ukhabCode: row['UKHAB Code'] || '',
    level1: row['Level 1'] || '',
    level2Code: row['Level 2 code'] || '',
    level2Label: row['Level 2 Label'] || '',
    level3Code: row['Level 3 code'] || '',
    level3Label: row['Level 3 Label'] || '',
    level4Code: row['Level 4 code'] || '',
    level4Label: row['Level 4 Label\n(Priority Habitats in Bold)'] || '',
    definitionPage: row['Definition Page'] || '',
    definitionLink: row['Definition Link'] || ''
  }));
}
