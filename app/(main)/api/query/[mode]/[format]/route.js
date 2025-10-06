import { fetchAllSites } from "@/lib/api";
import OsGridRef from 'geodesy/osgridref.js';
import { create } from 'xmlbuilder2';
import { formatNumber } from '@/lib/format'
import { NextResponse } from 'next/server';
import Papa from 'papaparse';

export const revalidate = 3600; // Re-generate page at most once per hour

export function generateStaticParams() {
  return [
    { mode: 'sites', format: 'xml' },
    { mode: 'sites', format: 'json' },
    { mode: 'sites', format: 'csv' },
  ]
}

export async function GET(_, { params }) {
  
  const paramData = await params;
  const mode = paramData.mode;
  const format = paramData.format;

  let data = null;
  let rootElementName = ''
  let dataElementName = ''

  if (mode === 'sites') {

    const allSites = await fetchAllSites(true);

    // first get the easting/northings
    allSites.forEach(s => {
      var gridref = OsGridRef.parse(s.gridReference);
      s.easting = gridref.easting;
      s.northing = gridref.northing;
    });

    // create the data array to return
    data = allSites.map(s => ({
      'reference-number': s.referenceNumber,
      'responsible-body': s.responsibleBodies.join(', '),
      'latitude': formatNumber(s.latitude, 6),
      'longitude': formatNumber(s.longitude, 6),
      'easting': s.easting,
      'northing': s.northing,
      'LPA': s.lpaName,
      'NCA': s.ncaName,
      'area-ha': s.siteSize,
      'baseline-area-ha': formatNumber(s.habitats?.areas?.reduce((acc, hab) => acc + hab.size, 0) || 0, 4),
      'baseline-hedgerow-km': formatNumber(s.habitats?.hedgerows?.reduce((acc, hab) => acc + hab.size, 0) || 0, 4),
      'baseline-watercourse-km': formatNumber(s.habitats?.watercourses?.reduce((acc, hab) => acc + hab.size, 0) || 0, 4),
      'baseline-area-HU': formatNumber(s.habitats?.areas?.reduce((acc, hab) => acc + hab.HUs, 0) || 0, 4),
      'baseline-hedgerow-HU': formatNumber(s.habitats?.hedgerows?.reduce((acc, hab) => acc + hab.HUs, 0) || 0, 4),
      'baseline-watercourse-HU': formatNumber(s.habitats?.watercourses?.reduce((acc, hab) => acc + hab.HUs, 0) || 0, 4),
      'improvement-area-ha': formatNumber(s.improvements?.areas?.reduce((acc, hab) => acc + hab.size, 0) || 0, 4),
      'improvement-hedgerow-km': formatNumber(s.improvements?.hedgerows?.reduce((acc, hab) => acc + hab.size, 0) || 0, 4),
      'improvement-watercourse-km': formatNumber(s.improvements?.watercourses?.reduce((acc, hab) => acc + hab.size, 0) || 0, 4),
      'number-allocations': s.allocations?.length || 0,
      'allocation-area-ha': formatNumber(s.allocations?.reduce((acc, alloc) => acc + alloc.habitats?.areas?.reduce((acc, hab) => acc + hab.size, 0), 0) || 0, 4),
      'allocation-hedgerow-km': formatNumber(s.allocations?.reduce((acc, alloc) => acc + alloc.habitats?.hedgerows?.reduce((acc, hab) => acc + hab.size, 0), 0) || 0, 4),
      'allocation-watercourse-km': formatNumber(s.allocations?.reduce((acc, alloc) => acc + alloc.habitats?.watercourses?.reduce((acc, hab) => acc + hab.size, 0), 0) || 0, 4),
    }));

    rootElementName = 'sites';
    dataElementName = 'site';

  } else {
    return new NextResponse(`Unknown mode '${mode}'`, { status: 400 });
  }

  if (data == null) {
    return new NextResponse(`Data wasn't created`, { status: 500 });
  }

  if (format == null || format === 'xml') {

    const root = create({ version: '1.0' }).ele(rootElementName)

    for (const item of data) {
      const site = root.ele(dataElementName);

      for (const key in item) {
        if (Array.isArray(item[key])) {
          for (const value of item[key]) {
            site.ele(key).txt(value);
          }
        } else {
          site.ele(key).txt(item[key]);
        }
      }
    }
    
    const xml = root.end({ prettyPrint: true });

    return new NextResponse(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } else if (format === 'json') {
    return NextResponse.json(data);
  } else if (format === 'csv') {   
    const csv = Papa.unparse(data);
    
    return new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });

  } else {    
    return new NextResponse(`Unknown format: ${format}`, { status: 400 });
  }
}

