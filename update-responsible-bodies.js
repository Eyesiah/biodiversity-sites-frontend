const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const GOVUK_URL = 'https://www.gov.uk/government/publications/conservation-covenant-agreements-designated-responsible-bodies/conservation-covenants-list-of-designated-responsible-bodies';
const CSV_PATH = path.join(__dirname, '..', 'data', 'responsible-bodies.csv');

async function fetchAndParseData() {
  try {
    console.log(`Fetching data from ${GOVUK_URL}...`);
    const response = await fetch(GOVUK_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('Parsing HTML content...');
    const bodies = [];
    // Find each h2 that contains 'designated-responsible-bodies' in its id, then find the next list.
    $('h2[id*="designated-responsible-bodies"]').next('div.govspeak').find('ul > li').each((i, el) => {
      const name = $(el).text().trim();
      if (name) {
        bodies.push({ name });
      }
    });

    if (bodies.length === 0) {
      console.error('Error: No responsible bodies found. The page structure may have changed.');
      return;
    }

    console.log(`Found ${bodies.length} responsible bodies.`);
    return bodies;

  } catch (error) {
    console.error('An error occurred during fetch or parse:', error);
    return null;
  }
}

function writeToCsv(data) {
  // Note: This creates a simple CSV with only the name.
  // The other fields (date, expertise, etc.) are not on the main list page.
  const header = 'Name,Designation Date,Area of Expertise,Type of Organisation,Address,Email,Telephone\n';
  
  // Create CSV rows, quoting names that contain commas.
  const rows = data.map(body => {
    const name = body.name.includes(',') ? `"${body.name}"` : body.name;
    // Add empty placeholders for other columns
    return `${name},,,,,,\n`;
  });

  fs.writeFileSync(CSV_PATH, header + rows.join(''), 'utf-8');
  console.log(`Successfully updated ${CSV_PATH}`);
}

async function main() {
  const responsibleBodies = await fetchAndParseData();
  if (responsibleBodies) {
    writeToCsv(responsibleBodies);
  }
}

main();