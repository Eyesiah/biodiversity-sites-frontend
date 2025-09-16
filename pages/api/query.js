import { fetchAllSites } from "@/lib/api";
import LatLon from 'mt-latlon';
import OsGridRef from 'mt-osgridref';
import { create } from 'xmlbuilder2';

export default async function handler(req, res) {
  const { mode, format } = req.query;

  let data = null;
  let rootElementName = ''
  let dataElementName = ''

  if (mode === 'sites') {
    const allSites = await fetchAllSites(true);

    // first get the easting/northings
    allSites.forEach(s => {
      var latlon = new LatLon(s.latitude, s.longitude);
      var point = OsGridRef.latLongToOsGrid(latlon);
      s.easting = point.easting;
      s.northing = point.northing;
    });

    // create the data array to return
    data = allSites.map(s => ({
      'reference-number': s.referenceNumber,
      'responsible-body': s.responsibleBodies, // Keep as array
      'LPA': s.lpaName,
      'NCA': s.ncaName,
      'area-ha': s.siteSize,
      'baseline-area-ha': s.habitats?.areas?.reduce((acc, hab) => acc + hab.size, 0) || 0,
      'baseline-hedgerow-km': s.habitats?.hedgerows?.reduce((acc, hab) => acc + hab.size, 0) || 0,
      'baseline-watercourse-km': s.habitats?.watercourses?.reduce((acc, hab) => acc + hab.size, 0) || 0,
      'baseline-area-HU': s.habitats?.areas?.reduce((acc, hab) => acc + hab.HUs, 0) || 0,
      'baseline-hedgerow-HU': s.habitats?.hedgerows?.reduce((acc, hab) => acc + hab.HUs, 0) || 0,
      'baseline-watercourse-HU': s.habitats?.watercourses?.reduce((acc, hab) => acc + hab.HUs, 0) || 0,
      'improvement-area-ha': s.improvements?.areas?.reduce((acc, hab) => acc + hab.size, 0) || 0,
      'improvement-hedgerow-km': s.improvements?.hedgerows?.reduce((acc, hab) => acc + hab.size, 0) || 0,
      'improvement-watercourse-km': s.improvements?.watercourses?.reduce((acc, hab) => acc + hab.size, 0) || 0,
      'number-allocations': s.allocations?.length || 0,
      'allocation-area-ha': s.allocations?.reduce((acc, alloc) => acc + alloc.habitats?.areas?.reduce((acc, hab) => acc + hab.size, 0), 0) || 0,
      'allocation-hedgerow-km': s.allocations?.reduce((acc, alloc) => acc + alloc.habitats?.hedgerows?.reduce((acc, hab) => acc + hab.size, 0), 0) || 0,
      'allocation-watercourse-km': s.allocations?.reduce((acc, alloc) => acc + alloc.habitats?.watercourses?.reduce((acc, hab) => acc + hab.size, 0), 0) || 0,
    }));
    
    rootElementName = 'sites';
    dataElementName = 'site';

  } else {
    throw new Error(`Unknown mode ${mode}`);
  }

  if (data == null) {
    throw new Error(`Data wasn't created`);
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

