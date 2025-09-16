// pages/api/WFS/DescribeFeatureType.js

export default function handler(req, res) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"
            xmlns:gml="http://www.opengis.net/gml/3.2"
            xmlns:bgs="http://bristoltreeforum.org/bgs/sites"
            targetNamespace="http://bristoltreeforum.org/bgs/sites"
            elementFormDefault="qualified">

  <xsd:import namespace="http://www.opengis.net/gml/3.2" schemaLocation="http://schemas.opengis.net/gml/3.2.1/gml.xsd"/>

  <xsd:complexType name="SiteType">
    <xsd:complexContent>
      <xsd:extension base="gml:AbstractFeatureType">
        <xsd:sequence>
          <xsd:element name="geometry" type="gml:PointPropertyType" minOccurs="0"/>
          <xsd:element name="reference-number" type="xsd:string"/>
          <xsd:element name="responsible-body" type="xsd:string" minOccurs="0" maxOccurs="unbounded"/>
          <xsd:element name="latitude" type="xsd:decimal"/>
          <xsd:element name="longitude" type="xsd:decimal"/>
          <xsd:element name="easting" type="xsd:decimal"/>
          <xsd:element name="northing" type="xsd:decimal"/>
          <xsd:element name="LPA" type="xsd:string"/>
          <xsd:element name="NCA" type="xsd:string"/>
          <xsd:element name="area-ha" type="xsd:decimal"/>
          <xsd:element name="baseline-area-ha" type="xsd:decimal"/>
          <xsd:element name="baseline-hedgerow-km" type="xsd:decimal"/>
          <xsd:element name="baseline-watercourse-km" type="xsd:decimal"/>
          <xsd:element name="baseline-area-HU" type="xsd:decimal"/>
          <xsd:element name="baseline-hedgerow-HU" type="xsd:decimal"/>
          <xsd:element name="baseline-watercourse-HU" type="xsd:decimal"/>
          <xsd:element name="improvement-area-ha" type="xsd:decimal"/>
          <xsd:element name="improvement-hedgerow-km" type="xsd:decimal"/>
          <xsd:element name="improvement-watercourse-km" type="xsd:decimal"/>
          <xsd:element name="number-allocations" type="xsd:integer"/>
          <xsd:element name="allocation-area-ha" type="xsd:decimal"/>
          <xsd:element name="allocation-hedgerow-km" type="xsd:decimal"/>
          <xsd:element name="allocation-watercourse-km" type="xsd:decimal"/>
        </xsd:sequence>
      </xsd:extension>
    </xsd:complexContent>
  </xsd:complexType>

  <xsd:element name="Site" type="bgs:SiteType" substitutionGroup="gml:AbstractFeature"/>

</xsd:schema>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}