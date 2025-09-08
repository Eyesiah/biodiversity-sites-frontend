import Navigation from '../components/Navigation';
import '../styles/globals.css';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const umamiWebsiteId =
    process.env.NODE_ENV === 'production'
      ? '4b0b86b1-e0ca-46d3-9439-936cdad532a5'
      : 'b718ac79-8ca2-494a-a398-47adf5e8188a';

  const router = useRouter();

  return (
    <>
      <Head>
        <title>BGS Register</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Biodiversity Gain Sites Register" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Script
        strategy="afterInteractive"
        src="/api/umami/script"
        data-website-id={umamiWebsiteId}
      />
      {router.pathname !== '/allocated-habitats' && <Navigation />}
      <Component {...pageProps} />
      <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: '#aaa' }}>
        {pageProps.lastUpdated && (
          <p>
            Page last updated: {new Date(pageProps.lastUpdated).toLocaleString('en-GB')}
          </p>
        )}
        <p>
          Version: {process.env.APP_VERSION}-{process.env.GIT_COMMIT_HASH}
        </p>
      </footer>
    </>
  );
}

export default MyApp;
