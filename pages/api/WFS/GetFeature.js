

import { fetchAllSites } from "@/lib/api";
import LatLon from 'mt-latlon';
import OsGridRef from 'mt-osgridref';
import { create } from 'xmlbuilder2';

export default async function handler(req, res) {
  const { mode, format } = req.query;

  let data = null;

  if (mode === 'sites') {
    const allSites = await fetchAllSites();

    // first get the easting/northings
    allSites.forEach(s => {
      var latlon = new LatLon(s.latitude, s.longitude);
      var point = OsGridRef.latLongToOsGrid(latlon);
      s.easting = point.easting;
      s.northing = point.northing;
    });

    // create the data array to return
    data = allSites.map(s => ({
      'gml:id': s.referenceNumber, // Use reference number for GML ID
      'geometry': {
        lat: s.latitude,
        lon: s.longitude
      },
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

  } else {
    throw new Error(`Unknown mode ${mode}`);
  }

  if (data == null) {
    throw new Error(`Data wasn't created`);
  }

  if (format == null || format === 'xml') {
    res.setHeader('Content-Type', 'application/xml');

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const absoluteSchemaUrl = `${protocol}://${host}/api/WFS/DescribeFeatureType`;

    const root = create({ version: '1.0' }).ele('gml:FeatureCollection', {
      'xmlns:gml': 'http://www.opengis.net/gml/3.2',
      'xmlns:bgs': 'http://bristoltreeforum.org/bgs/sites',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': `http://www.opengis.net/gml/3.2 http://schemas.opengis.net/gml/3.2.1/gml.xsd http://bristoltreeforum.org/bgs/sites ${absoluteSchemaUrl}`
    });

    for (const item of data) {
      const featureMember = root.ele('gml:featureMember');
      const site = featureMember.ele('bgs:Site', { 'gml:id': item['gml:id'] });

      for (const key in item) {
        if (key === 'gml:id') continue; // Already used as attribute

        if (key === 'geometry') {
          site.ele('bgs:geometry')
            .ele('gml:Point', { 'srsName': 'urn:ogc:def:crs:EPSG::4326' })
            .ele('gml:pos').txt(`${item.geometry.lat} ${item.geometry.lon}`);
        } else if (Array.isArray(item[key])) {
          for (const value of item[key]) {
            site.ele(`bgs:${key}`).txt(value);
          }
        } else {
          site.ele(`bgs:${key}`).txt(item[key]);
        }
      }
    }
    const xml = root.end({ prettyPrint: true });

    res.status(200).send(xml);
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(data, null, 2));
  }
}

