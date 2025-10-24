import Navigation from '@/components/Navigation';
import 'styles/globals.css';
import Script from 'next/script';
import { Provider } from "@/components/ui/provider"

export const metadata = {
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
      ? '4b0b86b1-e0ca-46d3-9439-936cdad532a5'
      : 'b718ac79-8ca2-494a-a398-47adf5e8188a';

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Provider>
          <Script
            strategy="afterInteractive"
            src="/api/umami/script"
            data-website-id={umamiWebsiteId}
          />
          <div className="topContainer">
            <div className="navRow">
              <Navigation />
            </div>
            <div className="mainRow">
              <main className="main">{children}</main>
            </div>
          </div>
        </Provider>
      </body>
    </html>
  );
}