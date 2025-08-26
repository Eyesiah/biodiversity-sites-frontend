import fs from 'fs';
import path from 'path';

function loadHabitatData() {
    console.log('Parsing habitat data...'); // Added for debugging to show it only runs once
    const habitatDataPath = path.join(process.cwd(), 'data', 'BNG-Habitat-Data.csv');
    const habitatDataCsv = fs.readFileSync(habitatDataPath, 'utf8');
    const lines = habitatDataCsv.split('\n').slice(1); // skip header

    const map = new Map();
    for (const line of lines) {
        const [habitatType, distinctiveness] = line.split(',');
        if (habitatType) {
            map.set(habitatType.trim().replace(/"/g, ''), distinctiveness.trim());
        }
    }
    console.log('Habitat data parsed and cached.');
    return map;
}

const distinctivenessMap = loadHabitatData();

export function getDistinctivenessMap() {
    return distinctivenessMap;
}
