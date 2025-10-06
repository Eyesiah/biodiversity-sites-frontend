import { XMLBuilder } from 'fast-xml-parser';

export function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.visibility = 'hidden';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export function exportToXml(data, rootElementName, itemElementName, filename) {
    const builder = new XMLBuilder({ format: true, ignoreAttributes: false, attributeNamePrefix: "@_" });
    const dataToBuild = { [rootElementName]: { [itemElementName]: data } };
    const xmlDataStr = builder.build(dataToBuild);
    const blob = new Blob([xmlDataStr], { type: 'application/xml' });
    triggerDownload(blob, filename);
}

export function exportToJson(data, rootElementName, filename) {
    const dataToExport = { [rootElementName]: data };
    const jsonDataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonDataStr], { type: 'application/json' });
    triggerDownload(blob, filename);
}
