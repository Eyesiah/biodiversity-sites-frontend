import fs from 'fs';
import path from 'path';
import { slugify, normalizeBodyName } from '@/lib/format';
import { NextResponse } from 'next/server';

export const dynamicParams = false;

export async function generateStaticParams() {
  const jsonPath = path.join(process.cwd(), 'data', 'NCAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allNcas = JSON.parse(jsonData);

  const namePaths = allNcas.map(nca => ({
    ncaName: slugify(nca.name),
  }));

  const idPaths = allNcas.map(nca => ({
    ncaName: String(nca.id),
  }));

  return [...namePaths, ...idPaths];
}

export async function GET(request, { params }) {
  const paramData = await params;
  const jsonPath = path.join(process.cwd(), 'data', 'NCAs.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const allNcas = JSON.parse(jsonData);

  // Try to find by name (slugified)
  let nca = allNcas.find(n => slugify(normalizeBodyName(n.name)) === paramData.ncaName);
  
  // If not found, try by id
  if (nca == null) {
    nca = allNcas.find(n => String(n.id) === paramData.ncaName);
  }

  if (nca) {
    // Add site count
    nca.siteCount = nca.sites?.length || 0;
    
    // Convert size from square meters to hectares
    nca.size = nca.size / 10000;
    // Convert adjacent sizes
    if (nca.adjacents) {
      nca.adjacents.forEach(adj => adj.size = adj.size / 10000);
    }
  }

  return NextResponse.json({ nca: nca });
}
