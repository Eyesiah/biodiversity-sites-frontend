import Navigation from '@/components/core/Navigation';
import 'styles/globals.css';
import Script from 'next/script';
import { Provider } from "@/components/styles/provider"
import { Box } from '@chakra-ui/react';

export const metadata = {
  metadataBase: new URL('https://bgs.bristoltrees.space'),
  title: 'Biodiversity Gain Sites Register',
  description: "This site presents data from the UK government's Biodiversity Gain Sites Register in a format that allows for interesting spatial and statistical analyses. The Register is part of the Biodiversity Net Gain regulations.",
  keywords: ['biodiversity', 'gain', 'sites', 'register', 'england', 'habitat', 'conservation', 'environment'],
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
  verification: {
    google: '4bMY4a8_XmDsa8mtFCRGk2eh_AGJQ4n57kqTXwW1wac',
  },
  icons: {
    apple: '/ToBlogo192.png',
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>
          <Script
            strategy="afterInteractive"
            src="/api/umami/script"
            data-website-id={umamiWebsiteId}
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
        </Provider>
      </body>
    </html>
  );
}
