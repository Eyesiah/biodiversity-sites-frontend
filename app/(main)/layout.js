import Navigation from '@/components/core/Navigation';
import 'styles/globals.css';
import Script from 'next/script';
import { Provider } from "@/components/styles/provider"
import { Box } from '@chakra-ui/react';
import { loadGlossary } from "@/lib/glossary"
import { Toaster } from "@/components/ui/toaster"

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bristol Tree Forum',
  url: 'https://bristoltreeforum.org/',
  logo: 'https://bgs.bristoltrees.space/ToBlogo512.png',
  sameAs: [
    'https://x.com/BristolTreeFora',
    'https://github.com/Eyesiah/biodiversity-sites-frontend'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'BGS_Suggestions@bristoltreeforum.org',
    contactType: 'customer service'
  }
};

const datasetSchema = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Biodiversity Gain Sites Register',
  description: "A dataset of biodiversity gain sites in England, part of the UK government's Biodiversity Net Gain regulations. This site presents data from the official BGS Register in a format that allows for spatial and statistical analyses.",
  url: 'https://bgs.bristoltrees.space/',
  keywords: ['biodiversity', 'gain', 'sites', 'register', 'England', 'habitat', 'conservation', 'environment', 'BNG', 'Net Gain'],
  license: 'https://github.com/Eyesiah/biodiversity-sites-frontend/blob/master/LICENSE',
  creator: {
    '@type': 'Organization',
    name: 'Bristol Tree Forum',
    url: 'https://bristoltreeforum.org/'
  },
  sourceOrganization: {
    '@type': 'Organization',
    name: 'Natural England',
    url: 'https://www.gov.uk/government/organisations/natural-england'
  },
  datePublished: '2025',
  temporalCoverage: '2025/Present'
};

export const metadata = {
  metadataBase: new URL('https://bgs.bristoltrees.space'),
  title: 'Biodiversity Gain Sites Register',
  description: "This site presents data from the UK government's Biodiversity Gain Sites Register in a format that allows for interesting spatial and statistical analyses. The Register is part of the Biodiversity Net Gain regulations.",
  keywords: ['biodiversity gain sites', 'BGS Register', 'Biodiversity Net Gain', 'BNG', 'habitat units', 'Defra', 'Natural England', 'England', 'environmental register', 'conservation', 'habitat', 'responsible bodies', 'Local Nature Recovery Strategy', 'LNRS', 'Local Planning Authority', 'LPA', 'National Character Areas', 'NCA'],
  alternates: {
    canonical: 'https://bgs.bristoltrees.space',
  },
  openGraph: {
    title: 'Biodiversity Gain Sites Register',
    description: "This site presents data from the UK government's Biodiversity Gain Sites Register in a format that allows for interesting spatial and statistical analyses. The Register is part of the Biodiversity Net Gain regulations.",
    url: 'https://bgs.bristoltrees.space/',
    siteName: 'Biodiversity Gain Sites Register',
    images: [
      {
        url: '/ToBlogo512.png',
        width: 512,
        height: 512,
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Biodiversity Gain Sites Register',
    description: "This site presents data from the UK government's Biodiversity Gain Sites Register in a format that allows for interesting spatial and statistical analyses.",
    site: '@bristoltreeforum',
    images: ['/ToBlogo512.png'],
  },
  verification: {
    google: '4bMY4a8_XmDsa8mtFCRGk2eh_AGJQ4n57kqTXwW1wac',
  },
  icons: {
    apple: '/ToBlogo192.png',
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
  other: {
    'schema:organization': JSON.stringify(organizationSchema),
    'schema:dataset': JSON.stringify(datasetSchema),
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const umamiWebsiteId =
    process.env.NODE_ENV === 'production'
      ? '77b8317a-bdc9-4897-9a57-acbeac2793a1'
      : '012534dc-c940-4587-bf4b-b1e7fc8b9d42';

  // Load glossary server-side
  const glossaryData = loadGlossary();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>
          <Script
            strategy="afterInteractive"
            src="/api/umami/script"
            data-website-id={umamiWebsiteId}
          />
          <Script
            id="glossary-data"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.glossaryData = ${JSON.stringify(glossaryData)};`
            }}
          />
          <Box minHeight="100vh" display="flex" flexDirection="column">
            <Box position="sticky" top="0" zIndex="1000">
              <Navigation />
            </Box>
            <Box flex="1">
              <Box as="main" width="100%">
                {children}
              </Box>
            </Box>
          </Box>
          <Toaster />
        </Provider>
      </body>
    </html>
  );
}
