import '../styles/globals.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
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
      <Component {...pageProps} />
      <footer style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: '#888' }}>
        <p>
          Version: {process.env.APP_VERSION}-{process.env.GIT_COMMIT_HASH}
        </p>
      </footer>
    </>
  );
}

export default MyApp;
