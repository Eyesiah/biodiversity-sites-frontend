import fs from 'fs';
import path from 'path';

function loadHabitatData() {
    const habitatDataPath = path.join(process.cwd(), 'data', 'BNG-Habitat-Data.csv');
    const habitatDataCsv = fs.readFileSync(habitatDataPath, 'utf8');
    const lines = habitatDataCsv.split('\n').slice(1); // skip header

    const map = new Map();
    for (const line of lines) {
        const [habitatType, distinctiveness] = line.split(',');
        if (habitatType) {
            map.set(habitatType.trim().replace(/"/g, '').toLowerCase(), distinctiveness.trim());
        }
    }
    return map;
}

const distinctivenessMap = loadHabitatData();

export function getDistinctivenessMap() {
    return distinctivenessMap;
}
