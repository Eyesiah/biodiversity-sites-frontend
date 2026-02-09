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

/**
 * Convert a string to Title Case, preserving known acronyms
 * Example: "harry ferguson" -> "Harry Ferguson"
 * Example: "rsk biocensus" -> "RSK Biocensus"
 */
export function toTitleCase(str) {
  if (!str) return '';
  
  // List of known acronyms that should remain in uppercase
  const acronyms = ['RSK', 'LPA', 'NCA', 'UK', 'LSOA', 'LLP', 'LNRS'];
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      const upperWord = word.toUpperCase();
      // Check if the word is a known acronym
      if (acronyms.includes(upperWord)) {
        return upperWord;
      }
      // Otherwise, apply title case
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
