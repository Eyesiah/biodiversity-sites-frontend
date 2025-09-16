// pages/api/WFS/GetCapabilities.js

export default function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const baseWfsUrl = `${protocol}://${host}/api/WFS`;
  const sitesUrl = `${baseWfsUrl}/sites`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <WFS_Capabilities version="2.0.0"
                  xmlns="http://www.opengis.net/wfs/2.0"
                  xmlns:ows="http://www.opengis.net/ows/1.1"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xsi:schemaLocation="http://www.opengis.net/wfs/2.0 http://schemas.opengis.net/wfs/2.0/wfs.xsd">
                  
                  <ows:ServiceIdentification>
                    <ows:Title>BGS Sites WFS</ows:Title>
                    <ows:Abstract>A WFS service for BGS sites.</ows:Abstract>
                    <ows:ServiceType>WFS</ows:ServiceType>
                    <ows:ServiceTypeVersion>2.0.0</ows:ServiceTypeVersion>
                    <ows:Fees>NONE</ows:Fees>
                    <ows:AccessConstraints>NONE</ows:AccessConstraints>
                  </ows:ServiceIdentification>

                  <ows:ServiceProvider>
                    <ows:ProviderName>Bristol Tree Forum</ows:ProviderName>
                    <ows:ProviderSite xlink:href="https://bristoltreeforum.org/"/>
                  </ows:ServiceProvider>

                  <ows:OperationsMetadata>
                    <ows:Operation name="GetCapabilities">
                      <ows:DCP><ows:HTTP><ows:Get xlink:href="${baseWfsUrl}/GetCapabilities"/></ows:HTTP></ows:DCP>
                    </ows:Operation>
                    <ows:Operation name="DescribeFeatureType">
                      <ows:DCP><ows:HTTP><ows:Get xlink:href="${sitesUrl}/DescribeFeatureType"/></ows:HTTP></ows:DCP>
                    </ows:Operation>
                    <ows:Operation name="GetFeature">
                      <ows:DCP><ows:HTTP><ows:Get xlink:href="${sitesUrl}/GetFeature"/></ows:HTTP></ows:DCP>
                      <ows:Parameter name="outputFormat">
                        <ows:AllowedValues>
                          <ows:Value>application/gml+xml; version=3.2</ows:Value>
                          <ows:Value>application/json</ows:Value>
                        </ows:AllowedValues>
                      </ows:Parameter>
                    </ows:Operation>
                  </ows:OperationsMetadata>

                  <FeatureTypeList>
                    <FeatureType>
                      <Name>bgs:Site</Name>
                      <Title>BGS Site</Title>
                      <Abstract>A single BGS site.</Abstract>
                      <ows:WGS84BoundingBox>
                        <ows:LowerCorner>-180.0 -90.0</ows:LowerCorner>
                        <ows:UpperCorner>180.0 90.0</ows:UpperCorner>
                      </ows:WGS84BoundingBox>
                    </FeatureType>
                  </FeatureTypeList>

                </WFS_Capabilities>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}
