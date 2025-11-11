import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { slugify, normalizeBodyName } from '@/lib/format';
import { fetchAllSites } from '@/lib/api';
import { NextResponse } from 'next/server';

import {ISR_REVALIDATE_TIME} from '@/config'
export const revalidate = ISR_REVALIDATE_TIME;

export async function generateStaticParams() {
  const csvPath = path.join(process.cwd(), 'data', 'responsible-bodies.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });

  const paths = parsedData.data.map(item => ({
    bodyName: slugify(normalizeBodyName(item['Name'] || '')),
  }));

  return paths;
}

export async function GET(request, { params }) {
  const paramData = await params;

  // Fetch and parse responsible bodies data
  const csvPath = path.join(process.cwd(), 'data', 'responsible-bodies.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true });

  const bodyData = parsedData.data.find(item => slugify(normalizeBodyName(item['Name'] || '')) === paramData.bodyName);

  // Fetch all sites to calculate count for this specific responsible body
  const allSitesForCount = await fetchAllSites();
  let siteCount = 0;
  if (bodyData) {
    const normalizedBodyName = normalizeBodyName(bodyData['Name']);
    for (const site of allSitesForCount) {
      if (site.responsibleBodies?.some(b => normalizeBodyName(b) === normalizedBodyName)) {
        siteCount++;
      }
    }
  }

  const body = {
    name: bodyData['Name'] || '',
    designationDate: bodyData['Designation Date'] || '',
    expertise: bodyData['Area of Expertise'] || '',
    organisationType: bodyData['Type of Organisation'] || '',
    address: bodyData['Address'] || '',
    emails: bodyData['Email'] ? bodyData['Email'].split('; ') : [],
    telephone: bodyData['Telephone'] || '',
    siteCount: siteCount,
  };

  return NextResponse.json({body: body});
}
