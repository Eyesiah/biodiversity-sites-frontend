import 'styles/globals.css';
import Script from 'next/script';
import { Provider } from "@/components/ui/provider"
import { Box } from '@chakra-ui/react';

export const metadata = {
  title: 'BGS Register',
  description: 'Biodiversity Gain Sites Register',
  icons: {
    apple: '/BTF Logodefault.png',
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
          <Box as="main" width="100%">
            {children}
          </Box>
        </Provider>
      </body>
    </html>
  );
}
