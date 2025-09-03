import Navigation from '../components/Navigation';
import '../styles/globals.css';
import Head from 'next/head';
import Script from 'next/script';

function MyApp({ Component, pageProps }) {
  const umamiWebsiteId =
    process.env.NODE_ENV === 'production'
      ? '4b0b86b1-e0ca-46d3-9439-936cdad532a5'
      : 'b718ac79-8ca2-494a-a398-47adf5e8188a';

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
        src="http://umami-env-2.eba-kzd2jeqh.eu-central-1.elasticbeanstalk.com/script.js"
        data-website-id={umamiWebsiteId}
      />
      <Navigation />
      <Component {...pageProps} />
      <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: '#aaa' }}>
        <p>
          Version: {process.env.APP_VERSION}-{process.env.GIT_COMMIT_HASH}
        </p>
      </footer>
    </>
  );
}

export default MyApp;
