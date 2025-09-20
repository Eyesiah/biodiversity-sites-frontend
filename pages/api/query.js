import { fetchAllSites } from "@/lib/api";
import OsGridRef from 'geodesy/osgridref.js';
import { create } from 'xmlbuilder2';
import { formatNumber } from '@/lib/format'
import NodeCache from 'node-cache';

// Cache for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

export default async function handler(req, res) {
  const { mode, format } = req.query;

  let data = null;
  let rootElementName = ''
  let dataElementName = ''

  if (mode === 'sites') {
    const cacheKey = 'sites-data';
    let cachedData = cache.get(cacheKey);

    if (cachedData) {
      data = cachedData;
    } else {
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
        'latitude': s.latitude,
        'longitude': s.longitude,
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

      cache.set(cacheKey, data);
    }
    
    rootElementName = 'sites';
    dataElementName = 'site';

  } else {
    res.status(400).send(`Unknown mode '${mode}'`);
    return;
  }

  if (data == null) {
    res.status(500).send(`Data wasn't created`);
    return;
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

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(data, null, 2));
  }
}

