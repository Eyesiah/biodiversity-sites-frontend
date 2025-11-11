import AdminSiteNameForm from './AdminSiteNameForm';
import Footer from '@/components/core/Footer';
import { ContentLayout } from '@/components/styles/ContentLayout';
import { Tabs } from '@/components/styles/Tabs';
import { fetchAllSites } from '@/lib/api';
import clientPromise from '@/lib/mongodb.js';
import { MONGODB_DATABASE_NAME } from '@/config';

import {ISR_REVALIDATE_TIME} from '@/config'
export const revalidate = ISR_REVALIDATE_TIME;

export const metadata = {
  title: 'Admin Panel',
  description: 'Administrative functions for managing site data.'
};

async function getSiteNamesData() {
  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DATABASE_NAME);
    const collection = db.collection('siteName');

    // Get all site name records
    const nameRecords = await collection.find({}).toArray();

    // Create a map for quick lookup
    const nameMap = new Map();
    nameRecords.forEach(record => {
      nameMap.set(record._id, {
        name: record.name,
        nameNotFound: record.nameNotFound || false
      });
    });

    return nameMap;
  } catch (error) {
    console.error('Error fetching site names:', error);
    return new Map();
  }
}

export default async function AdminPage({}) {
  // Fetch all sites to get reference numbers
  const sites = await fetchAllSites();
  const nameMap = await getSiteNamesData();

  // Create reference number options with names
  const referenceOptions = sites.map(site => {
    const siteData = nameMap.get(site.referenceNumber);
    const hasName = siteData && siteData.name && siteData.name.length > 0;
    const isMarkedNotFound = siteData && siteData.nameNotFound;

    let displayText = site.referenceNumber;
    if (hasName) {
      displayText = `${site.referenceNumber} - ${siteData.name}`;
    }

    return {
      value: site.referenceNumber,
      label: displayText,
      map: site.landBoundary,
      hasName,
      isMarkedNotFound
    };
  }).sort((a, b) => a.value.localeCompare(b.value));

  const tabs = [
    {
      title: 'Manage Site Names',
      content: () => {
        return (
          <AdminSiteNameForm
            referenceOptions={referenceOptions}
          />
        );
      }
    },
  ];

  return (
    <ContentLayout footer={<Footer lastUpdated={Date.now()} />}>
      <Tabs.Root lazyMount defaultValue={0} width="100%">
        <Tabs.List>
          {tabs.map((tab, index) => (
            <Tabs.Trigger
              key={index}
              value={index}
            >
              {tab.title}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map((tab, index) => (
          <Tabs.Content key={index} value={index}>
            {tab.content()}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </ContentLayout>
  )
}
