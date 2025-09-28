import { XMLBuilder } from 'fast-xml-parser';

export function triggerDownload(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
