import GlossaryProse from './GlossaryProse';
import fs from 'fs';
import path, { parse } from 'path';
import Papa from 'papaparse';

export const metadata = {
  title: 'Glossary | BNG & Biodiversity Terms',
  description: 'Glossary of terms used in the BGS Register and Biodiversity Net Gain. Understand habitat units, conditions, distinctiveness, and other BNG terminology.',
  keywords: ['glossary', 'BNG terms', 'biodiversity glossary', 'habitat terms', 'BGS glossary', 'environmental terms', 'conservation terminology'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space/glossary',
  },
};

export default function Glossary() {
  // Load glossary server-side
  // include the links here so don't use the function in lib/glossary
  const dataPath = path.join(process.cwd(), 'data', 'BGS-Glossary.csv');
  const dataCsv = fs.readFileSync(dataPath, 'utf8');

  const glossaryData = [];

  const results = Papa.parse(dataCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: header => header.trim()
  });

  results.data.forEach(row => {
    const term = row['Term'];
    const definition = row['Definition'];
    const link = row['Link'];
    const linkText = row['LinkText'];
  
    glossaryData.push({term, definition, link, linkText});
  });

  return <GlossaryProse glossaryData={glossaryData.sort((a, b) => a.term.localeCompare(b.term))}/>;
}