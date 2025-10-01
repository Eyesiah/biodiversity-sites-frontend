import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { slugify, normalizeBodyName } from '@/lib/format';
import { fetchAllSites } from '@/lib/api';
import { processSiteForListView } from '@/lib/sites';
import ResponsibleBodiesContent from './ResponsibleBodiesContent';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Designated Responsible Bodies',
};

async function getResponsibleBodiesData() {
    try {
        const csvPath = path.join(process.cwd(), 'data', 'responsible-bodies.csv');
        const csvData = fs.readFileSync(csvPath, 'utf-8');
    
        const parsedData = Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
        });
    
        const bodyItems = parsedData.data.map(item => ({
          name: item['Name'] || '',
          designationDate: item['Designation Date'] || '',
          expertise: item['Area of Expertise'] || '',
          organisationType: item['Type of Organisation'] || '',
          address: item['Address'] || '',
          emails: item['Email'] ? item['Email'].split('; ') : [],
          telephone: item['Telephone'] || '',
          sites: []
        }));
        
        // allocate sites to bodies
        const allSites = await fetchAllSites(true);
        allSites.forEach(site => {
          if (site.responsibleBodies) {
            site.responsibleBodies.forEach(body => {          
              const bodyName = slugify(normalizeBodyName(body))
              let bodyItem = bodyItems.find(body => slugify(normalizeBodyName(body.name)) == bodyName)
              if (bodyItem)
              {
                bodyItem.sites.push(processSiteForListView(site))
              }
            });
          }
        });
    
        return {
          responsibleBodies: bodyItems,
          lastUpdated: new Date().toISOString(),
        };
      } catch (e) {
        console.error(e);
        return {
            responsibleBodies: [],
            error: e.message || "An unexpected error occurred."
        }
      }
}

export default async function ResponsibleBodiesPage() {
  const { responsibleBodies, error, lastUpdated } = await getResponsibleBodiesData();

  return (
    <>
      <div className="container">
        <ResponsibleBodiesContent responsibleBodies={responsibleBodies} error={error} />
      </div>
      <Footer lastUpdated={lastUpdated} />
    </>
  );
}
