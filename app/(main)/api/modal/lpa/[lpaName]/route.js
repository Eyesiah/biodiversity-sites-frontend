import fs from 'fs';
import path from 'path';
import { slugify, normalizeBodyName } from '@/lib/format';
import { NextResponse } from 'next/server';
 
export const dynamicParams = false;

export async function generateStaticParams() {
  const lpaJsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const lpaJsonData = fs.readFileSync(lpaJsonPath, 'utf-8');
  const allLpas = JSON.parse(lpaJsonData);

  const namePaths = allLpas.map(lpa => ({
    lpaName: slugify(normalizeBodyName(lpa.name)) ,
  }));
  
  const idPaths = allLpas.map(lpa => ({
    lpaName: lpa.id,
  }));

  return [...namePaths, ...idPaths];
}

export async function GET(request, { params }) {
  const paramData = await params;
  const lpaJsonPath = path.join(process.cwd(), 'data', 'LPAs.json');
  const lpaJsonData = fs.readFileSync(lpaJsonPath, 'utf-8');
  const allLpas = JSON.parse(lpaJsonData);

  let lpa = allLpas.find(l => slugify(normalizeBodyName(l.name)) === paramData.lpaName);
  if (lpa == null) {    
    lpa = allLpas.find(l => l.id === paramData.lpaName);
  }

  if (lpa) {
    // Add site count
    lpa.siteCount = lpa.sites?.length || 0;
    
    // Convert sizes
    if (lpa.adjacents) {
      lpa.adjacents.forEach(adj => adj.size = adj.size / 10000);
    }
    lpa.size = lpa.size / 10000;
  }

  return NextResponse.json({lpa: lpa});
}
