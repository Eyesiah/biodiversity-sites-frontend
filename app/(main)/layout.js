import Navigation from '@/components/Navigation';
import 'styles/globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'BGS Register',
  description: 'Biodiversity Gain Sites Register',
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
    <html lang="en">
      <body>
        <Script
          strategy="afterInteractive"
          src="/api/umami/script"
          data-website-id={umamiWebsiteId}
        />
        <Navigation />
        <main className="main">{children}</main>
        
      </body>
    </html>
  );
}