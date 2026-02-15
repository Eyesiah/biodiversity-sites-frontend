import fs from 'fs';
import path from 'path';
import { slugify, normalizeBodyName } from '@/lib/format';
import { NextResponse } from 'next/server';

export const dynamicParams = false;

export async function generateStaticParams() {
  const jsonPath = path.join(process.cwd(), 'data', 'LNRSs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allLnrs = JSON.parse(jsonData);

  const namePaths = allLnrs.map(lnrs => ({
    lnrsName: slugify(lnrs.name),
  }));

  const idPaths = allLnrs.map(lnrs => ({
    lnrsName: String(lnrs.id),
  }));

  return [...namePaths, ...idPaths];
}

export async function GET(request, { params }) {
  const paramData = await params;
  const jsonPath = path.join(process.cwd(), 'data', 'LNRSs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allLnrs = JSON.parse(jsonData);

  // Try to find by name (slugified)
  let lnrs = allLnrs.find(l => slugify(l.name) === paramData.lnrsName);
  
  // If not found, try by id
  if (lnrs == null) {
    lnrs = allLnrs.find(l => String(l.id) === paramData.lnrsName);
  }

  if (lnrs) {
    // Add site count
    lnrs.siteCount = lnrs.sites?.length || 0;
    
    // Convert size from square meters to hectares
    lnrs.size = lnrs.size / 10000;
    // Convert adjacent sizes
    if (lnrs.adjacents) {
      lnrs.adjacents.forEach(adj => adj.size = adj.size / 10000);
    }
  }

  return NextResponse.json({ lnrs: lnrs });
}
